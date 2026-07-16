from collections.abc import AsyncIterator
from hashlib import sha256
from typing import Any

import httpx2
import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.main import create_app
from binnagent_api.vertical_slice import tables

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_resume_workspace_treats_an_expired_browser_pointer_as_absent() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/learner/v1/runs/workflow_run_expired/resume-workspace")

    assert response.status_code == 200, response.text
    assert response.json() == {"available": False, "workspace": None}


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


async def _save_independent_attempt(
    client: httpx2.AsyncClient,
    task_id: str,
    task_version: int,
    key: str,
    text: str,
) -> Any:
    response = await client.post(
        f"/learner/v1/tasks/{task_id}/attempts",
        headers={"Idempotency-Key": key},
        json={
            "expected_version": task_version,
            "text": text,
            "independence": "independent",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


async def _complete_task(
    client: httpx2.AsyncClient,
    task_id: str,
    task_version: int,
    key: str,
) -> Any:
    response = await client.post(
        f"/learner/v1/tasks/{task_id}/complete",
        headers={"Idempotency-Key": key},
        json={"expected_version": task_version},
    )
    assert response.status_code == 200, response.text
    return response.json()


async def _advance_run(
    client: httpx2.AsyncClient,
    run_id: str,
    run_version: int,
    key: str,
) -> Any:
    response = await client.post(
        f"/learner/v1/runs/{run_id}/advance",
        headers={"Idempotency-Key": key},
        json={"expected_version": run_version},
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.asyncio
async def test_complete_cross_task_run_with_conservative_matching_and_replay() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/learner/v1/runs",
            headers={"Idempotency-Key": "run-create-0001"},
            json={
                "learner_profile": {
                    "exam_track": "english_1",
                    "target_score": 70,
                    "weekly_minutes": 420,
                    "self_reported_level": "developing",
                    "prior_exam_seen": False,
                    "session_minutes": 45,
                    "feedback_density": "minimal",
                    "timed": False,
                    "evidence_count": 0,
                    "confidence_band": "low",
                }
            },
        )
        assert created.status_code == 201, created.text
        run = created.json()
        run_id = run["workflow_run_id"]
        assert run["stage"] == "calibration_a"
        assert run["task_refs"][0]["content_version_id"] == "calibration_reading_a_v1"

        workspace = await client.get(f"/learner/v1/runs/{run_id}/workspace")
        assert workspace.status_code == 200, workspace.text
        workspace_payload = workspace.json()
        assert workspace_payload["task"]["task_id"] == run["current_task_id"]
        assert workspace_payload["material"]["content_type"] == "calibration_reading"
        assert workspace_payload["material"]["question"]["options"][1]["option_id"] == "B"
        assert "correct_answer" not in workspace.text
        assert "public_explanation" not in workspace.text
        assert '"hints"' not in workspace.text

        resumed = await client.get(f"/learner/v1/runs/{run_id}/resume-workspace")
        assert resumed.status_code == 200, resumed.text
        assert resumed.json()["available"] is True
        assert resumed.json()["workspace"] == workspace_payload

        first_task = (await client.get(f"/learner/v1/tasks/{run['current_task_id']}")).json()
        first_attempt = await _save_independent_attempt(
            client,
            first_task["task_id"],
            first_task["version"],
            "cal-a-attempt-0001",
            "The author argues that useful tools should support rather than replace thinking.",
        )
        await _complete_task(
            client,
            first_task["task_id"],
            first_attempt["version"],
            "cal-a-complete-0001",
        )
        run = await _advance_run(client, run_id, run["version"], "run-advance-cal-a-0001")
        assert run["stage"] == "calibration_b"

        duplicate = await _advance_run(client, run_id, 1, "run-advance-cal-a-0001")
        assert duplicate["replayed"] is True
        assert duplicate["version"] == run["version"]

        stale = await client.post(
            f"/learner/v1/runs/{run_id}/advance",
            headers={"Idempotency-Key": "run-advance-stale-0001"},
            json={"expected_version": 1},
        )
        assert stale.status_code == 409
        assert stale.json() == {
            "code": "SESSION_CONFLICT",
            "reason": "run_expected_version_mismatch",
            "current_version": run["version"],
        }

        second_task = (await client.get(f"/learner/v1/tasks/{run['current_task_id']}")).json()
        second_attempt = await _save_independent_attempt(
            client,
            second_task["task_id"],
            second_task["version"],
            "cal-b-attempt-0001",
            "The passage distinguishes quick recognition from independent production.",
        )
        await _complete_task(
            client,
            second_task["task_id"],
            second_attempt["version"],
            "cal-b-complete-0001",
        )
        run = await _advance_run(client, run_id, run["version"], "run-advance-cal-b-0001")
        assert run["stage"] == "matched_reading"
        assert run["match_decisions"][0]["selected_content_version_id"] == ("matched_reading_01_v1")
        assert run["match_decisions"][0]["conservative"] is True

        matched_task = (await client.get(f"/learner/v1/tasks/{run['current_task_id']}")).json()
        quote = (
            "Useful effort can reveal exactly where understanding breaks down, "
            "giving later help a precise target."
        )
        annotation = await client.post(
            f"/learner/v1/tasks/{matched_task['task_id']}/annotations",
            headers={"Idempotency-Key": "matched-annotation-0001"},
            json={
                "expected_version": matched_task["version"],
                "kind": "evidence",
                "span": {
                    "paragraph_id": "matched_01_p2",
                    "start": 403,
                    "end": 403 + len(quote),
                    "text_quote": quote,
                    "text_hash": sha256(quote.encode()).hexdigest(),
                },
                "user_explanation": "The sentence links productive effort to a visible gap.",
            },
        )
        assert annotation.status_code == 200, annotation.text
        matched_attempt = await _save_independent_attempt(
            client,
            matched_task["task_id"],
            annotation.json()["version"],
            "matched-attempt-0001",
            "Limited effort is useful when it exposes a gap and leads to targeted feedback.",
        )
        await _complete_task(
            client,
            matched_task["task_id"],
            matched_attempt["version"],
            "matched-complete-0001",
        )
        run = await _advance_run(client, run_id, run["version"], "run-advance-matched-0001")
        assert run["stage"] == "micro_expression"
        assert run["task_refs"][-1]["content_version_id"] == "micro_expression_01_v1"

        expression_workspace = await client.get(f"/learner/v1/runs/{run_id}/workspace")
        assert expression_workspace.status_code == 200, expression_workspace.text
        assert expression_workspace.json()["material"]["content_type"] == "micro_expression"
        assert "feedback_rule" not in expression_workspace.text
        assert "automatic_feedback_refusal" not in expression_workspace.text

        micro_task = (await client.get(f"/learner/v1/tasks/{run['current_task_id']}")).json()
        micro_attempt = await _save_independent_attempt(
            client,
            micro_task["task_id"],
            micro_task["version"],
            "micro-attempt-0001",
            (
                "Navigation apps are useful when they remove irrelevant effort. "
                "They become less useful when they replace the skill a learner "
                "still needs to practice."
            ),
        )
        await _complete_task(
            client,
            micro_task["task_id"],
            micro_attempt["version"],
            "micro-complete-0001",
        )
        run = await _advance_run(client, run_id, run["version"], "run-advance-micro-0001")
        assert run["stage"] == "wrap_up"
        assert run["current_task_id"] is None

        feedback = await client.post(
            f"/learner/v1/runs/{run_id}/difficulty-feedback",
            headers={"Idempotency-Key": "run-difficulty-0001"},
            json={
                "expected_version": run["version"],
                "rating": "matched",
                "skipped": False,
            },
        )
        assert feedback.status_code == 200, feedback.text
        run = feedback.json()
        placeholder = await client.post(
            f"/learner/v1/runs/{run_id}/next-task-placeholder",
            headers={"Idempotency-Key": "run-placeholder-0001"},
            json={
                "expected_version": run["version"],
                "planned_task_type": "matched_reading",
                "reason_code": "continue_matched_practice",
            },
        )
        assert placeholder.status_code == 200, placeholder.text
        run = placeholder.json()
        completed = await client.post(
            f"/learner/v1/runs/{run_id}/complete",
            headers={"Idempotency-Key": "run-complete-0001"},
            json={"expected_version": run["version"]},
        )
        assert completed.status_code == 200, completed.text
        assert completed.json()["stage"] == "completed"
        assert completed.json()["completion_gaps"] == []

        replay = await client.get(
            f"/control/v1/runs/{run_id}/replay",
            headers={"X-BinnAgent-Control-Role": "developer_reviewer"},
        )
        assert replay.status_code == 200, replay.text
        assert "Navigation apps are useful" not in replay.text
        event_types = [item["event_type"] for item in replay.json()["event_chain"]]
        assert "material_match_decided" in event_types
        assert "vertical_slice_run_completed" in event_types

    async with get_engine().connect() as connection:
        task_count = await connection.scalar(
            sa.select(sa.func.count()).select_from(tables.learning_tasks)
        )
        completion_count = await connection.scalar(
            sa.select(sa.func.count()).select_from(tables.run_task_completion_events)
        )
        decision_count = await connection.scalar(
            sa.select(sa.func.count()).select_from(tables.material_match_decisions)
        )
        assert task_count == 4
        assert completion_count == 4
        assert decision_count == 1
