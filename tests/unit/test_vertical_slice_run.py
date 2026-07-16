from dataclasses import replace
from datetime import UTC, datetime, timedelta

import pytest
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.matching import (
    CalibrationObservation,
    ConservativeMaterialMatcher,
    MatchDecision,
    MaterialCandidate,
)
from binnagent_domain.vertical_slice.models import (
    AttemptIndependence,
    ExamTrack,
    FeedbackDensity,
    LearnerProfileSnapshot,
    SelfReportedLevel,
    TaskType,
)
from binnagent_domain.vertical_slice.run import (
    AdvanceVerticalSliceRun,
    ApproveCalibrationFallback,
    CompleteVerticalSliceRun,
    CreateVerticalSliceRun,
    DifficultyRating,
    RecordDifficultyFeedback,
    ReserveNextTask,
    RunStage,
    VerticalSliceRun,
)

NOW = datetime(2026, 7, 16, 18, tzinfo=UTC)


def _profile(level: SelfReportedLevel = SelfReportedLevel.DEVELOPING) -> LearnerProfileSnapshot:
    return LearnerProfileSnapshot(
        learner_snapshot_id="learner_snapshot_run_0001",
        exam_track=ExamTrack.ENGLISH_1,
        target_score=70,
        weekly_minutes=420,
        self_reported_level=level,
        prior_exam_seen=False,
        session_minutes=45,
        feedback_density=FeedbackDensity.MINIMAL,
        timed=False,
        evidence_count=2,
        confidence_band="low",
        created_at=NOW,
    )


def _run() -> VerticalSliceRun:
    return VerticalSliceRun.create(
        CreateVerticalSliceRun(
            workflow_run_id="workflow_run_slice_0001",
            learner_profile=_profile(),
            initial_task_id="task_calibration_a_0001",
            initial_content_version_id="calibration_reading_a_v1",
            now=NOW,
        )
    ).run


def _decision(now: datetime) -> MatchDecision:
    return MatchDecision(
        decision_id="match_decision_0001",
        learner_snapshot_id="learner_snapshot_run_0001",
        candidate_version_ids=("matched_reading_01_v1", "matched_reading_02_v1"),
        selected_content_version_id="matched_reading_01_v1",
        policy_version="conservative_match_v1",
        conservative=True,
        reason_codes=("profile_evidence_still_low",),
        created_at=now,
    )


def _advance(
    run: VerticalSliceRun,
    *,
    completed_task_id: str,
    next_task_id: str | None,
    next_task_type: TaskType | None,
    next_content_version_id: str | None,
    minute: int,
    decision: MatchDecision | None = None,
) -> VerticalSliceRun:
    return run.advance(
        AdvanceVerticalSliceRun(
            expected_version=run.version,
            completed_task_id=completed_task_id,
            completed_task_version=4,
            highest_hint_level=0,
            next_task_id=next_task_id,
            next_task_type=next_task_type,
            next_content_version_id=next_content_version_id,
            match_decision=decision,
            now=NOW + timedelta(minutes=minute),
        )
    ).run


def test_full_run_requires_all_tasks_feedback_and_placeholder() -> None:
    run = _run()
    run = _advance(
        run,
        completed_task_id="task_calibration_a_0001",
        next_task_id="task_calibration_b_0001",
        next_task_type=TaskType.CALIBRATION_READING,
        next_content_version_id="calibration_reading_b_v1",
        minute=1,
    )
    run = _advance(
        run,
        completed_task_id="task_calibration_b_0001",
        next_task_id="task_matched_reading_0001",
        next_task_type=TaskType.MATCHED_READING,
        next_content_version_id="matched_reading_01_v1",
        minute=2,
        decision=_decision(NOW + timedelta(minutes=2)),
    )
    run = _advance(
        run,
        completed_task_id="task_matched_reading_0001",
        next_task_id="task_micro_expression_0001",
        next_task_type=TaskType.MICRO_EXPRESSION,
        next_content_version_id="micro_expression_01_v1",
        minute=3,
    )
    run = _advance(
        run,
        completed_task_id="task_micro_expression_0001",
        next_task_id=None,
        next_task_type=None,
        next_content_version_id=None,
        minute=4,
    )

    assert run.stage is RunStage.WRAP_UP
    assert run.completion_gaps() == (
        "difficulty_feedback_or_explicit_skip",
        "next_task_placeholder",
    )
    run = run.record_difficulty_feedback(
        RecordDifficultyFeedback(
            expected_version=run.version,
            rating=DifficultyRating.MATCHED,
            skipped=False,
            now=NOW + timedelta(minutes=5),
        )
    ).run
    run = run.reserve_next_task(
        ReserveNextTask(
            expected_version=run.version,
            placeholder_id="next_task_placeholder_0001",
            planned_task_type=TaskType.MATCHED_READING,
            reason_code="continue_matched_practice",
            now=NOW + timedelta(minutes=6),
        )
    ).run
    completed = run.complete(CompleteVerticalSliceRun(run.version, NOW + timedelta(minutes=7))).run

    assert completed.stage is RunStage.COMPLETED
    assert completed.completion_gaps() == ()
    assert len(completed.task_refs) == 4
    assert all(item.completed_at is not None for item in completed.task_refs)


def test_run_rejects_wrong_task_and_missing_match_decision() -> None:
    run = _run()
    with pytest.raises(DomainError) as wrong_task:
        _advance(
            run,
            completed_task_id="task_not_current_0001",
            next_task_id="task_calibration_b_0001",
            next_task_type=TaskType.CALIBRATION_READING,
            next_content_version_id="calibration_reading_b_v1",
            minute=1,
        )
    assert wrong_task.value.code is PublicErrorCode.SESSION_CONFLICT

    run = _advance(
        run,
        completed_task_id="task_calibration_a_0001",
        next_task_id="task_calibration_b_0001",
        next_task_type=TaskType.CALIBRATION_READING,
        next_content_version_id="calibration_reading_b_v1",
        minute=1,
    )
    with pytest.raises(DomainError) as missing_decision:
        _advance(
            run,
            completed_task_id="task_calibration_b_0001",
            next_task_id="task_matched_reading_0001",
            next_task_type=TaskType.MATCHED_READING,
            next_content_version_id="matched_reading_01_v1",
            minute=2,
        )
    assert missing_decision.value.reason == "matched_reading_requires_matching_decision"


def test_approved_calibration_fallback_is_explicit_and_auditable() -> None:
    run = _run()
    transition = run.approve_calibration_fallback(
        ApproveCalibrationFallback(
            expected_version=run.version,
            reason_code="technical_recovery",
            matched_task_id="task_matched_reading_0001",
            matched_content_version_id="matched_reading_01_v1",
            match_decision=_decision(NOW + timedelta(minutes=1)),
            now=NOW + timedelta(minutes=1),
        )
    )

    assert transition.run.calibration_fallback_approved is True
    assert transition.run.stage is RunStage.MATCHED_READING
    assert transition.run.current_task is not None
    assert transition.run.current_task.task_id == "task_matched_reading_0001"
    assert [event.event_type for event in transition.events] == [
        "calibration_fallback_approved",
        "material_match_decided",
        "run_task_assigned",
    ]


def _candidates() -> tuple[MaterialCandidate, ...]:
    base = MaterialCandidate(
        content_id="matched_reading_01",
        content_version_id="matched_reading_01_v1",
        exam_tracks=(ExamTrack.ENGLISH_1, ExamTrack.ENGLISH_2),
        topic_familiarity="high",
        word_count=351,
        vocabulary_load="moderate",
        syntax_load="moderate",
        evidence_distance="cross_paragraph",
        estimated_minutes=12,
    )
    return (
        base,
        replace(
            base,
            content_id="matched_reading_02",
            content_version_id="matched_reading_02_v1",
            topic_familiarity="medium",
            word_count=352,
        ),
    )


def test_matcher_prefers_familiar_material_when_evidence_is_uncertain() -> None:
    profile = replace(
        _profile(SelfReportedLevel.WEAK),
        evidence_count=0,
        confidence_band="low",
    )
    observations = (
        CalibrationObservation(
            task_id="task_calibration_a_0001",
            content_version_id="calibration_reading_a_v1",
            highest_hint_level=3,
            latest_independence=AttemptIndependence.HINTED_HIGH,
        ),
        CalibrationObservation(
            task_id="task_calibration_b_0001",
            content_version_id="calibration_reading_b_v1",
            highest_hint_level=2,
            latest_independence=AttemptIndependence.HINTED_LOW,
        ),
    )
    decision = ConservativeMaterialMatcher().select(
        decision_id="match_decision_0001",
        profile=profile,
        observations=observations,
        candidates=_candidates(),
        now=NOW,
    )

    assert decision.selected_content_version_id == "matched_reading_01_v1"
    assert decision.conservative is True
    assert "high_hint_dependency_observed" in decision.reason_codes


def test_matcher_allows_moderate_novelty_after_two_independent_calibrations() -> None:
    profile = replace(
        _profile(SelfReportedLevel.STEADY),
        evidence_count=4,
        confidence_band="medium",
    )
    observations = tuple(
        CalibrationObservation(
            task_id=f"task_calibration_{suffix}_0001",
            content_version_id=f"calibration_reading_{suffix}_v1",
            highest_hint_level=0,
            latest_independence=AttemptIndependence.INDEPENDENT,
        )
        for suffix in ("a", "b")
    )
    decision = ConservativeMaterialMatcher().select(
        decision_id="match_decision_0002",
        profile=profile,
        observations=observations,
        candidates=_candidates(),
        now=NOW,
    )

    assert decision.selected_content_version_id == "matched_reading_02_v1"
    assert decision.conservative is False
    assert "moderate_topic_novelty_allowed" in decision.reason_codes
