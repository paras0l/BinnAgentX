from datetime import UTC, datetime, timedelta
from hashlib import sha256

import pytest
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.aggregate import LearningTask
from binnagent_domain.vertical_slice.commands import (
    AddAnnotation,
    CompleteTask,
    CreateTask,
    EndTaskEarly,
    PauseTask,
    RecordIntervention,
    RecordRevision,
    ReplaceMaterial,
    ResumeTask,
    SaveAttempt,
)
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.models import (
    AnnotationKind,
    AttemptIndependence,
    DifficultyStatus,
    ExamTrack,
    FeedbackDensity,
    InterventionResult,
    InterventionType,
    LearnerProfileSnapshot,
    MaterialRef,
    RevisionResult,
    RightsStatus,
    SelfReportedLevel,
    TaskState,
    TaskType,
    TextSpan,
)
from hypothesis import given
from hypothesis import strategies as st

NOW = datetime(2026, 7, 16, 12, tzinfo=UTC)


def _task(task_type: TaskType = TaskType.MATCHED_READING) -> LearningTask:
    return LearningTask.create(
        CreateTask(
            task_id="task_domain_0001",
            workflow_run_id="workflow_run_domain_0001",
            task_type=task_type,
            learner_profile=LearnerProfileSnapshot(
                learner_snapshot_id="learner_snapshot_domain_0001",
                exam_track=ExamTrack.ENGLISH_1,
                target_score=70,
                weekly_minutes=420,
                self_reported_level=SelfReportedLevel.DEVELOPING,
                prior_exam_seen=False,
                session_minutes=45,
                feedback_density=FeedbackDensity.MINIMAL,
                timed=False,
                evidence_count=2,
                confidence_band="low",
                created_at=NOW,
            ),
            material=_material("matched_reading_01_v1"),
            assignment_id="assignment_domain_0001",
            now=NOW,
        )
    ).task


def _material(version: str) -> MaterialRef:
    return MaterialRef(
        content_id=version.removesuffix("_v1"),
        content_version_id=version,
        content_hash="a" * 64,
        rights_status=RightsStatus.ELIGIBLE_DEV,
        difficulty_status=DifficultyStatus.UNCALIBRATED,
    )


def _annotation(task: LearningTask) -> LearningTask:
    quote = "Useful effort can reveal"
    return task.add_annotation(
        AddAnnotation(
            expected_version=task.version,
            annotation_id="annotation_domain_0001",
            kind=AnnotationKind.EVIDENCE,
            span=TextSpan(
                paragraph_id="paragraph_domain_0001",
                start=0,
                end=len(quote),
                text_quote=quote,
                text_hash=sha256(quote.encode()).hexdigest(),
            ),
            user_explanation="This supports the writer's claim.",
            now=NOW + timedelta(minutes=1),
        )
    ).task


def _attempt(
    task: LearningTask,
    identifier: str,
    independence: AttemptIndependence,
    minute: int,
) -> LearningTask:
    return task.save_attempt(
        SaveAttempt(
            expected_version=task.version,
            attempt_version_id=identifier,
            text=f"Learner-authored output at version {len(task.attempts) + 1}.",
            independence=independence,
            now=NOW + timedelta(minutes=minute),
        )
    ).task


def test_independent_matched_reading_requires_annotation_and_attempt() -> None:
    task = _task()
    with pytest.raises(DomainError) as missing:
        task.complete(CompleteTask(task.version, NOW + timedelta(minutes=1)))
    assert "learner_attempt" in missing.value.reason
    assert "cognitive_annotation" in missing.value.reason

    task = _attempt(
        _annotation(task),
        "attempt_version_domain_0001",
        AttemptIndependence.INDEPENDENT,
        2,
    )
    transition = task.complete(CompleteTask(task.version, NOW + timedelta(minutes=3)))

    assert transition.task.state.value == "completed"
    assert transition.task.highest_hint_level == 0
    assert transition.events[0].event_type == "task_completed"


def test_h2_feedback_requires_learner_v2_and_preserves_v1() -> None:
    task = _attempt(
        _task(TaskType.MICRO_EXPRESSION),
        "attempt_version_domain_0001",
        AttemptIndependence.INDEPENDENT,
        1,
    )
    original_v1 = task.attempts[0]
    task = task.record_intervention(
        RecordIntervention(
            expected_version=task.version,
            intervention_id="intervention_domain_0001",
            input_attempt_version_id=original_v1.attempt_version_id,
            hint_level=2,
            intervention_type=InterventionType.PRIORITY_FEEDBACK,
            model_adapter="deterministic_fixture",
            prompt_version="prompt_priority_feedback_v1",
            reason_code="priority_feedback_delivered",
            delivered_content="Clarify the sequence before polishing expression.",
            result_status=InterventionResult.DELIVERED,
            now=NOW + timedelta(minutes=2),
        )
    ).task

    with pytest.raises(DomainError) as missing_output:
        task.complete(CompleteTask(task.version, NOW + timedelta(minutes=3)))
    assert "learner_output_after_intervention" in missing_output.value.reason

    task = _attempt(
        task,
        "attempt_version_domain_0002",
        AttemptIndependence.HINTED_LOW,
        4,
    )
    task = task.record_revision(
        RecordRevision(
            expected_version=task.version,
            revision_event_id="revision_event_domain_0001",
            from_attempt_version_id=original_v1.attempt_version_id,
            to_attempt_version_id=task.attempts[-1].attempt_version_id,
            intervention_id="intervention_domain_0001",
            result_status=RevisionResult.CANDIDATE_IMPROVED,
            now=NOW + timedelta(minutes=5),
        )
    ).task
    completed = task.complete(CompleteTask(task.version, NOW + timedelta(minutes=6))).task

    assert completed.attempts[0] == original_v1
    assert completed.attempts[1].independence is AttemptIndependence.HINTED_LOW
    assert completed.highest_hint_level == 2


def test_intervention_cannot_precede_learner_output() -> None:
    task = _task()
    with pytest.raises(DomainError) as raised:
        task.record_intervention(
            RecordIntervention(
                expected_version=task.version,
                intervention_id="intervention_domain_0001",
                input_attempt_version_id="attempt_version_missing",
                hint_level=1,
                intervention_type=InterventionType.TASK_RESTATEMENT,
                model_adapter="deterministic_fixture",
                prompt_version="prompt_task_restatement_v1",
                reason_code="learner_requested_h1",
                delivered_content="Recheck what the question asks you to compare.",
                result_status=InterventionResult.DELIVERED,
                now=NOW,
            )
        )
    assert raised.value.code is PublicErrorCode.SAVE_NOT_CONFIRMED
    assert raised.value.reason == "learner_attempt_required_before_intervention"


def test_learner_can_end_task_early_without_completion_evidence() -> None:
    task = _task()

    transition = task.end_early(EndTaskEarly(task.version, NOW + timedelta(minutes=1)))

    assert transition.task.state is TaskState.ENDED_EARLY
    assert transition.task.completion_gaps() == ("learner_attempt", "cognitive_annotation")
    assert transition.events[0].event_type == "task_ended_early"
    assert transition.events[0].payload["completion_gap_count"] == 2
    with pytest.raises(DomainError) as immutable:
        transition.task.pause(PauseTask(transition.task.version, NOW + timedelta(minutes=2)))
    assert immutable.value.reason == "terminal_task_is_immutable"


def test_material_replacement_appends_invalidation_without_deleting_history() -> None:
    task = _task()
    original = task.material_assignments[0]
    transition = task.replace_material(
        ReplaceMaterial(
            expected_version=task.version,
            assignment_id="assignment_domain_0002",
            replacement=_material("matched_reading_02_v1"),
            reason_code="material_seen",
            now=NOW + timedelta(minutes=1),
        )
    )

    assert transition.task.material_assignments[0] == original
    assert len(transition.task.material_assignments) == 2
    assert transition.task.material_invalidations[0].assignment_id == original.assignment_id
    assert [event.event_type for event in transition.events] == [
        "material_seen_reported",
        "material_replaced",
    ]


def test_seen_material_evidence_cannot_complete_the_replacement_assignment() -> None:
    task = _attempt(
        _annotation(_task()),
        "attempt_version_domain_0001",
        AttemptIndependence.INDEPENDENT,
        2,
    )
    replaced = task.replace_material(
        ReplaceMaterial(
            expected_version=task.version,
            assignment_id="assignment_domain_0002",
            replacement=_material("matched_reading_02_v1"),
            reason_code="material_seen",
            now=NOW + timedelta(minutes=3),
        )
    ).task

    assert len(replaced.annotations) == 1
    assert len(replaced.attempts) == 1
    assert replaced.current_annotations == ()
    assert replaced.current_attempts == ()
    assert replaced.completion_gaps() == ("learner_attempt", "cognitive_annotation")


def test_withdrawn_content_blocks_resume_without_deleting_evidence() -> None:
    task = _attempt(
        _task(TaskType.MICRO_EXPRESSION),
        "attempt_version_domain_0001",
        AttemptIndependence.INDEPENDENT,
        1,
    )
    paused = task.pause(PauseTask(task.version, NOW + timedelta(minutes=2))).task

    with pytest.raises(DomainError) as blocked:
        paused.resume(
            ResumeTask(
                expected_version=paused.version,
                current_rights_status="withdrawn",
                now=NOW + timedelta(minutes=3),
            )
        )

    assert blocked.value.code is PublicErrorCode.MATERIAL_REPLACED
    assert paused.attempts == task.attempts


@pytest.mark.parametrize(
    ("hint_level", "required_independence"),
    [
        (1, AttemptIndependence.HINTED_LOW),
        (2, AttemptIndependence.HINTED_LOW),
        (3, AttemptIndependence.HINTED_HIGH),
        (4, AttemptIndependence.HINTED_HIGH),
    ],
)
def test_every_hint_level_requires_a_correctly_attributed_new_output(
    hint_level: int,
    required_independence: AttemptIndependence,
) -> None:
    task = _attempt(
        _task(TaskType.MICRO_EXPRESSION),
        "attempt_version_domain_0001",
        AttemptIndependence.INDEPENDENT,
        1,
    )
    task = task.record_intervention(
        RecordIntervention(
            expected_version=task.version,
            intervention_id="intervention_domain_0001",
            input_attempt_version_id=task.attempts[0].attempt_version_id,
            hint_level=hint_level,
            intervention_type=InterventionType.LOCAL_HINT,
            model_adapter="deterministic_fixture",
            prompt_version="prompt_local_hint_v1",
            reason_code="local_hint_delivered",
            delivered_content="Check the relationship between the two clauses.",
            result_status=InterventionResult.DELIVERED,
            now=NOW + timedelta(minutes=2),
        )
    ).task

    with pytest.raises(DomainError):
        _attempt(
            task,
            "attempt_version_domain_wrong",
            AttemptIndependence.INDEPENDENT,
            3,
        )
    revised = _attempt(
        task,
        "attempt_version_domain_0002",
        required_independence,
        3,
    )
    assert revised.attempts[-1].independence is required_independence


@given(expected_version=st.integers().filter(lambda value: value != 1))
def test_any_stale_expected_version_is_rejected(expected_version: int) -> None:
    task = _task()
    with pytest.raises(DomainError) as raised:
        task.save_attempt(
            SaveAttempt(
                expected_version=expected_version,
                attempt_version_id="attempt_version_domain_0001",
                text="My own answer.",
                independence=AttemptIndependence.INDEPENDENT,
                now=NOW,
            )
        )
    assert raised.value.code is PublicErrorCode.SESSION_CONFLICT
    assert raised.value.current_version == 1
