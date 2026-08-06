from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path

import httpx2
import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_agent.workflows import GRAPH_VERSION, stable_thread_id
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.main import create_app
from binnagent_api.model_adapters import PersonalizedReadingOutput
from binnagent_api.personalized_material_service import (
    enqueue_legacy_personalized_material_upgrade,
    process_personalized_material,
)
from binnagent_api.vertical_slice import tables

pytestmark = pytest.mark.integration
CONTROL_HEADERS = {"X-BinnAgent-Control-Role": "developer_reviewer"}


@pytest_asyncio.fixture(autouse=True)
async def clean_content_generation_jobs() -> AsyncIterator[None]:
    async with get_engine().begin() as connection:
        await connection.execute(
            sa.delete(tables.obsidian_learning_context).where(
                tables.obsidian_learning_context.c.connection_id == "connection_control_test"
            )
        )
        await connection.execute(sa.delete(tables.model_invocation_ledger))
        await connection.execute(sa.delete(tables.content_worker_runtime))
        await connection.execute(sa.delete(tables.content_generation_jobs))
        await connection.execute(sa.delete(tables.personalized_material_events))
        await connection.execute(sa.delete(tables.personalized_training_materials))
    yield
    async with get_engine().begin() as connection:
        await connection.execute(
            sa.delete(tables.obsidian_learning_context).where(
                tables.obsidian_learning_context.c.connection_id == "connection_control_test"
            )
        )
        await connection.execute(sa.delete(tables.model_invocation_ledger))
        await connection.execute(sa.delete(tables.content_worker_runtime))
        await connection.execute(sa.delete(tables.content_generation_jobs))
        await connection.execute(sa.delete(tables.personalized_material_events))
        await connection.execute(sa.delete(tables.personalized_training_materials))
    await dispose_engine()


@pytest.mark.asyncio
async def test_content_generation_api_requires_control_role() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/control/v1/content-generation/jobs", json={})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_content_generation_api_queues_and_lists_persistent_job() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/control/v1/content-generation/jobs",
            headers=CONTROL_HEADERS,
            json={"seed": 20260719},
        )
        listed = await client.get(
            "/control/v1/content-generation/jobs",
            headers=CONTROL_HEADERS,
        )
        duplicate = await client.post(
            "/control/v1/content-generation/jobs",
            headers=CONTROL_HEADERS,
            json={"seed": 20260720},
        )

    assert created.status_code == 202, created.text
    assert created.json()["status"] == "queued"
    assert created.json()["seed"] == 20260719
    assert listed.status_code == 200, listed.text
    assert listed.json()[0]["job_id"] == created.json()["job_id"]
    assert duplicate.status_code == 409


@pytest.mark.asyncio
async def test_content_job_detail_exposes_timeline_cancel_and_auditable_retry() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/control/v1/content-generation/jobs",
            headers=CONTROL_HEADERS,
            json={"seed": 73},
        )
        job_id = created.json()["job_id"]
        detail = await client.get(
            f"/control/v1/content-generation/jobs/{job_id}",
            headers=CONTROL_HEADERS,
        )
        cancelled = await client.post(
            f"/control/v1/content-generation/jobs/{job_id}/cancel",
            headers=CONTROL_HEADERS,
        )
        retried = await client.post(
            f"/control/v1/content-generation/jobs/{job_id}/retry",
            headers=CONTROL_HEADERS,
        )

    assert detail.status_code == 200, detail.text
    event_types = [event["event_type"] for event in detail.json()["events"]]
    assert event_types == ["job_queued"]
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "cancelled"
    assert retried.status_code == 202, retried.text
    assert retried.json()["job_id"] != job_id
    assert retried.json()["seed"] == 73


@pytest.mark.asyncio
async def test_content_control_status_reports_worker_model_and_langfuse(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.content_worker_runtime.insert().values(
                worker_id="content-worker-primary",
                state="idle",
                current_job_id=None,
                started_at=now,
                heartbeat_at=now,
            )
        )
    monkeypatch.setattr("binnagent_api.content_generation._url_reachable", lambda _url: True)

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/control/v1/content-generation/status",
            headers=CONTROL_HEADERS,
        )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["worker"]["online"] is True
    assert payload["model_provider"] in {"ollama", "deepseek", "longcat", "deterministic_fixture"}
    assert payload["langfuse"]["url"] == "http://localhost:3100"


@pytest.mark.asyncio
async def test_control_exposes_personalized_material_stage_and_failure_timeline() -> None:
    now = datetime.now(UTC)
    material_id = "training_material_control_failure"
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.obsidian_learning_context.insert(),
            [
                {
                    "context_id": "context_1",
                    "asset_id": "asset_context_1",
                    "learner_id": "learner_synthetic_local",
                    "connection_id": "connection_control_test",
                    "source_key": "BinnAgentX/Grammar/although.md",
                    "title": "Although 引导让步状语从句",
                    "asset_kind": "grammar",
                    "tags": ["让步", "从句"],
                    "excerpt": "Private excerpt must not reach the control cockpit.",
                    "content_hash": "1" * 64,
                    "source_modified_at": now,
                    "received_at": now,
                },
                {
                    "context_id": "context_2",
                    "asset_id": "asset_context_2",
                    "learner_id": "learner_synthetic_local",
                    "connection_id": "connection_control_test",
                    "source_key": "BinnAgentX/Reading/evidence.md",
                    "title": "证据与主张的关系",
                    "asset_kind": "reading",
                    "tags": ["证据"],
                    "excerpt": "A second private excerpt.",
                    "content_hash": "2" * 64,
                    "source_modified_at": now,
                    "received_at": now,
                },
            ],
        )
        await connection.execute(
            tables.personalized_training_materials.insert().values(
                material_id=material_id,
                learner_id="learner_synthetic_local",
                title="正在生成个性化阅读",
                paragraphs=[],
                focus_points=["目标: 复习让步结构"],
                source_context_ids=["context_1", "context_2"],
                status="generation_failed",
                generation_attempt_count=3,
                generation_error_code="ValueError:personalized_paragraph_duplicate",
                next_generation_attempt_at=None,
                claimed_by=None,
                lease_expires_at=None,
                requested_goal="复习让步结构",
                requested_kinds=["grammar"],
                evidence_target_asset_ids=[],
                quality_status="not_evaluated",
                quality_reports=[],
                objective_bundle={},
                question_bank=[],
                grammar_annotations=[],
                transfer_contract=None,
                expression_task=None,
                runtime_kind="explicit_state_machine",
                graph_thread_id=None,
                graph_version=None,
                started_at=None,
                completed_at=None,
                active_workflow_run_id=None,
                created_at=now,
                updated_at=now,
            )
        )
        await connection.execute(
            tables.personalized_material_events.insert().values(
                material_id=material_id,
                event_type="generation_failed",
                stage="generation_failed",
                attempt=3,
                message="个性化材料生成失败, 已达到最大尝试次数",
                detail={"error_code": "ValueError:personalized_paragraph_duplicate"},
                occurred_at=now,
            )
        )

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        listed = await client.get(
            "/control/v1/content-generation/personalized-jobs",
            headers=CONTROL_HEADERS,
        )
        listed_item = listed.json()["items"][0]
        filtered = await client.get(
            "/control/v1/content-generation/personalized-jobs",
            params={"query": listed_item["owner_ref"], "page": 1, "page_size": 1},
            headers=CONTROL_HEADERS,
        )
        detail = await client.get(
            f"/control/v1/content-generation/personalized-jobs/{material_id}",
            headers=CONTROL_HEADERS,
        )
        status_response = await client.get(
            "/control/v1/content-generation/status",
            headers=CONTROL_HEADERS,
        )

    assert listed.status_code == 200, listed.text
    assert listed.json()["total_items"] == 1
    assert listed.json()["total_pages"] == 1
    assert listed_item["generation_error_code"].endswith("paragraph_duplicate")
    assert listed_item["owner_ref"].startswith("owner_")
    assert "learner_id" not in listed_item
    assert "title" not in listed_item
    assert "requested_goal" not in listed_item
    assert filtered.status_code == 200, filtered.text
    assert filtered.json()["items"][0]["material_id"] == material_id
    assert filtered.json()["page_size"] == 1
    assert detail.status_code == 200, detail.text
    detail_payload = detail.json()
    assert detail_payload["events"][0]["stage"] == "generation_failed"
    assert [item["title"] for item in detail_payload["candidate_knowledge_points"]] == [
        "Although 引导让步状语从句",
        "证据与主张的关系",
    ]
    assert detail_payload["candidate_knowledge_points"][0]["kind"] == "grammar"
    assert detail_payload["candidate_knowledge_points"][0]["candidate_ref"].startswith("candidate_")
    assert "context_1" not in detail.text
    assert "Private excerpt" not in detail.text
    assert status_response.json()["personalized_failed_count"] == 1


@pytest.mark.asyncio
async def test_control_resumes_failed_personalized_material_from_same_checkpoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    now = datetime.now(UTC)
    material_id = "training_material_checkpoint_recovery"
    thread_id = stable_thread_id("personalized-content", material_id)
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.obsidian_learning_context.insert().values(
                context_id="context_checkpoint_recovery",
                asset_id="asset_checkpoint_recovery",
                learner_id="learner_synthetic_local",
                connection_id="connection_control_test",
                source_key="BinnAgentX/Grammar/recovery.md",
                title="Checkpoint recovery candidate",
                asset_kind="grammar",
                tags=["recovery"],
                excerpt="Although a node can fail, its checkpoint can preserve prior work.",
                content_hash="3" * 64,
                source_modified_at=now,
                received_at=now,
            )
        )
        await connection.execute(
            tables.personalized_training_materials.insert().values(
                material_id=material_id,
                learner_id="learner_synthetic_local",
                title="正在生成个性化阅读",
                paragraphs=[],
                focus_points=["目标: 验证失败节点恢复"],
                source_context_ids=["context_checkpoint_recovery"],
                source_kind="agent_generated",
                status="requested",
                generation_attempt_count=0,
                generation_error_code=None,
                next_generation_attempt_at=now,
                claimed_by=None,
                lease_expires_at=None,
                requested_goal="验证失败节点恢复",
                requested_kinds=["grammar"],
                evidence_target_asset_ids=[],
                quality_status="not_evaluated",
                quality_reports=[],
                objective_bundle={},
                question_bank=[],
                grammar_annotations=[],
                transfer_contract=None,
                expression_task=None,
                runtime_kind="langgraph",
                graph_thread_id=thread_id,
                graph_version=GRAPH_VERSION,
                started_at=None,
                completed_at=None,
                active_workflow_run_id=None,
                created_at=now,
                updated_at=now,
            )
        )

    async def fail_generation(*_args: object, **_kwargs: object) -> object:
        raise RuntimeError("provider unavailable until operator intervention")

    monkeypatch.setattr(
        "binnagent_api.personalized_material_service.generate_personalized_reading",
        fail_generation,
    )
    for attempt in range(1, 4):
        assert await process_personalized_material(material_id) == (
            "generation_failed" if attempt == 3 else "requested"
        )
        if attempt < 3:
            async with get_engine().begin() as connection:
                await connection.execute(
                    tables.personalized_training_materials.update()
                    .where(tables.personalized_training_materials.c.material_id == material_id)
                    .values(next_generation_attempt_at=datetime.now(UTC))
                )

    async with get_engine().connect() as connection:
        failed_thread_id = await connection.scalar(
            sa.select(tables.personalized_training_materials.c.graph_thread_id).where(
                tables.personalized_training_materials.c.material_id == material_id
            )
        )
    assert failed_thread_id == thread_id

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        failed_detail = await client.get(
            f"/control/v1/content-generation/personalized-jobs/{material_id}",
            headers=CONTROL_HEADERS,
        )
        resumed = await client.post(
            f"/control/v1/content-generation/personalized-jobs/{material_id}/resume",
            headers=CONTROL_HEADERS,
            json={"reason": "模型服务已恢复, 继续失败节点"},
        )
    assert failed_detail.status_code == 200, failed_detail.text
    assert failed_detail.json()["events"][0]["detail"]["failed_node"] == "article"
    assert failed_detail.json()["events"][0]["detail"]["recovery_mode"] == (
        "human_checkpoint_resume"
    )
    assert resumed.status_code == 202, resumed.text
    assert resumed.json()["status"] == "requested"
    assert resumed.json()["generation_attempt_count"] == 0
    assert resumed.json()["can_resume_from_checkpoint"] is False

    async def recover_generation(*_args: object, **_kwargs: object) -> PersonalizedReadingOutput:
        return PersonalizedReadingOutput(
            title="A Recoverable Workflow",
            paragraphs=[
                "A durable workflow keeps completed work before a failed node.",
                "Although the provider failed earlier, the saved checkpoint allows the same "
                "node to continue after an operator fixes the service.",
                "The remaining validation and publishing steps can then finish normally.",
            ],
            focus_points=["checkpoint recovery"],
            source_titles=["Checkpoint recovery candidate"],
        )

    monkeypatch.setattr(
        "binnagent_api.personalized_material_service.generate_personalized_reading",
        recover_generation,
    )
    assert await process_personalized_material(material_id) == "ready"
    async with get_engine().connect() as connection:
        completed = (
            (
                await connection.execute(
                    sa.select(tables.personalized_training_materials).where(
                        tables.personalized_training_materials.c.material_id == material_id
                    )
                )
            )
            .mappings()
            .one()
        )
        event_types = set(
            (
                await connection.execute(
                    sa.select(tables.personalized_material_events.c.event_type).where(
                        tables.personalized_material_events.c.material_id == material_id
                    )
                )
            ).scalars()
        )
    assert completed["status"] == "ready"
    assert completed["graph_thread_id"] == thread_id
    assert "human_checkpoint_resume_requested" in event_types
    assert "checkpoint_resume_started" in event_types


@pytest.mark.asyncio
async def test_worker_upgrades_legacy_material_without_exposing_it_to_control() -> None:
    now = datetime.now(UTC)
    material_id = "training_material_legacy_review"
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.personalized_training_materials.insert().values(
                material_id=material_id,
                learner_id="learner_synthetic_local",
                title="Legacy Reading",
                paragraphs=["A legacy article exists without its complete learning package."],
                focus_points=["让步结构"],
                source_context_ids=["context_1"],
                status="ready",
                generation_attempt_count=1,
                generation_error_code=None,
                next_generation_attempt_at=None,
                claimed_by=None,
                lease_expires_at=None,
                requested_goal="复习让步结构",
                requested_kinds=["grammar"],
                evidence_target_asset_ids=[],
                quality_status="unverified_legacy",
                quality_reports=[],
                objective_bundle={},
                question_bank=[],
                grammar_annotations=[],
                transfer_contract=None,
                expression_task=None,
                runtime_kind="explicit_state_machine",
                graph_thread_id=None,
                graph_version=None,
                started_at=now,
                completed_at=now,
                active_workflow_run_id=None,
                created_at=now,
                updated_at=now,
            )
        )

    assert await enqueue_legacy_personalized_material_upgrade() is True

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        hidden_queue = await client.get(
            "/control/v1/personalized-content/reviews",
            headers=CONTROL_HEADERS,
        )

    assert hidden_queue.status_code == 404
    async with get_engine().connect() as connection:
        upgraded = (
            (
                await connection.execute(
                    sa.select(tables.personalized_training_materials).where(
                        tables.personalized_training_materials.c.material_id == material_id
                    )
                )
            )
            .mappings()
            .one()
        )
        event = (
            (
                await connection.execute(
                    sa.select(tables.personalized_material_events).where(
                        tables.personalized_material_events.c.material_id == material_id
                    )
                )
            )
            .mappings()
            .one()
        )
    assert upgraded["status"] == "requested"
    assert upgraded["runtime_kind"] == "langgraph"
    assert upgraded["quality_status"] == "not_evaluated"
    assert upgraded["question_bank"] == []
    assert upgraded["graph_thread_id"]
    assert event["event_type"] == "legacy_regeneration_requested"
    assert event["detail"]["reviewer_id"] == "system_personalized_material_migration"

    previous_thread_id = str(upgraded["graph_thread_id"])
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.personalized_training_materials.update()
            .where(tables.personalized_training_materials.c.material_id == material_id)
            .values(
                status="rejected",
                quality_status="rejected",
                generation_error_code="automated_quality_review_rejected",
            )
        )
        await connection.execute(
            tables.model_invocation_ledger.insert().values(
                invocation_key="a" * 64,
                tool_name="personalized_reading.generate",
                workflow_run_id=material_id,
                task_id=material_id,
                request_hash="b" * 64,
                status="pending",
                response_payload=None,
                output_hash=None,
                created_at=now,
                updated_at=now,
            )
        )
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        retried = await client.post(f"/learner/v1/training-materials/{material_id}/retry")

    assert retried.status_code == 202, retried.text
    assert retried.json()["status"] == "requested"
    assert retried.json()["quality_status"] == "not_evaluated"
    async with get_engine().connect() as connection:
        retry_row = (
            (
                await connection.execute(
                    sa.select(tables.personalized_training_materials).where(
                        tables.personalized_training_materials.c.material_id == material_id
                    )
                )
            )
            .mappings()
            .one()
        )
    assert retry_row["graph_thread_id"] != previous_thread_id
    assert retry_row["generation_error_code"] is None
    async with get_engine().connect() as connection:
        cached_invocations = await connection.scalar(
            sa.select(sa.func.count())
            .select_from(tables.model_invocation_ledger)
            .where(tables.model_invocation_ledger.c.workflow_run_id == material_id)
        )
    assert cached_invocations == 0


@pytest.mark.asyncio
async def test_content_generation_api_publishes_only_reviewed_generated_job(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    now = datetime.now(UTC)
    job_id = "content_job_publish_test"
    values = {
        "job_id": job_id,
        "status": "generated",
        "seed": 42,
        "pack_id": "agent_content_test_publish",
        "pack_version": "v1",
        "output_directory": str(tmp_path),
        "manifest_path": str(tmp_path / "manifest.json"),
        "item_count": 6,
        "agent_reviewed_count": 6,
        "validation_errors": [],
        "requested_by_role": "developer_reviewer",
        "published_by_role": None,
        "created_at": now,
        "started_at": now,
        "completed_at": now,
        "published_at": None,
    }
    async with get_engine().begin() as connection:
        await connection.execute(tables.content_generation_jobs.insert().values(**values))

    class FakePublisher:
        def publish(self, source_manifest: Path, *, job_id: str) -> Path:
            assert source_manifest == tmp_path / "manifest.json"
            assert job_id == "content_job_publish_test"
            return tmp_path / "active.json"

        def active_job_id(self) -> str | None:
            return None

    monkeypatch.setattr("binnagent_api.content_generation._publisher", lambda: FakePublisher())

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/control/v1/content-generation/jobs/{job_id}/publish",
            headers=CONTROL_HEADERS,
        )

    assert response.status_code == 200, response.text
    assert response.json()["is_active"] is True
    assert response.json()["published_at"] is not None
