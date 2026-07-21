from collections.abc import AsyncIterator
from datetime import UTC, datetime
from hashlib import sha256

import httpx2
import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.main import create_app
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

pytestmark = pytest.mark.integration


@pytest_asyncio.fixture(autouse=True)
async def clean_obsidian_state(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[None]:
    monkeypatch.setenv("BINNAGENT_LEARNER_IDENTITY_ADAPTER", "synthetic")
    monkeypatch.setenv("BINNAGENT_MODEL_ADAPTER", "deterministic_fixture")
    monkeypatch.setenv("BINNAGENT_KNOWLEDGE_VAULT_ADAPTER", "disabled")
    get_settings.cache_clear()
    await _clean()
    yield
    await _clean()
    await dispose_engine()
    get_settings.cache_clear()


async def _clean() -> None:
    async with get_engine().begin() as connection:
        for table in (
            tables.difficulty_feedback_events,
            tables.next_task_placeholders,
            tables.material_match_decisions,
            tables.run_task_completion_events,
            tables.run_task_refs,
            tables.revision_events,
            tables.ai_interventions,
            tables.attempt_versions,
            tables.task_grammar_challenges,
            tables.task_annotations,
            tables.task_material_assignments,
            tables.learning_tasks,
            tables.personalized_training_materials,
            tables.workflow_runs,
            tables.learner_profile_snapshots,
            tables.idempotency_records,
            tables.agent_memory_events,
            tables.obsidian_learning_context,
            tables.obsidian_sync_connections,
            tables.outbox_messages,
            tables.learning_asset_index,
        ):
            await connection.execute(sa.delete(table))


@pytest.mark.asyncio
async def test_bidirectional_sync_personalized_reading_and_annotation_export() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/learner/v1/assets",
            json={
                "kind": "grammar",
                "title": "Although 让步结构",
                "tags": ["grammar"],
                "source_type": "annotation",
                "source_title": "First reading",
                "initial_content": (
                    "> Although the plan looked safe, the evidence changed.\n\n先找主句。"
                ),
            },
        )
        assert created.status_code == 201, created.text
        asset_id = created.json()["asset_id"]
        assert created.json()["sync_status"] == "pending_export"

        paired = await client.post("/learner/v1/assets/obsidian-plugin-connections")
        assert paired.status_code == 200, paired.text
        connection_id = paired.json()["connection_id"]
        headers = {"Authorization": f"Bearer {paired.json()['sync_secret']}"}

        pending = await client.get(
            f"/learner/v1/obsidian-sync/{connection_id}/exports", headers=headers
        )
        assert pending.status_code == 200, pending.text
        assert pending.json()[0]["asset_id"] == asset_id
        assert "Although the plan" in pending.json()[0]["initial_content"]

        acknowledged = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/exports/{asset_id}/ack",
            headers=headers,
            json={
                "source_key": f"BinnAgentX/Assets/although-{asset_id[-10:]}.md",
                "content_hash": "a" * 64,
                "modified_at": datetime.now(UTC).isoformat(),
                "vault_name": "bin01",
            },
        )
        assert acknowledged.status_code == 200, acknowledged.text

        imported = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/import",
            headers=headers,
            json={
                "schema_version": "learning-context/v1",
                "vault_name": "bin01",
                "entries": [
                    {
                        "source_key": "BinnAgentX/Grammar/contrast-note.md",
                        "title": "Contrast and concession",
                        "kind": "grammar",
                        "tags": ["binnagent", "grammar"],
                        "excerpt": (
                            "Although introduces a concession; the main clause carries the claim."
                        ),
                        "modified_at": datetime.now(UTC).isoformat(),
                    }
                ],
            },
        )
        assert imported.status_code == 200, imported.text

        assets = await client.get("/learner/v1/assets")
        assert assets.status_code == 200, assets.text
        assert {item["title"] for item in assets.json()} == {
            "Although 让步结构",
            "Contrast and concession",
        }
        assert all("content" not in item and "excerpt" not in item for item in assets.json())

        reading = await client.post("/learner/v1/training-materials/personalized")
        assert reading.status_code == 201, reading.text
        assert len(reading.json()["paragraphs"]) >= 3
        assert "Contrast and concession" in " ".join(reading.json()["focus_points"])
        assert reading.json()["status"] == "ready"
        assert reading.json()["training_eligible"] is False
        assert reading.json()["start_block_reason"] == "calibration_required"
        async with get_engine().connect() as connection:
            memory_event = (
                (
                    await connection.execute(
                        sa.select(tables.agent_memory_events).where(
                            tables.agent_memory_events.c.agent_name
                            == "personalized_reading.generate"
                        )
                    )
                )
                .mappings()
                .one()
            )
        assert memory_event["operation"] == "recall"
        assert len(memory_event["memory_ids"]) == 1

        queued = await client.get("/learner/v1/training-materials")
        assert queued.status_code == 200, queued.text
        assert [item["material_id"] for item in queued.json()] == [reading.json()["material_id"]]

        stale_client = await client.patch(
            f"/learner/v1/training-materials/{reading.json()['material_id']}/status",
            json={"status": "in_progress"},
        )
        assert stale_client.status_code == 409, stale_client.text
        assert stale_client.json()["code"] == "SESSION_CONFLICT"

        baseline = await client.post(
            "/learner/v1/runs",
            headers={"Idempotency-Key": "personalized-baseline-run"},
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
                    "evidence_count": 3,
                    "confidence_band": "medium",
                }
            },
        )
        assert baseline.status_code == 201, baseline.text
        async with get_engine().begin() as connection:
            await connection.execute(
                tables.workflow_runs.update()
                .where(tables.workflow_runs.c.workflow_run_id == baseline.json()["workflow_run_id"])
                .values(state="completed", stage="completed", updated_at=datetime.now(UTC))
            )

        started = await client.post(
            f"/learner/v1/runs/personalized/{reading.json()['material_id']}",
            headers={"Idempotency-Key": "start-personalized-reading"},
            json={},
        )
        assert started.status_code == 201, started.text
        workspace = started.json()
        assert workspace["run"]["run_kind"] == "practice"
        assert workspace["run"]["stage"] == "matched_reading"
        assert workspace["task"]["task_type"] == "matched_reading"
        assert workspace["material"]["title"] == reading.json()["title"]
        assert workspace["material"]["question"]["question_type"] == "main_idea"
        assert '"hints"' not in started.text

        blocked_reading = await client.post("/learner/v1/training-materials/personalized")
        assert blocked_reading.status_code == 201, blocked_reading.text
        assert blocked_reading.json()["training_eligible"] is False
        assert blocked_reading.json()["start_block_reason"] == "active_training"

        refreshed_queue = await client.get("/learner/v1/training-materials")
        assert refreshed_queue.status_code == 200, refreshed_queue.text
        queue_by_id = {item["material_id"]: item for item in refreshed_queue.json()}
        assert queue_by_id[reading.json()["material_id"]]["training_eligible"] is True
        assert queue_by_id[reading.json()["material_id"]]["start_block_reason"] is None
        assert queue_by_id[blocked_reading.json()["material_id"]]["training_eligible"] is False
        assert (
            queue_by_id[blocked_reading.json()["material_id"]]["start_block_reason"]
            == "active_training"
        )

        task = workspace["task"]
        second_paragraph = workspace["material"]["paragraphs"][1]
        quote = second_paragraph["text"][:48]
        task_annotation = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/annotations",
            headers={"Idempotency-Key": "personalized-reading-annotation"},
            json={
                "expected_version": task["version"],
                "kind": "logic",
                "span": {
                    "paragraph_id": second_paragraph["paragraph_id"],
                    "start": 0,
                    "end": len(quote),
                    "text_quote": quote,
                    "text_hash": sha256(quote.encode()).hexdigest(),
                },
                "user_explanation": "This sentence carries the main logical contrast.",
            },
        )
        assert task_annotation.status_code == 200, task_annotation.text
        attempted = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/attempts",
            headers={"Idempotency-Key": "personalized-reading-v1"},
            json={
                "expected_version": task_annotation.json()["version"],
                "text": "Option A. The passage transfers familiar knowledge into a new context.",
                "independence": "independent",
            },
        )
        assert attempted.status_code == 200, attempted.text
        hinted = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/hints/h1",
            headers={"Idempotency-Key": "personalized-reading-h1"},
            json={
                "expected_version": attempted.json()["version"],
                "input_attempt_version_id": attempted.json()["attempts"][-1]["attempt_version_id"],
            },
        )
        assert hinted.status_code == 200, hinted.text
        assert hinted.json()["highest_hint_level"] == 1
        ended = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/end-early",
            headers={"Idempotency-Key": "personalized-reading-end"},
            json={"expected_version": hinted.json()["version"]},
        )
        assert ended.status_code == 200, ended.text
        advanced = await client.post(
            f"/learner/v1/runs/{workspace['run']['workflow_run_id']}/advance",
            headers={"Idempotency-Key": "personalized-reading-advance"},
            json={"expected_version": workspace["run"]["version"]},
        )
        assert advanced.status_code == 200, advanced.text
        assert advanced.json()["stage"] == "micro_expression"

        expression_workspace = await client.get(
            f"/learner/v1/runs/{workspace['run']['workflow_run_id']}/workspace"
        )
        expression_task = expression_workspace.json()["task"]
        expression_attempt = await client.post(
            f"/learner/v1/tasks/{expression_task['task_id']}/attempts",
            headers={"Idempotency-Key": "personalized-expression-v1"},
            json={
                "expected_version": expression_task["version"],
                "text": (
                    "A familiar rule becomes useful only when learners test it in a new context "
                    "and explain why it still applies."
                ),
                "independence": "independent",
            },
        )
        expression_completed = await client.post(
            f"/learner/v1/tasks/{expression_task['task_id']}/complete",
            headers={"Idempotency-Key": "personalized-expression-complete"},
            json={"expected_version": expression_attempt.json()["version"]},
        )
        assert expression_completed.status_code == 200, expression_completed.text
        wrapped = await client.post(
            f"/learner/v1/runs/{workspace['run']['workflow_run_id']}/advance",
            headers={"Idempotency-Key": "personalized-expression-advance"},
            json={"expected_version": advanced.json()["version"]},
        )
        feedback = await client.post(
            f"/learner/v1/runs/{workspace['run']['workflow_run_id']}/difficulty-feedback",
            headers={"Idempotency-Key": "personalized-reading-difficulty"},
            json={
                "expected_version": wrapped.json()["version"],
                "rating": "matched",
                "skipped": False,
            },
        )
        placeholder = await client.post(
            f"/learner/v1/runs/{workspace['run']['workflow_run_id']}/next-task-placeholder",
            headers={"Idempotency-Key": "personalized-reading-next"},
            json={
                "expected_version": feedback.json()["version"],
                "planned_task_type": "matched_reading",
                "reason_code": "continue_matched_practice",
            },
        )
        completed_run = await client.post(
            f"/learner/v1/runs/{workspace['run']['workflow_run_id']}/complete",
            headers={"Idempotency-Key": "personalized-reading-complete"},
            json={"expected_version": placeholder.json()["version"]},
        )
        assert completed_run.status_code == 200, completed_run.text

        annotation = await client.post(
            "/learner/v1/assets",
            json={
                "kind": "reading_skill",
                "title": "个性化阅读标注",
                "tags": ["personalized-reading", "annotation"],
                "source_type": "annotation",
                "source_title": reading.json()["title"],
                "initial_content": "> the main claim\n\n这里需要区分让步信息与作者判断。",
            },
        )
        assert annotation.status_code == 201, annotation.text
        completed_materials = await client.get("/learner/v1/training-materials")
        completed_by_id = {item["material_id"]: item for item in completed_materials.json()}
        assert completed_by_id[reading.json()["material_id"]]["status"] == "completed"
        pending_again = await client.get(
            f"/learner/v1/obsidian-sync/{connection_id}/exports", headers=headers
        )
        assert any(
            item["asset_id"] == annotation.json()["asset_id"] for item in pending_again.json()
        )
