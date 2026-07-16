from collections.abc import AsyncIterator
from datetime import UTC, datetime
from hashlib import sha256
from typing import TypedDict
from uuid import uuid4

import httpx2
import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_api.database import dispose_engine, get_engine
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
        tables.audit_events,
        tables.domain_events,
        tables.next_task_placeholders,
        tables.difficulty_feedback_events,
        tables.material_match_decisions,
        tables.run_task_completion_events,
        tables.run_task_refs,
        tables.revision_events,
        tables.ai_interventions,
        tables.attempt_versions,
        tables.material_assignment_invalidations,
        tables.task_annotations,
        tables.task_material_assignments,
        tables.learning_tasks,
        tables.workflow_runs,
        tables.learner_profile_snapshots,
        tables.outbox_messages,
        tables.idempotency_records,
    ]
    async with get_engine().begin() as connection:
        for table in ordered:
            await connection.execute(sa.delete(table))


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
        assert "approved_content_fixture" in replay_text
        assert "prompt_expression_priority_feedback_v1" in replay_text
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
        assert attempt_count == 2
        assert outbox_count == 6


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

        completed = await client.post(
            f"/learner/v1/tasks/{task_id}/complete",
            headers={"Idempotency-Key": "h1-complete-0001"},
            json={"expected_version": revision_payload["version"]},
        )
        assert completed.status_code == 200
        assert completed.json()["state"] == "completed"
        assert completed.json()["highest_hint_level"] == 1
