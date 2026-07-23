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
from binnagent_api.vertical_slice.content_catalog import LocalContentCatalog

pytestmark = pytest.mark.integration
content_catalog = LocalContentCatalog()


@pytest.mark.asyncio
async def test_resume_workspace_treats_an_expired_browser_pointer_as_absent() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/learner/v1/runs/workflow_run_expired/resume-workspace")

    assert response.status_code == 200, response.text
    assert response.json() == {"available": False, "workspace": None}


@pytest.mark.asyncio
async def test_reading_grammar_challenge_hides_then_reveals_answer_and_restores_original() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/learner/v1/runs",
            headers={"Idempotency-Key": "grammar-run-create-0001"},
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
        task_id = run["current_task_id"]
        workspace = await client.get(f"/learner/v1/runs/{run_id}/workspace")
        assert workspace.status_code == 200, workspace.text
        payload = workspace.json()
        material = payload["material"]
        challenge = content_catalog.grammar_challenge_for(
            task_id,
            material["content_version_id"],
        )
        item = content_catalog.learner_item(material["content_version_id"])
        correct_paragraphs = {
            paragraph["paragraph_id"]: paragraph["text"] for paragraph in item["paragraphs"]
        }
        displayed_paragraphs = {
            paragraph["paragraph_id"]: paragraph["text"] for paragraph in material["paragraphs"]
        }

        assert material["grammar_challenge"] == {
            "challenge_id": challenge.challenge_id,
            "status": "pending",
            "attempt_count": 0,
            "hint_revealed": False,
            "error_type": None,
            "hint": None,
            "answer": None,
        }
        assert (
            displayed_paragraphs[challenge.paragraph_id]
            != correct_paragraphs[challenge.paragraph_id]
        )
        assert challenge.incorrect_text in displayed_paragraphs[challenge.paragraph_id]
        assert "correct_text" not in workspace.text
        assert "incorrect_text" not in workspace.text

        premature = await client.post(
            f"/learner/v1/tasks/{task_id}/complete",
            headers={"Idempotency-Key": "grammar-premature-complete-0001"},
            json={"expected_version": payload["task"]["version"]},
        )
        assert premature.status_code == 422
        assert premature.json()["reason"] == "grammar_challenge_not_resolved"

        hint = await client.post(f"/learner/v1/tasks/{task_id}/grammar-challenge/hint")
        assert hint.status_code == 200, hint.text
        assert hint.json()["grammar_challenge"]["error_type"] == challenge.error_type
        assert challenge.correct_text not in hint.text

        wrong = await client.post(
            f"/learner/v1/tasks/{task_id}/grammar-challenge/verify",
            json={"correction": "definitely wrong"},
        )
        assert wrong.status_code == 200, wrong.text
        assert wrong.json()["verification_correct"] is False
        assert wrong.json()["paragraphs"] == material["paragraphs"]

        revealed = await client.post(f"/learner/v1/tasks/{task_id}/grammar-challenge/answer")
        assert revealed.status_code == 200, revealed.text
        assert revealed.json()["verification_correct"] is None
        assert revealed.json()["grammar_challenge"]["status"] == "resolved"
        assert revealed.json()["grammar_challenge"]["answer"] == challenge.correct_text
        assert {
            paragraph["paragraph_id"]: paragraph["text"]
            for paragraph in revealed.json()["paragraphs"]
        } == correct_paragraphs

        resumed = await client.get(f"/learner/v1/runs/{run_id}/resume-workspace")
        assert resumed.status_code == 200, resumed.text
        resumed_material = resumed.json()["workspace"]["material"]
        assert resumed_material["grammar_challenge"]["status"] == "resolved"
        assert resumed_material["grammar_challenge"]["answer"] == challenge.correct_text
        assert {
            paragraph["paragraph_id"]: paragraph["text"]
            for paragraph in resumed_material["paragraphs"]
        } == correct_paragraphs


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
        tables.experience_code_redemptions,
        tables.email_verification_challenges,
        tables.audit_events,
        tables.domain_events,
        tables.next_task_placeholders,
        tables.difficulty_feedback_events,
        tables.material_match_decisions,
        tables.run_task_completion_events,
        tables.run_task_refs,
        tables.revision_events,
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
    task = (await client.get(f"/learner/v1/tasks/{task_id}")).json()
    if task["task_type"] in {"calibration_reading", "matched_reading"}:
        challenge = content_catalog.grammar_challenge_for(
            task_id,
            task["current_content_version_id"],
        )
        verified = await client.post(
            f"/learner/v1/tasks/{task_id}/grammar-challenge/verify",
            json={"correction": challenge.correct_text},
        )
        assert verified.status_code == 200, verified.text
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
async def test_early_ended_task_can_advance_without_becoming_completion_evidence() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/learner/v1/runs",
            headers={"Idempotency-Key": "run-create-early-end-0001"},
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
        run = created.json()
        task = (await client.get(f"/learner/v1/tasks/{run['current_task_id']}")).json()
        ended = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/end-early",
            headers={"Idempotency-Key": "run-task-end-early-0001"},
            json={"expected_version": task["version"]},
        )
        advanced = await client.post(
            f"/learner/v1/runs/{run['workflow_run_id']}/advance",
            headers={"Idempotency-Key": "run-advance-early-end-0001"},
            json={"expected_version": run["version"]},
        )

    assert created.status_code == 201, created.text
    assert ended.status_code == 200, ended.text
    assert ended.json()["state"] == "ended_early"
    assert advanced.status_code == 200, advanced.text
    assert advanced.json()["stage"] == "calibration_b"


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

        premature_continuation = await client.post(
            f"/learner/v1/runs/{run_id}/continue",
            headers={"Idempotency-Key": "run-continue-premature-0001"},
            json={"expected_version": run["version"]},
        )
        assert premature_continuation.status_code == 409
        assert premature_continuation.json()["reason"] == (
            "practice_requires_completed_predecessor"
        )

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
        assert completed.json()["run_kind"] == "first_experience"
        assert completed.json()["completion_gaps"] == []

        continued = await client.post(
            f"/learner/v1/runs/{run_id}/continue",
            headers={"Idempotency-Key": "run-continue-0001"},
            json={"expected_version": completed.json()["version"]},
        )
        assert continued.status_code == 201, continued.text
        continued_run = continued.json()
        assert continued_run["run_kind"] == "practice"
        assert continued_run["predecessor_run_id"] == run_id
        assert continued_run["stage"] == "matched_reading"
        assert continued_run["task_refs"][0]["content_version_id"] == "matched_reading_02_v1"
        repeated_continuation = await client.post(
            f"/learner/v1/runs/{run_id}/continue",
            headers={"Idempotency-Key": "run-continue-0002"},
            json={"expected_version": completed.json()["version"]},
        )
        assert repeated_continuation.status_code == 201
        assert repeated_continuation.json()["workflow_run_id"] == continued_run["workflow_run_id"]
        assert repeated_continuation.json()["replayed"] is True

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
        assert task_count == 5
        assert completion_count == 4
        assert decision_count == 3
