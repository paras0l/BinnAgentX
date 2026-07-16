from collections.abc import AsyncIterator
from hashlib import sha256

import httpx2
import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.main import create_app
from binnagent_api.vertical_slice import tables

pytestmark = pytest.mark.integration


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
async def test_h2_revision_is_idempotent_auditable_and_user_authored() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/learner/v1/tasks",
            headers={"Idempotency-Key": "create-slice-0001"},
            json={
                "task_type": "micro_expression",
                "learner_profile": {
                    "exam_track": "english_1",
                    "target_score": 70,
                    "weekly_minutes": 420,
                    "self_reported_level": "developing",
                    "prior_exam_seen": False,
                    "session_minutes": 45,
                    "feedback_density": "minimal",
                    "timed": False,
                },
            },
        )
        assert created.status_code == 201
        task = created.json()
        task_id = task["task_id"]

        v1_body = {
            "expected_version": task["version"],
            "text": "Useful effort reveals what I do not understand.",
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
            f"/control/v1/tasks/{task_id}/interventions",
            headers={
                "Idempotency-Key": "feedback-h2-0001",
                "X-BinnAgent-Control-Role": "developer_reviewer",
            },
            json={
                "expected_version": v1_payload["version"],
                "input_attempt_version_id": v1_id,
                "hint_level": 2,
                "intervention_type": "priority_feedback",
                "model_adapter": "deterministic_fixture",
                "prompt_version": "prompt_priority_feedback_v1",
                "result_status": "delivered",
                "reason_code": "priority_feedback_delivered",
            },
        )
        assert intervention.status_code == 200
        intervention_payload = intervention.json()

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
        intervention_id = next(
            event["payload"]["intervention_id"]
            for event in intervention_payload["event_chain"]
            if event["event_type"] == "ai_intervention_delivered"
        )

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
        assert completed.json()["attempts"][0]["text"] == v1_body["text"]

        replay = await client.get(
            f"/control/v1/tasks/{task_id}/replay",
            headers={"X-BinnAgent-Control-Role": "developer_reviewer"},
        )
        assert replay.status_code == 200
        replay_text = replay.text
        assert v1_body["text"] not in replay_text
        assert "deterministic_fixture" in replay_text
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
        created = await client.post(
            "/learner/v1/tasks",
            headers={"Idempotency-Key": "create-conflict-0001"},
            json={
                "task_type": "matched_reading",
                "learner_profile": {
                    "exam_track": "english_2",
                    "target_score": 65,
                    "weekly_minutes": 300,
                    "self_reported_level": "weak",
                    "prior_exam_seen": False,
                    "session_minutes": 30,
                    "feedback_density": "minimal",
                    "timed": False,
                },
            },
        )
        payload = created.json()
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

        replacement = await client.post(
            f"/learner/v1/tasks/{payload['task_id']}/material-seen",
            headers={"Idempotency-Key": "material-seen-0001"},
            json={"expected_version": annotation.json()["version"]},
        )
        assert replacement.status_code == 200
        assert replacement.json()["current_content_version_id"] == "matched_reading_02_v1"
        assert replacement.json()["annotation_count"] == 0

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
