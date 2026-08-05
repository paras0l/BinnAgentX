from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import TypedDict
from uuid import uuid4

import httpx2
import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.learner_auth import SYNTHETIC_LEARNER_ID
from binnagent_api.main import create_app
from binnagent_api.vertical_slice import tables
from binnagent_api.vertical_slice.content_catalog import LocalContentCatalog
from binnagent_api.vertical_slice.repository import VerticalSliceRepository
from binnagent_domain.vertical_slice.aggregate import LearningTask
from binnagent_domain.vertical_slice.commands import CreateTask
from binnagent_domain.vertical_slice.models import (
    ActorType,
    ExamTrack,
    FeedbackDensity,
    LearnerProfileSnapshot,
    SelfReportedLevel,
    TaskType,
)

pytestmark = pytest.mark.integration
repository = VerticalSliceRepository()
content_catalog = LocalContentCatalog()


class SeededTask(TypedDict):
    task_id: str
    version: int


async def _seed_task(
    task_type: TaskType,
    *,
    exam_track: ExamTrack,
    self_reported_level: SelfReportedLevel,
) -> SeededTask:
    """Build an internal task fixture without exposing a learner task-creation API."""
    now = datetime.now(UTC)
    suffix = uuid4().hex
    transition = LearningTask.create(
        CreateTask(
            task_id=f"task_{suffix}",
            workflow_run_id=f"workflow_run_{suffix}",
            task_type=task_type,
            learner_profile=LearnerProfileSnapshot(
                learner_snapshot_id=f"learner_snapshot_{suffix}",
                exam_track=exam_track,
                target_score=70,
                weekly_minutes=420,
                self_reported_level=self_reported_level,
                prior_exam_seen=False,
                session_minutes=45,
                feedback_density=FeedbackDensity.MINIMAL,
                timed=False,
                evidence_count=0,
                confidence_band="low",
                created_at=now,
            ),
            material=content_catalog.first_for(task_type),
            assignment_id=f"assignment_{suffix}",
            now=now,
        )
    )
    async with get_engine().begin() as connection:
        await repository.insert_embedded(
            connection,
            transition,
            actor=ActorType.SYSTEM,
            command_name="integration_fixture",
            ensure_workflow=True,
        )
    task = transition.task
    return {"task_id": task.task_id, "version": task.version}


@pytest_asyncio.fixture(autouse=True)
async def clean_vertical_slice_tables() -> AsyncIterator[None]:
    await _clean()
    yield
    await _clean()
    await dispose_engine()


async def _clean() -> None:
    ordered = [
        tables.learner_sessions,
        tables.learner_preferences,
        tables.learner_vocabulary_states,
        tables.experience_code_redemptions,
        tables.email_verification_challenges,
        tables.audit_events,
        tables.domain_events,
        tables.next_task_placeholders,
        tables.learner_level_assessments,
        tables.material_feedback_events,
        tables.difficulty_feedback_events,
        tables.material_match_decisions,
        tables.run_task_completion_events,
        tables.run_task_refs,
        tables.revision_events,
        tables.model_invocation_ledger,
        tables.model_invocations,
        tables.ai_interventions,
        tables.attempt_versions,
        tables.material_assignment_invalidations,
        tables.task_grammar_challenges,
        tables.task_annotations,
        tables.task_material_assignments,
        tables.learning_tasks,
        tables.workflow_runs,
        tables.learners,
        tables.experience_codes,
        tables.learner_profile_snapshots,
        tables.outbox_messages,
        tables.idempotency_records,
    ]
    async with get_engine().begin() as connection:
        for table in ordered:
            await connection.execute(sa.delete(table))


@pytest.mark.asyncio
async def test_reading_material_feedback_is_one_shot_and_queues_level_assessment() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        task = await _seed_task(
            TaskType.MATCHED_READING,
            exam_track=ExamTrack.ENGLISH_1,
            self_reported_level=SelfReportedLevel.DEVELOPING,
        )
        first = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/material-feedback",
            json={"sentiment": "good"},
        )
        assert first.status_code == 200, first.text
        assert first.json()["sentiment"] == "good"

        second = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/material-feedback",
            json={"sentiment": "bad"},
        )
        assert second.status_code == 200, second.text
        assert second.json()["sentiment"] == "good"

    async with get_engine().connect() as connection:
        feedback_rows = (
            (await connection.execute(sa.select(tables.material_feedback_events))).mappings().all()
        )
        assessment_rows = (
            (await connection.execute(sa.select(tables.learner_level_assessments))).mappings().all()
        )
    assert len(feedback_rows) == 1
    assert feedback_rows[0]["task_id"] == task["task_id"]
    assert len(assessment_rows) == 1
    assert assessment_rows[0]["trigger_kind"] == "material_feedback"


@pytest.mark.asyncio
async def test_training_history_is_account_scoped_paginated_and_summarized() -> None:
    now = datetime.now(UTC)
    seeded: list[SeededTask] = []
    for _ in range(7):
        seeded.append(
            await _seed_task(
                TaskType.MATCHED_READING,
                exam_track=ExamTrack.ENGLISH_1,
                self_reported_level=SelfReportedLevel.DEVELOPING,
            )
        )
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.learners.insert().values(
                learner_id=SYNTHETIC_LEARNER_ID,
                nickname="历史分页测试用户",
                email="history-test@binnagent.invalid",
                invite_code=f"HISTORY-{uuid4().hex[:8]}",
                account_type="registered",
                created_at=now,
                updated_at=now,
            )
        )
        for index, task in enumerate(seeded):
            workflow_run_id = str(
                await connection.scalar(
                    sa.select(tables.learning_tasks.c.workflow_run_id).where(
                        tables.learning_tasks.c.task_id == task["task_id"]
                    )
                )
            )
            completed_at = now - timedelta(hours=index)
            await connection.execute(
                tables.workflow_runs.update()
                .where(tables.workflow_runs.c.workflow_run_id == workflow_run_id)
                .values(
                    learner_id=SYNTHETIC_LEARNER_ID,
                    run_kind="practice",
                    state="completed",
                    stage="completed",
                    difficulty_feedback_status="submitted",
                    difficulty_rating="matched",
                    version=10 + index,
                    updated_at=completed_at,
                )
            )
            await connection.execute(
                tables.run_task_completion_events.insert().values(
                    completion_event_id=f"completion_{uuid4().hex}",
                    workflow_run_id=workflow_run_id,
                    task_id=task["task_id"],
                    completed_at=completed_at,
                    completed_task_version=task["version"],
                    highest_hint_level=1 if index in {1, 5} else 0,
                )
            )

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/learner/v1/training-history?page=2&page_size=3")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["page"] == 2
    assert payload["page_size"] == 3
    assert payload["total_items"] == 7
    assert payload["total_pages"] == 3
    assert len(payload["items"]) == 3
    assert payload["summary"] == {
        "completed_sessions": 7,
        "independent_sessions": 5,
        "completed_tasks": 7,
        "supported_tasks": 2,
        "completed_last_7_days": 7,
    }


@pytest.mark.asyncio
async def test_learner_preferences_are_account_owned_and_persisted() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        default_response = await client.get("/learner/v1/preferences")
        assert default_response.status_code == 200
        assert default_response.json()["persisted"] is False

        preferences = default_response.json()["preferences"]
        preferences.update(
            {
                "assistance_mode": "proactive",
                "feedback_detail": "detailed",
                "correction_tone": "direct",
                "reading_comfort": "spacious",
                "reduced_motion": True,
                "skin": "ragdoll",
                "navigation_collapsed": True,
                "collector_mode": "night",
            }
        )
        saved_response = await client.put("/learner/v1/preferences", json=preferences)
        assert saved_response.status_code == 200, saved_response.text
        assert saved_response.json()["version"] == 1

        reloaded_response = await client.get("/learner/v1/preferences")
        assert reloaded_response.status_code == 200
        assert reloaded_response.json()["preferences"] == preferences
        assert reloaded_response.json()["persisted"] is True

        preferences["skin"] = "ocean"
        updated_response = await client.put("/learner/v1/preferences", json=preferences)
        assert updated_response.status_code == 200
        assert updated_response.json()["version"] == 2


@pytest.mark.asyncio
async def test_end_task_early_is_explicit_and_idempotent() -> None:
    seeded = await _seed_task(
        TaskType.MATCHED_READING,
        exam_track=ExamTrack.ENGLISH_1,
        self_reported_level=SelfReportedLevel.DEVELOPING,
    )
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/learner/v1/tasks/{seeded['task_id']}/end-early",
            headers={"Idempotency-Key": "end-task-early-0001"},
            json={"expected_version": seeded["version"]},
        )
        replay = await client.post(
            f"/learner/v1/tasks/{seeded['task_id']}/end-early",
            headers={"Idempotency-Key": "end-task-early-0001"},
            json={"expected_version": seeded["version"]},
        )

    assert response.status_code == 200, response.text
    assert response.json()["state"] == "ended_early"
    assert response.json()["completion_gaps"] == ["learner_attempt", "cognitive_annotation"]
    assert replay.status_code == 200, replay.text
    assert replay.json()["replayed"] is True


@pytest.mark.asyncio
async def test_task_creation_is_owned_by_run_orchestration() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/learner/v1/tasks",
            headers={"Idempotency-Key": "direct-task-create-0001"},
            json={"task_type": "matched_reading", "learner_profile": {}},
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_reading_help_escalates_sequentially_through_h4() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        task = await _seed_task(
            TaskType.MATCHED_READING,
            exam_track=ExamTrack.ENGLISH_1,
            self_reported_level=SelfReportedLevel.DEVELOPING,
        )
        task_id = str(task["task_id"])
        attempt = await client.post(
            f"/learner/v1/tasks/{task_id}/attempts",
            headers={"Idempotency-Key": "reading-help-v1"},
            json={
                "expected_version": task["version"],
                "text": "选择 A。\nMy first independent explanation uses the passage.",
                "independence": "independent",
            },
        )
        assert attempt.status_code == 200, attempt.text
        current = attempt.json()

        skipped = await client.post(
            f"/learner/v1/tasks/{task_id}/hints/3",
            headers={"Idempotency-Key": "reading-help-skip-h3"},
            json={
                "expected_version": current["version"],
                "input_attempt_version_id": current["attempts"][-1]["attempt_version_id"],
            },
        )
        assert skipped.status_code == 422
        assert skipped.json()["reason"] == "reading_hint_must_escalate_one_level_at_a_time"

        for level in range(1, 5):
            path = "h1" if level == 1 else str(level)
            hint = await client.post(
                f"/learner/v1/tasks/{task_id}/hints/{path}",
                headers={"Idempotency-Key": f"reading-help-h{level}"},
                json={
                    "expected_version": current["version"],
                    "input_attempt_version_id": current["attempts"][-1]["attempt_version_id"],
                },
            )
            assert hint.status_code == 200, hint.text
            current = hint.json()
            assert current["highest_hint_level"] == level
            assert current["interventions"][-1]["hint_level"] == level
            assert current["interventions"][-1]["reason_code"] == (f"learner_requested_h{level}")
            if level < 4:
                revised = await client.post(
                    f"/learner/v1/tasks/{task_id}/attempts",
                    headers={"Idempotency-Key": f"reading-help-v{level + 1}"},
                    json={
                        "expected_version": current["version"],
                        "text": (
                            f"选择 B。\nMy revised explanation after H{level} uses new wording."
                        ),
                        "independence": "hinted_low" if level < 3 else "hinted_high",
                    },
                )
                assert revised.status_code == 200, revised.text
                current = revised.json()


@pytest.mark.asyncio
async def test_expression_priority_feedback_is_idempotent_auditable_and_user_authored() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        task = await _seed_task(
            TaskType.MICRO_EXPRESSION,
            exam_track=ExamTrack.ENGLISH_1,
            self_reported_level=SelfReportedLevel.DEVELOPING,
        )
        task_id = str(task["task_id"])

        v1_text = (
            "The translation tool can help a learner check unfamiliar details, but complete "
            "translations can also replace the effort needed to understand sentence structure."
        )
        v1_body = {
            "expected_version": task["version"],
            "text": v1_text,
            "independence": "independent",
        }
        v1 = await client.post(
            f"/learner/v1/tasks/{task_id}/attempts",
            headers={"Idempotency-Key": "save-v1-0001"},
            json=v1_body,
        )
        assert v1.status_code == 200
        v1_payload = v1.json()
        v1_id = v1_payload["attempts"][0]["attempt_version_id"]

        duplicate = await client.post(
            f"/learner/v1/tasks/{task_id}/attempts",
            headers={"Idempotency-Key": "save-v1-0001"},
            json=v1_body,
        )
        assert duplicate.status_code == 200
        assert duplicate.json()["replayed"] is True
        assert len(duplicate.json()["attempts"]) == 1

        intervention = await client.post(
            f"/learner/v1/tasks/{task_id}/feedback/priority",
            headers={"Idempotency-Key": "feedback-h2-0001"},
            json={
                "expected_version": v1_payload["version"],
                "input_attempt_version_id": v1_id,
            },
        )
        assert intervention.status_code == 200
        intervention_payload = intervention.json()
        assert intervention_payload["highest_hint_level"] == 2
        assert intervention_payload["interventions"][0]["reason_code"] == (
            "priority_feedback_sequence"
        )
        assert (
            "what the learner should try before"
            in (intervention_payload["interventions"][0]["delivered_content"])
        )
        assert "model_adapter" not in intervention.text

        intervention_replay = await client.post(
            f"/learner/v1/tasks/{task_id}/feedback/priority",
            headers={"Idempotency-Key": "feedback-h2-0001"},
            json={
                "expected_version": v1_payload["version"],
                "input_attempt_version_id": v1_id,
            },
        )
        assert intervention_replay.status_code == 200
        assert intervention_replay.json()["replayed"] is True
        assert len(intervention_replay.json()["interventions"]) == 1

        current = await client.get(f"/learner/v1/tasks/{task_id}")
        assert current.status_code == 200
        current_payload = current.json()
        v2 = await client.post(
            f"/learner/v1/tasks/{task_id}/attempts",
            headers={"Idempotency-Key": "save-v2-0001"},
            json={
                "expected_version": current_payload["version"],
                "text": "Useful effort reveals gaps and prompts me to revise my reasoning.",
                "independence": "hinted_low",
            },
        )
        assert v2.status_code == 200
        v2_payload = v2.json()
        v2_id = v2_payload["attempts"][1]["attempt_version_id"]
        intervention_id = intervention_payload["interventions"][0]["intervention_id"]

        revision = await client.post(
            f"/learner/v1/tasks/{task_id}/revisions",
            headers={"Idempotency-Key": "revision-v2-0001"},
            json={
                "expected_version": v2_payload["version"],
                "from_attempt_version_id": v1_id,
                "to_attempt_version_id": v2_id,
                "intervention_id": intervention_id,
                "result_status": "candidate_improved",
            },
        )
        assert revision.status_code == 200
        revision_payload = revision.json()

        completed = await client.post(
            f"/learner/v1/tasks/{task_id}/complete",
            headers={"Idempotency-Key": "complete-task-0001"},
            json={"expected_version": revision_payload["version"]},
        )
        assert completed.status_code == 200
        assert completed.json()["state"] == "completed"
        assert completed.json()["highest_hint_level"] == 2
        assert completed.json()["attempts"][0]["text"] == v1_text

        replay = await client.get(
            f"/control/v1/tasks/{task_id}/replay",
            headers={"X-BinnAgent-Control-Role": "developer_reviewer"},
        )
        assert replay.status_code == 200
        replay_text = replay.text
        assert v1_text not in replay_text
        assert "deterministic_fixture" in replay_text
        assert "prompt_expression_priority_feedback_v2" in replay_text
        model_invocations = replay.json()["model_invocations"]
        assert len(model_invocations) == 1
        assert model_invocations[0]["outcome"] == "validated_fixture"
        assert model_invocations[0]["is_remote"] is False
        assert model_invocations[0]["evidence_hash"] is not None
        assert model_invocations[0]["rejection_code"] is None
        assert replay.json()["evidence_counts"] == {
            "annotations": 0,
            "attempts": 2,
            "interventions": 1,
            "revisions": 1,
        }

    async with get_engine().connect() as connection:
        attempt_count = await connection.scalar(
            sa.select(sa.func.count()).select_from(tables.attempt_versions)
        )
        outbox_count = await connection.scalar(
            sa.select(sa.func.count()).select_from(tables.outbox_messages)
        )
        invocation_count = await connection.scalar(
            sa.select(sa.func.count()).select_from(tables.model_invocations)
        )
        assert attempt_count == 2
        assert outbox_count == 6
        assert invocation_count == 1


@pytest.mark.asyncio
async def test_stale_write_returns_only_public_conflict_details() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = await _seed_task(
            TaskType.MATCHED_READING,
            exam_track=ExamTrack.ENGLISH_2,
            self_reported_level=SelfReportedLevel.WEAK,
        )
        quote = (
            "Useful effort can reveal exactly where understanding breaks down, "
            "giving later help a precise target."
        )
        invalid_annotation = await client.post(
            f"/learner/v1/tasks/{payload['task_id']}/annotations",
            headers={"Idempotency-Key": "annotation-invalid-span-0001"},
            json={
                "expected_version": payload["version"],
                "kind": "evidence",
                "span": {
                    "paragraph_id": "matched_01_p2",
                    "start": 0,
                    "end": len(quote),
                    "text_quote": quote,
                    "text_hash": sha256(quote.encode()).hexdigest(),
                },
                "user_explanation": "This coordinate is self-consistent but false.",
            },
        )
        assert invalid_annotation.status_code == 422
        assert invalid_annotation.json()["code"] == "SAVE_NOT_CONFIRMED"
        assert invalid_annotation.json()["reason"] == "annotation_span_not_in_assigned_content"

        annotation = await client.post(
            f"/learner/v1/tasks/{payload['task_id']}/annotations",
            headers={"Idempotency-Key": "annotation-conflict-0001"},
            json={
                "expected_version": payload["version"],
                "kind": "evidence",
                "span": {
                    "paragraph_id": "matched_01_p2",
                    "start": 403,
                    "end": 403 + len(quote),
                    "text_quote": quote,
                    "text_hash": sha256(quote.encode()).hexdigest(),
                },
                "user_explanation": "It supports the claim.",
            },
        )
        assert annotation.status_code == 200
        annotation_payload = annotation.json()
        assert annotation_payload["annotation_count"] == 1
        assert annotation_payload["annotations"] == [
            {
                "annotation_id": annotation_payload["annotations"][0]["annotation_id"],
                "kind": "evidence",
                "span": {
                    "paragraph_id": "matched_01_p2",
                    "start": 403,
                    "end": 403 + len(quote),
                    "text_quote": quote,
                },
                "user_explanation": "It supports the claim.",
                "analysis": None,
                "created_at": annotation_payload["annotations"][0]["created_at"],
            }
        ]

        replacement = await client.post(
            f"/learner/v1/tasks/{payload['task_id']}/material-seen",
            headers={"Idempotency-Key": "material-seen-0001"},
            json={"expected_version": annotation.json()["version"]},
        )
        assert replacement.status_code == 200
        assert replacement.json()["current_content_version_id"] == "matched_reading_02_v1"
        assert replacement.json()["annotation_count"] == 0
        assert replacement.json()["annotations"] == []

        stale = await client.post(
            f"/learner/v1/tasks/{payload['task_id']}/attempts",
            headers={"Idempotency-Key": "stale-attempt-0001"},
            json={
                "expected_version": payload["version"],
                "text": "My own explanation.",
                "independence": "independent",
            },
        )
        assert stale.status_code == 409
        assert stale.json() == {
            "code": "SESSION_CONFLICT",
            "reason": "expected_version_mismatch",
            "current_version": replacement.json()["version"],
        }
        assert "database" not in stale.text.lower()

    async with get_engine().connect() as connection:
        invalidation_count = await connection.scalar(
            sa.select(sa.func.count()).select_from(tables.material_assignment_invalidations)
        )
        assignment_count = await connection.scalar(
            sa.select(sa.func.count()).select_from(tables.task_material_assignments)
        )
        preserved_annotation_count = await connection.scalar(
            sa.select(sa.func.count()).select_from(tables.task_annotations)
        )
        assert invalidation_count == 1
        assert assignment_count == 2
        assert preserved_annotation_count == 1


@pytest.mark.asyncio
async def test_annotation_question_can_request_audited_ai_analysis_without_mutating_task() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        task = await _seed_task(
            TaskType.MATCHED_READING,
            exam_track=ExamTrack.ENGLISH_2,
            self_reported_level=SelfReportedLevel.WEAK,
        )
        material = content_catalog.learner_item("matched_reading_01_v1")
        paragraph = material["paragraphs"][1]
        paragraph_text = str(paragraph["text"])
        quote = "Useful effort can reveal exactly where understanding breaks down"
        start = paragraph_text.index(quote)
        request_body = {
            "expected_version": task["version"],
            "span": {
                "paragraph_id": paragraph["paragraph_id"],
                "start": start,
                "end": start + len(quote),
                "text_quote": quote,
                "text_hash": sha256(quote.encode()).hexdigest(),
            },
            "learner_question": "我还没理清这个长句的主干和修饰关系。",
        }

        analysis = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/annotations/analyze",
            json=request_body,
        )

        assert analysis.status_code == 200
        payload = analysis.json()
        assert payload["focus"] == "syntax"
        assert payload["selection_scope"] == "sentence_or_paragraph"
        assert payload["translation"] is None
        assert payload["vocabulary_note"] is None
        assert payload["learning_count"] is None
        assert len(payload["grammar_structure"]) == 3
        assert payload["source"] == "local_fallback"
        assert payload["analysis_status"] == "abstained"
        assert payload["confidence"] is None
        assert payload["provider_ref"] is None
        assert len(payload["breakdown"]) == 3
        assert "不回答题目" in payload["boundary_note"]

        async with get_engine().begin() as connection:
            ledger = (
                (
                    await connection.execute(
                        sa.select(tables.model_invocation_ledger).where(
                            tables.model_invocation_ledger.c.task_id == task["task_id"]
                        )
                    )
                )
                .mappings()
                .one()
            )
            legacy_payload = dict(ledger["response_payload"])
            legacy_payload.pop("analysis_status")
            legacy_payload.pop("confidence")
            legacy_payload.pop("provider_ref")
            await connection.execute(
                tables.model_invocation_ledger.update()
                .where(tables.model_invocation_ledger.c.invocation_key == ledger["invocation_key"])
                .values(response_payload=legacy_payload)
            )
        replayed = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/annotations/analyze",
            json=request_body,
        )
        assert replayed.status_code == 200, replayed.text
        assert replayed.json()["analysis_status"] == "abstained"
        assert replayed.json()["confidence"] is None
        assert replayed.json()["provider_ref"] is None

        unchanged = await client.get(f"/learner/v1/tasks/{task['task_id']}")
        assert unchanged.json()["version"] == task["version"]
        assert unchanged.json()["annotation_count"] == 0

        saved = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/annotations",
            headers={"Idempotency-Key": "annotation-with-analysis-0001"},
            json={
                "expected_version": task["version"],
                "kind": "grammar",
                "span": request_body["span"],
                "user_explanation": "我想核对这处长句结构。",
                "analysis": payload,
            },
        )
        assert saved.status_code == 200, saved.text
        saved_analysis = saved.json()["annotations"][0]["analysis"]
        assert saved_analysis["diagnosis"] == payload["diagnosis"]
        assert saved_analysis["next_check"] == payload["next_check"]

    async with get_engine().connect() as connection:
        invocation = (
            (
                await connection.execute(
                    sa.select(tables.model_invocations).where(
                        tables.model_invocations.c.task_id == task["task_id"]
                    )
                )
            )
            .mappings()
            .one()
        )
        assert invocation["purpose"] == "annotation_confusion_analysis"
        assert invocation["is_remote"] is False


@pytest.mark.asyncio
async def test_intensive_reading_requires_translation_and_component_attempts() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        task = await _seed_task(
            TaskType.MATCHED_READING,
            exam_track=ExamTrack.ENGLISH_2,
            self_reported_level=SelfReportedLevel.WEAK,
        )
        material = content_catalog.learner_item("matched_reading_01_v1")
        paragraph = material["paragraphs"][1]
        paragraph_text = str(paragraph["text"])
        quote = "Useful effort can reveal exactly where understanding breaks down"
        start = paragraph_text.index(quote)
        request_body = {
            "expected_version": task["version"],
            "span": {
                "paragraph_id": paragraph["paragraph_id"],
                "start": start,
                "end": start + len(quote),
                "text_quote": quote,
                "text_hash": sha256(quote.encode()).hexdigest(),
            },
            "learner_question": "请核对我的整句翻译和自主成分标记。",
            "analysis_mode": "intensive_reading",
        }
        endpoint = f"/learner/v1/tasks/{task['task_id']}/annotations/analyze"

        missing_attempt = await client.post(endpoint, json=request_body)
        assert missing_attempt.status_code == 422, missing_attempt.text
        assert missing_attempt.json()["reason"] == "intensive_reading_attempt_required"

        invalid_mark = await client.post(
            endpoint,
            json={
                **request_body,
                "learner_translation": "有效的努力能揭示理解究竟在哪里中断。",
                "learner_component_marks": [
                    {"role": "subject", "start": 0, "end": 6, "text_quote": "Invalid"}
                ],
            },
        )
        assert invalid_mark.status_code == 422, invalid_mark.text
        assert invalid_mark.json()["reason"] == "intensive_reading_component_span_invalid"

        valid_attempt = await client.post(
            endpoint,
            json={
                **request_body,
                "learner_translation": "有效的努力能揭示理解究竟在哪里中断。",
                "learner_component_marks": [
                    {"role": "subject", "start": 0, "end": 13, "text_quote": "Useful effort"}
                ],
            },
        )
        assert valid_attempt.status_code == 200, valid_attempt.text
        payload = valid_attempt.json()
        assert payload["sentence_components"] == []
        assert payload["grammar_points"] == []
        assert payload["collocations"] == []
        assert payload["familiar_word_senses"] == []
        assert payload["translation_review"]["issues"] == []
        assert payload["knowledge_cards"] == []
        assert payload["follow_up_answer"] is None

        follow_up = await client.post(
            endpoint,
            json={
                **request_body,
                "learner_translation": "有效的努力能揭示理解究竟在哪里中断。",
                "learner_component_marks": [
                    {"role": "subject", "start": 0, "end": 13, "text_quote": "Useful effort"}
                ],
                "follow_up": {
                    "target_kind": "component_comparison",
                    "target_label": "主语边界",
                    "target_content": "Useful effort",
                    "question": "为什么主语边界到 effort 结束?",
                },
            },
        )
        assert follow_up.status_code == 200, follow_up.text
        follow_up_payload = follow_up.json()["follow_up_answer"]
        assert follow_up_payload is not None
        assert follow_up_payload["evidence_quotes"] == [quote]

        unchanged = await client.get(f"/learner/v1/tasks/{task['task_id']}")
        assert unchanged.json()["version"] == task["version"]


@pytest.mark.asyncio
async def test_word_annotation_uses_local_5530_dictionary_without_model_tokens() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        task = await _seed_task(
            TaskType.MATCHED_READING,
            exam_track=ExamTrack.ENGLISH_2,
            self_reported_level=SelfReportedLevel.WEAK,
        )
        material = content_catalog.learner_item("matched_reading_01_v1")
        paragraph = material["paragraphs"][1]
        paragraph_text = str(paragraph["text"])
        quote = "effort"
        start = paragraph_text.index(quote)

        request_body = {
            "expected_version": task["version"],
            "span": {
                "paragraph_id": paragraph["paragraph_id"],
                "start": start,
                "end": start + len(quote),
                "text_quote": quote,
                "text_hash": sha256(quote.encode()).hexdigest(),
            },
            "learner_question": "这个生词是什么意思?",
        }
        endpoint = f"/learner/v1/tasks/{task['task_id']}/annotations/analyze"
        analysis = await client.post(endpoint, json=request_body)

        assert analysis.status_code == 200, analysis.text
        payload = analysis.json()
        assert payload["analysis_status"] == "resolved"
        assert payload["focus"] == "vocabulary"
        assert payload["source"] == "local_dictionary"
        assert payload["reason_code"] == "annotation_analysis_dictionary_hit"
        assert payload["provider_ref"].startswith("dictionary:netem-5530-v1:")
        assert "核心义与考研用法" in payload["vocabulary_note"]
        assert payload["learning_count"] == 1

        second = await client.post(
            endpoint,
            json={**request_body, "learner_question": "再看一次这个词的常用搭配。"},
        )
        assert second.status_code == 200, second.text
        assert second.json()["learning_count"] == 2

        replayed = await client.post(endpoint, json=request_body)
        assert replayed.status_code == 200, replayed.text
        assert replayed.json()["learning_count"] == 2

    async with get_engine().connect() as connection:
        invocations = (
            (
                await connection.execute(
                    sa.select(tables.model_invocations)
                    .where(tables.model_invocations.c.task_id == task["task_id"])
                    .order_by(tables.model_invocations.c.created_at)
                )
            )
            .mappings()
            .all()
        )
        workflow = (
            (
                await connection.execute(
                    sa.select(tables.workflow_runs).where(
                        tables.workflow_runs.c.workflow_run_id
                        == task["task_id"].replace("task_", "workflow_run_")
                    )
                )
            )
            .mappings()
            .one()
        )
        vocabulary_state = (
            (await connection.execute(sa.select(tables.learner_vocabulary_states))).mappings().one()
        )
        assert len(invocations) == 2
        assert all(item["outcome"] == "validated_local_resource" for item in invocations)
        assert all(item["is_remote"] is False for item in invocations)
        assert all(item["actual_cost_usd"] == 0 for item in invocations)
        assert vocabulary_state["headword"] == "effort"
        assert vocabulary_state["learning_count"] == 2
        assert workflow["model_call_count"] == 0


@pytest.mark.asyncio
async def test_expression_review_requires_saved_work_and_preserves_authored_versions() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        task = await _seed_task(
            TaskType.MICRO_EXPRESSION,
            exam_track=ExamTrack.ENGLISH_1,
            self_reported_level=SelfReportedLevel.DEVELOPING,
        )
        draft = (
            "Digital tools can help students check details, but students should reason "
            "independently before relying on them."
        )
        unsaved = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/expression-lab/review",
            json={"expected_version": task["version"], "draft": draft, "recent_assets": []},
        )
        assert unsaved.status_code == 422
        assert unsaved.json()["reason"] == "expression_review_saved_attempt_required"

        saved = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/attempts",
            headers={"Idempotency-Key": "expression-review-v1-0001"},
            json={
                "expected_version": task["version"],
                "text": draft,
                "independence": "independent",
            },
        )
        assert saved.status_code == 200, saved.text
        saved_payload = saved.json()
        review = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/expression-lab/review",
            json={
                "expected_version": saved_payload["version"],
                "draft": draft,
                "recent_assets": [{"title": "让步结构", "content": "can help ..., but ..."}],
            },
        )
        assert review.status_code == 200, review.text
        review_payload = review.json()
        assert review_payload["source"] == "local_fallback"
        assert {version["style"] for version in review_payload["versions"]} == {
            "logic_mirror",
            "academic",
            "news",
        }
        unchanged = await client.get(f"/learner/v1/tasks/{task['task_id']}")
        assert unchanged.json()["version"] == saved_payload["version"]
        assert unchanged.json()["attempts"] == saved_payload["attempts"]

    async with get_engine().connect() as connection:
        invocation = (
            (
                await connection.execute(
                    sa.select(tables.model_invocations).where(
                        tables.model_invocations.c.task_id == task["task_id"]
                    )
                )
            )
            .mappings()
            .one()
        )
        assert invocation["purpose"] == "expression_style_review"
        assert (
            invocation["input_attempt_version_id"]
            == saved_payload["attempts"][0]["attempt_version_id"]
        )


@pytest.mark.asyncio
async def test_h1_is_gated_auditable_and_requires_linked_learner_v2() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        task = await _seed_task(
            TaskType.CALIBRATION_READING,
            exam_track=ExamTrack.ENGLISH_1,
            self_reported_level=SelfReportedLevel.DEVELOPING,
        )
        task_id = task["task_id"]

        too_early = await client.post(
            f"/learner/v1/tasks/{task_id}/hints/h1",
            headers={"Idempotency-Key": "h1-before-v1-0001"},
            json={
                "expected_version": task["version"],
                "input_attempt_version_id": "attempt_version_missing",
            },
        )
        assert too_early.status_code == 422
        assert too_early.json()["reason"] == "learner_attempt_required_before_intervention"

        v1 = await client.post(
            f"/learner/v1/tasks/{task_id}/attempts",
            headers={"Idempotency-Key": "h1-v1-0001"},
            json={
                "expected_version": task["version"],
                "text": "选择 A。\nThe rule created more rooms.",
                "independence": "independent",
            },
        )
        assert v1.status_code == 200
        v1_payload = v1.json()
        v1_id = v1_payload["attempts"][0]["attempt_version_id"]

        h1_body = {
            "expected_version": v1_payload["version"],
            "input_attempt_version_id": v1_id,
        }
        hint = await client.post(
            f"/learner/v1/tasks/{task_id}/hints/h1",
            headers={"Idempotency-Key": "h1-delivery-0001"},
            json=h1_body,
        )
        assert hint.status_code == 200
        hint_payload = hint.json()
        intervention = hint_payload["interventions"][0]
        assert intervention["hint_level"] == 1
        assert intervention["reason_code"] == "learner_requested_h1"
        assert intervention["delivered_content"] == (
            "Look for the result reported after the two-week trial."
        )
        assert (
            intervention["content_hash"]
            == sha256(intervention["delivered_content"].encode()).hexdigest()
        )
        assert "existing rooms became" not in hint.text
        assert hint_payload["completion_gaps"] == ["learner_output_after_intervention"]

        replay = await client.post(
            f"/learner/v1/tasks/{task_id}/hints/h1",
            headers={"Idempotency-Key": "h1-delivery-0001"},
            json=h1_body,
        )
        assert replay.status_code == 200
        assert replay.json()["replayed"] is True
        assert len(replay.json()["interventions"]) == 1

        unchanged = await client.post(
            f"/learner/v1/tasks/{task_id}/attempts",
            headers={"Idempotency-Key": "h1-v2-unchanged-0001"},
            json={
                "expected_version": hint_payload["version"],
                "text": v1_payload["attempts"][0]["text"],
                "independence": "hinted_low",
            },
        )
        assert unchanged.status_code == 422
        assert unchanged.json()["reason"] == "revision_must_change_output"

        v2 = await client.post(
            f"/learner/v1/tasks/{task_id}/attempts",
            headers={"Idempotency-Key": "h1-v2-0001"},
            json={
                "expected_version": hint_payload["version"],
                "text": "选择 B。\nThe reported result was broader access without new rooms.",
                "independence": "hinted_low",
            },
        )
        assert v2.status_code == 200
        v2_payload = v2.json()
        assert v2_payload["completion_gaps"] == ["learner_revision_after_intervention"]

        revision = await client.post(
            f"/learner/v1/tasks/{task_id}/revisions",
            headers={"Idempotency-Key": "h1-revision-0001"},
            json={
                "expected_version": v2_payload["version"],
                "from_attempt_version_id": v1_id,
                "to_attempt_version_id": v2_payload["attempts"][1]["attempt_version_id"],
                "intervention_id": intervention["intervention_id"],
                "result_status": "needs_review",
            },
        )
        assert revision.status_code == 200
        revision_payload = revision.json()
        assert revision_payload["completion_gaps"] == []
        assert revision_payload["revisions"][0]["result_status"] == "needs_review"

        challenge = content_catalog.grammar_challenge_for(
            str(task_id),
            "calibration_reading_a_v1",
        )
        grammar = await client.post(
            f"/learner/v1/tasks/{task_id}/grammar-challenge/verify",
            json={"correction": challenge.correct_text},
        )
        assert grammar.status_code == 200, grammar.text
        assert grammar.json()["verification_correct"] is True

        completed = await client.post(
            f"/learner/v1/tasks/{task_id}/complete",
            headers={"Idempotency-Key": "h1-complete-0001"},
            json={"expected_version": revision_payload["version"]},
        )
        assert completed.status_code == 200
        assert completed.json()["state"] == "completed"
        assert completed.json()["highest_hint_level"] == 1
