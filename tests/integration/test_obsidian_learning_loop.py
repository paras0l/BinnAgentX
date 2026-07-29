from collections.abc import AsyncIterator, Awaitable, Callable, Sequence
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import cast

import httpx2
import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_agent.agents.obsidian_inbox_organizer import (
    InboxAdapterResult,
    InboxClassificationOutput,
    InboxNote,
)
from binnagent_api import knowledge_organization_service, obsidian_organizer
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.knowledge_organization_service import (
    process_next_knowledge_organization,
)
from binnagent_api.main import create_app
from binnagent_api.model_adapters import PersonalizedReadingOutput
from binnagent_api.obsidian_organizer import enqueue_login_organization
from binnagent_api.personalized_material_service import (
    enqueue_due_personalized_material,
    process_personalized_material,
)
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables
from binnagent_domain.learning.content_quality import QualityReport, SourceSpan
from binnagent_domain.learning.knowledge_organization import (
    AtomicKnowledgeCandidate,
    CandidateValidationStatus,
    KnowledgeKind,
)
from binnagent_worker.asset_exporter import process_next_asset_export

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_structured_reading_capture_is_gated_and_enters_existing_organization_chain() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/learner/v1/assets",
            json={
                "kind": "reading_skill",
                "title": "主句承载作者判断",
                "source_type": "annotation",
                "source_task_id": "task_structured_capture",
                "capture": {
                    "schema_version": "learning-asset-capture/v1",
                    "segments": [
                        {
                            "segment_id": "quote",
                            "role": "source_quote",
                            "content": "The main clause carries the writer's claim.",
                            "origin": "source",
                        },
                        {
                            "segment_id": "learner",
                            "role": "learner_interpretation",
                            "content": (
                                "The concession is background; the main clause is the claim."
                            ),
                            "origin": "learner",
                        },
                        {
                            "segment_id": "ui-note",
                            "role": "next_check",
                            "content": "训练中主动记录的思考笔记。",
                            "origin": "agent",
                        },
                    ],
                },
            },
        )
        assert created.status_code == 201, created.text
        asset_id = created.json()["asset_id"]
        assert created.json()["sync_status"] == "pending_export"
        assert created.json()["next_review_at"] is not None

        async with get_engine().connect() as connection:
            message = (
                (
                    await connection.execute(
                        sa.select(tables.outbox_messages).where(
                            tables.outbox_messages.c.aggregate_id == asset_id
                        )
                    )
                )
                .mappings()
                .one()
            )
            source = (
                (
                    await connection.execute(
                        sa.select(tables.knowledge_source_records).where(
                            tables.knowledge_source_records.c.source_key == f"asset:{asset_id}"
                        )
                    )
                )
                .mappings()
                .one()
            )
            run = (
                (
                    await connection.execute(
                        sa.select(tables.obsidian_organizer_runs).where(
                            tables.obsidian_organizer_runs.c.trigger_key
                            == f"asset_capture:{asset_id}"
                        )
                    )
                )
                .mappings()
                .one()
            )
        assert message["payload"]["write_decision"]["decision"] == "KEEP"
        assert "capture" not in message["payload"]
        assert message["payload"]["capture_source_record_id"] == source["source_record_id"]
        assert message["status"] == "denoising"
        assert source["provider"] == "learning_asset_capture"
        assert run["knowledge_status"] == "extracting"

        assert await process_next_asset_export() is True
        async with get_engine().connect() as connection:
            refined_message = (
                (
                    await connection.execute(
                        sa.select(tables.outbox_messages).where(
                            tables.outbox_messages.c.aggregate_id == asset_id
                        )
                    )
                )
                .mappings()
                .one()
            )
        refined_payload = refined_message["payload"]
        assert refined_message["status"] == "pending"
        assert refined_payload["write_gate_version"] == "learning-asset-write-gate-v1"
        assert "## 原文证据" in refined_payload["initial_content"]
        assert "## 我的解释" in refined_payload["initial_content"]

        comparison = await client.get(f"/learner/v1/assets/{asset_id}/denoise-comparison")
        assert comparison.status_code == 200, comparison.text
        assert comparison.json()["status"] == "ready"
        assert comparison.json()["raw_content"] != comparison.json()["denoised_content"]
        assert comparison.json()["retained_segment_ids"] == ["quote", "learner"]

        assert await process_next_knowledge_organization() is True
        async with get_engine().connect() as connection:
            organized_run = (
                (
                    await connection.execute(
                        sa.select(tables.obsidian_organizer_runs).where(
                            tables.obsidian_organizer_runs.c.trigger_key
                            == f"asset_capture:{asset_id}"
                        )
                    )
                )
                .mappings()
                .one()
            )
            proposal_count = await connection.scalar(
                sa.select(sa.func.count())
                .select_from(tables.knowledge_change_proposals)
                .where(tables.knowledge_change_proposals.c.run_id == organized_run["run_id"])
            )
        assert organized_run["knowledge_status"] == "awaiting_review"
        assert proposal_count is not None
        assert proposal_count >= 1


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
            tables.learner_level_assessments,
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
            tables.reading_evidence_snapshots,
            tables.personalized_material_events,
            tables.personalized_training_materials,
            tables.model_invocation_ledger,
            tables.workflow_runs,
            tables.learner_profile_snapshots,
            tables.idempotency_records,
            tables.agent_memory_events,
            tables.learner_grammar_states,
            tables.grammar_learning_evidence,
            tables.learning_evidence,
            tables.agent_working_memory,
            tables.knowledge_relations,
            tables.knowledge_change_proposals,
            tables.atomic_knowledge_candidates,
            tables.learning_asset_content_projections,
            tables.knowledge_source_payloads,
            tables.knowledge_source_records,
            tables.obsidian_organizer_runs,
            tables.obsidian_learning_context,
            tables.obsidian_sync_connections,
            tables.outbox_messages,
            tables.learning_asset_index,
        ):
            await connection.execute(sa.delete(table))


def _reviewed_package_values(
    material_id: str,
    paragraphs: list[str],
) -> dict[str, object]:
    objective_bundle_id = f"objective_{material_id}"
    reading_artifact_id = f"article_{material_id}"
    transfer_contract_id = f"transfer_{material_id}"
    return {
        "quality_status": "semantic_reviewed",
        "quality_reports": [
            {
                "report_id": f"review_{material_id}",
                "artifact_id": reading_artifact_id,
                "validator_id": "integration_human_reviewer",
                "validator_version": "v1",
                "result": "pass",
                "issue_code": None,
                "severity": "info",
                "evidence_refs": [],
                "repair_scope": [],
                "confidence": 1.0,
            }
        ],
        "objective_bundle": {
            "objective_bundle_id": objective_bundle_id,
            "learner_id": "learner_local_default",
            "source_asset_ids": ["asset_fixture"],
            "target_discourse_moves": ["concession"],
            "reading_skill_targets": ["main_idea"],
            "difficulty_constraints": {
                "lexical_band": "developing",
                "syntax_band": "developing",
                "discourse_band": "developing",
                "estimated_minutes": 12,
            },
            "required_evidence": [
                {
                    "target_id": "concession",
                    "evidence_kind": "discourse",
                    "minimum_occurrences": 1,
                }
            ],
            "version": 1,
        },
        "question_bank": [
            {
                "question_id": f"{material_id}_main_idea",
                "question_type": "main_idea",
                "difficulty_tier": "standard",
                "prompt": "Which statement best captures how the passage treats prior knowledge?",
                "options": [
                    {
                        "option_id": "option_a",
                        "text": "It recommends discarding every earlier rule.",
                        "error_mechanism": "reverses_the_article_claim",
                    },
                    {
                        "option_id": "option_b",
                        "text": "It argues for testing familiar knowledge in a new context.",
                    },
                    {
                        "option_id": "option_c",
                        "text": "It describes a personal timetable without making a claim.",
                        "error_mechanism": "introduces_an_unmentioned_topic",
                    },
                    {
                        "option_id": "option_d",
                        "text": "It says that isolated memorization always guarantees transfer.",
                        "error_mechanism": "overstates_the_rejected_view",
                    },
                ],
                "answer_option_id": "option_b",
                "answer_evidence": [
                    {
                        "paragraph_id": "personalized_p_03",
                        "start": 0,
                        "end": min(80, len(paragraphs[2])),
                        "text_quote": paragraphs[2][:80],
                    }
                ],
                "solver_trace_ref": f"human_solver_{material_id}",
                "hints": {
                    "h1": "先概括每一段的作用, 再寻找能覆盖全文的选项。",
                    "h2": "比较文章对 remembered rule 和 new situation 的关系。",
                    "h3": "排除与原文方向相反或引入无关主题的选项。",
                    "h4": "回到末段, 确认作者如何描述 transfer。",
                },
            }
        ],
        "grammar_annotations": [
            {
                "challenge_id": f"{material_id}_concession",
                "paragraph_id": "personalized_p_02",
                "correct_text": "Although",
                "incorrect_text": "Whenever",
                "error_type": "让步连接词与主从句逻辑",
                "hint": "确认前半句是承认既有情况, 还是表示每当某事发生。",
                "provider_ref": "integration_human_review",
                "confidence": 1.0,
            }
        ],
        "transfer_contract": {
            "transfer_contract_id": transfer_contract_id,
            "objective_bundle_id": objective_bundle_id,
            "source_reading_artifact_id": reading_artifact_id,
            "required_transfer_targets": ["concession"],
            "reading_evidence_refs": [f"{material_id}_main_idea"],
            "novel_context_constraints": ["Use a study-planning context."],
            "success_criteria": ["Use a concession before a distinct main claim."],
            "delayed_validation_plan": "Retest in an unfamiliar context after seven days.",
            "version": 1,
        },
        "expression_task": {
            "content_type": "micro_expression",
            "objective_bundle_id": objective_bundle_id,
            "transfer_contract_id": transfer_contract_id,
            "title": "Transfer the concession into a study decision",
            "situation": (
                "A study group has a familiar plan, but new evidence suggests one limitation. "
                "State a decision that acknowledges the old plan before making a new claim."
            ),
            "audience": "Your study group",
            "purpose": "Make a qualified recommendation",
            "target_argument_move": "concession",
            "optional_active_resource": "Although ..., the main claim ...",
            "forbidden_mechanical_use": ["Do not copy a sentence from the reading."],
            "output_requirement": {
                "sentence_min": 2,
                "sentence_max": 3,
                "word_min": 25,
                "word_max": 70,
                "language": "English",
            },
            "v1_minimum": [
                "Acknowledge the earlier plan.",
                "Make a distinct recommendation in the main clause.",
            ],
            "required_target_ids": ["concession"],
            "reading_evidence_refs": [f"{material_id}_main_idea"],
        },
    }


@pytest.mark.asyncio
async def test_personalized_material_requires_matching_obsidian_context() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/learner/v1/training-materials/personalized")

    assert response.status_code == 409
    assert response.json()["code"] == "OBSIDIAN_CONTEXT_REQUIRED"
    assert response.json()["reason"] == "obsidian_context_required"


@pytest.mark.asyncio
async def test_organizer_captures_atomic_source_and_requires_review_before_commit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    transport = httpx2.ASGITransport(app=create_app())
    content = "Although introduces a concession. The main clause carries the writer's claim."
    content_hash = sha256(content.encode()).hexdigest()
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        paired = await client.post("/learner/v1/assets/obsidian-plugin-connections")
        connection_id = paired.json()["connection_id"]
        plugin_headers = {"Authorization": f"Bearer {paired.json()['sync_secret']}"}
        queued = await client.post("/learner/v1/assets/obsidian-organizer-runs")
        assert queued.status_code == 202, queued.text

        imported = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/import",
            headers=plugin_headers,
            json={
                "schema_version": "learning-context/v1",
                "vault_name": "bin01",
                "entries": [
                    {
                        "source_key": "BinnAgentX/00-Inbox/concession.md",
                        "title": "Concession note",
                        "kind": "grammar",
                        "tags": ["grammar"],
                        "excerpt": "Although introduces a concession.",
                        "modified_at": datetime.now(UTC).isoformat(),
                        "authorized_content": {
                            "scope_prefix": "BinnAgentX/00-Inbox/",
                            "content": content,
                            "content_hash": content_hash,
                        },
                    }
                ],
            },
        )
        assert imported.status_code == 200, imported.text
        assert imported.json()["organization"]["knowledge_status"] == "extracting"
        organizer_run_id = imported.json()["organization"]["run_id"]

        async def extract_fixture(
            source_rows: list[sa.RowMapping],
        ) -> tuple[AtomicKnowledgeCandidate, ...]:
            source = source_rows[0]
            return (
                AtomicKnowledgeCandidate(
                    candidate_id="knowledge_candidate_fixture_001",
                    source_record_id=str(source["source_record_id"]),
                    knowledge_kind=KnowledgeKind.GRAMMAR,
                    canonical_key="grammar:concession:although",
                    title="Although concession",
                    claim="Although introduces a concession before the main claim.",
                    source_spans=(
                        SourceSpan(
                            source_id=str(source["source_record_id"]),
                            source_version=content_hash,
                            start=0,
                            end=34,
                            text_quote="Although introduces a concession.",
                        ),
                    ),
                    confidence=0.96,
                    validation_status=CandidateValidationStatus.CANDIDATE,
                    extractor_version="integration-fixture-v1",
                ),
                AtomicKnowledgeCandidate(
                    candidate_id="knowledge_candidate_fixture_002",
                    source_record_id=str(source["source_record_id"]),
                    knowledge_kind=KnowledgeKind.READING_SKILL,
                    canonical_key="reading:main-clause:claim",
                    title="Locate the main claim",
                    claim="The main clause carries the writer's claim.",
                    source_spans=(
                        SourceSpan(
                            source_id=str(source["source_record_id"]),
                            source_version=content_hash,
                            start=35,
                            end=78,
                            text_quote="The main clause carries the writer's claim.",
                        ),
                    ),
                    confidence=0.94,
                    validation_status=CandidateValidationStatus.CANDIDATE,
                    extractor_version="integration-fixture-v1",
                ),
            )

        monkeypatch.setattr(
            knowledge_organization_service,
            "_extract_sources",
            extract_fixture,
        )
        async with get_engine().begin() as connection:
            await connection.execute(
                tables.obsidian_organizer_runs.update()
                .where(tables.obsidian_organizer_runs.c.run_id == organizer_run_id)
                .values(
                    knowledge_status="matching",
                    knowledge_claimed_by="terminated-worker",
                    knowledge_lease_expires_at=datetime.now(UTC) - timedelta(seconds=1),
                )
            )
        assert await process_next_knowledge_organization() is True

        control_headers = {"X-BinnAgent-Control-Role": "developer_reviewer"}
        proposals = await client.get(
            "/control/v1/knowledge-organization/proposals",
            headers=control_headers,
        )
        assert proposals.status_code == 200, proposals.text
        assert len(proposals.json()) == 2
        proposal = next(
            item
            for item in proposals.json()
            if item["canonical_key"] == "clause.adverbial.concession.although.v1"
        )
        second_proposal = next(
            item
            for item in proposals.json()
            if item["canonical_key"] == "reading:main-clause:claim"
        )
        assert proposal["action"] == "CREATE"
        assert proposal["canonical_key"] == "clause.adverbial.concession.although.v1"

        reviewed = await client.post(
            f"/control/v1/knowledge-organization/proposals/{proposal['proposal_id']}/review",
            headers=control_headers,
            json={"action": "approve"},
        )
        assert reviewed.status_code == 200, reviewed.text
        assert reviewed.json()["status"] == "approved"
        async with get_engine().connect() as connection:
            assert (
                await connection.scalar(
                    sa.select(tables.obsidian_organizer_runs.c.knowledge_status).where(
                        tables.obsidian_organizer_runs.c.run_id == organizer_run_id
                    )
                )
                == "awaiting_review"
            )
        rejected = await client.post(
            f"/control/v1/knowledge-organization/proposals/{second_proposal['proposal_id']}/review",
            headers=control_headers,
            json={"action": "reject"},
        )
        assert rejected.status_code == 200, rejected.text
        assert rejected.json()["status"] == "rejected"
        async with get_engine().connect() as connection:
            run_state = (
                (
                    await connection.execute(
                        sa.select(tables.obsidian_organizer_runs).where(
                            tables.obsidian_organizer_runs.c.run_id == organizer_run_id
                        )
                    )
                )
                .mappings()
                .one()
            )
        assert run_state["knowledge_status"] == "validation_scheduled"
        assert run_state["knowledge_claimed_by"] is None
        assert run_state["knowledge_lease_expires_at"] is None

        assets = await client.get("/learner/v1/assets")
        created = next(item for item in assets.json() if item["title"] == "Although concession")
        assert created["sync_status"] == "pending_export"
        pending_exports = await client.get(
            f"/learner/v1/obsidian-sync/{connection_id}/exports",
            headers=plugin_headers,
        )
        exported = next(
            item for item in pending_exports.json() if item["asset_id"] == created["asset_id"]
        )
        assert "source_record:" in exported["initial_content"]

        async with get_engine().connect() as connection:
            assert (
                await connection.scalar(
                    sa.select(sa.func.count()).select_from(tables.knowledge_source_records)
                )
                == 1
            )
            relation = (
                (await connection.execute(sa.select(tables.knowledge_relations))).mappings().one()
            )
        assert relation["relation_type"] == "DERIVED_FROM"


@pytest.mark.asyncio
async def test_knowledge_organizer_real_graph_create_merge_and_replay() -> None:
    """Acceptance path uses real Postgres checkpoints and the offline model adapter."""

    transport = httpx2.ASGITransport(app=create_app())
    first_content = (
        "Although this clause marks a concession before independent evidence appears clearly."
    )
    second_content = (
        "Although this clause marks a concession before independent evidence changes unexpectedly."
    )
    control_headers = {"X-BinnAgent-Control-Role": "developer_reviewer"}
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        paired = await client.post("/learner/v1/assets/obsidian-plugin-connections")
        connection_id = paired.json()["connection_id"]
        plugin_headers = {"Authorization": f"Bearer {paired.json()['sync_secret']}"}

        async def organize(source_key: str, content: str) -> dict[str, object]:
            queued = await client.post("/learner/v1/assets/obsidian-organizer-runs")
            assert queued.status_code == 202, queued.text
            import_body = {
                "schema_version": "learning-context/v1",
                "vault_name": "bin01",
                "entries": [
                    {
                        "source_key": source_key,
                        "title": "Grammar concession evidence",
                        "kind": "grammar",
                        "tags": ["grammar"],
                        "excerpt": content,
                        "modified_at": datetime.now(UTC).isoformat(),
                        "authorized_content": {
                            "scope_prefix": "BinnAgentX/00-Inbox/",
                            "content": content,
                            "content_hash": sha256(content.encode()).hexdigest(),
                        },
                    }
                ],
            }
            imported = await client.post(
                f"/learner/v1/obsidian-sync/{connection_id}/import",
                headers=plugin_headers,
                json=import_body,
            )
            assert imported.status_code == 200, imported.text
            assert imported.json()["organization"]["status"] == "queued"
            run_id = imported.json()["organization"]["run_id"]
            assert await process_next_knowledge_organization() is True
            proposals = await client.get(
                "/control/v1/knowledge-organization/proposals",
                headers=control_headers,
            )
            assert proposals.status_code == 200, proposals.text
            assert len(proposals.json()) == 1
            proposal = proposals.json()[0]
            reviewed = await client.post(
                f"/control/v1/knowledge-organization/proposals/{proposal['proposal_id']}/review",
                headers=control_headers,
                json={"action": "approve"},
            )
            assert reviewed.status_code == 200, reviewed.text
            assert reviewed.json()["status"] == "committed"
            archive_plan_response = await client.post(
                f"/learner/v1/obsidian-sync/{connection_id}/import",
                headers=plugin_headers,
                json=import_body,
            )
            assert archive_plan_response.status_code == 200
            plan = archive_plan_response.json()["organization"]
            assert plan["run_id"] == run_id
            assert plan["status"] == "planned", plan
            completed_source_keys = {
                item["action_id"]: (
                    f"{item['target_folder']}/{source_key.rsplit('/', maxsplit=1)[-1]}"
                )
                for item in plan["actions"]
            }
            acknowledged = await client.post(
                f"/learner/v1/obsidian-sync/{connection_id}/organizer-runs/{run_id}/ack",
                headers=plugin_headers,
                json={
                    "completed_action_ids": list(completed_source_keys),
                    "completed_source_keys": completed_source_keys,
                },
            )
            assert acknowledged.status_code == 200, acknowledged.text
            return cast(dict[str, object], proposal)

        created_proposal = await organize(
            "BinnAgentX/00-Inbox/concession-create.md",
            first_content,
        )
        assert created_proposal["action"] == "CREATE"
        exports = await client.get(
            f"/learner/v1/obsidian-sync/{connection_id}/exports",
            headers=plugin_headers,
        )
        create_export = exports.json()[0]
        assert create_export["operation"] == "CREATE"
        asset_id = create_export["asset_id"]
        acknowledged_export = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/exports/{asset_id}/ack",
            headers=plugin_headers,
            json={
                "export_id": create_export["export_id"],
                "source_key": "BinnAgentX/02-Grammar/concession.md",
                "content_hash": "a" * 64,
                "modified_at": datetime.now(UTC).isoformat(),
                "vault_name": "bin01",
            },
        )
        assert acknowledged_export.status_code == 200, acknowledged_export.text

        merged_proposal = await organize(
            "BinnAgentX/00-Inbox/concession-merge.md",
            second_content,
        )
        assert merged_proposal["action"] == "MERGE"
        patch_exports = await client.get(
            f"/learner/v1/obsidian-sync/{connection_id}/exports",
            headers=plugin_headers,
        )
        assert len(patch_exports.json()) == 1
        patch = patch_exports.json()[0]
        assert patch["operation"] == "APPEND_PATCH"
        assert patch["expected_content_hash"] == "a" * 64
        assert patch["source_key"] == "BinnAgentX/02-Grammar/concession.md"
        assert merged_proposal["proposal_id"] in patch["patch_content"]

        repeated = await client.post(
            f"/control/v1/knowledge-organization/proposals/{merged_proposal['proposal_id']}/review",
            headers=control_headers,
            json={"action": "approve"},
        )
        assert repeated.status_code == 200, repeated.text
        assert repeated.json()["status"] == "committed"
        async with get_engine().connect() as connection:
            assert (
                await connection.scalar(
                    sa.select(sa.func.count())
                    .select_from(tables.outbox_messages)
                    .where(tables.outbox_messages.c.aggregate_id == asset_id)
                )
                == 2
            )
            assert (
                await connection.scalar(
                    sa.select(sa.func.count()).select_from(tables.model_invocation_ledger)
                )
                == 2
            )


@pytest.mark.asyncio
async def test_knowledge_organizer_retries_same_checkpoint_after_worker_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    transport = httpx2.ASGITransport(app=create_app())
    content = "Although introduces a concession before independent evidence."
    digest = sha256(content.encode()).hexdigest()
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        paired = await client.post("/learner/v1/assets/obsidian-plugin-connections")
        connection_id = paired.json()["connection_id"]
        headers = {"Authorization": f"Bearer {paired.json()['sync_secret']}"}
        await client.post("/learner/v1/assets/obsidian-organizer-runs")
        imported = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/import",
            headers=headers,
            json={
                "schema_version": "learning-context/v1",
                "vault_name": "bin01",
                "entries": [
                    {
                        "source_key": "BinnAgentX/00-Inbox/retry.md",
                        "title": "Grammar retry",
                        "kind": "grammar",
                        "tags": ["grammar"],
                        "excerpt": content,
                        "modified_at": datetime.now(UTC).isoformat(),
                        "authorized_content": {
                            "scope_prefix": "BinnAgentX/00-Inbox/",
                            "content": content,
                            "content_hash": digest,
                        },
                    }
                ],
            },
        )
        run_id = imported.json()["organization"]["run_id"]
        original_extract = cast(
            Callable[
                [Sequence[sa.RowMapping]],
                Awaitable[tuple[AtomicKnowledgeCandidate, ...]],
            ],
            knowledge_organization_service._extract_sources,
        )
        failed = False

        async def fail_once(
            source_rows: list[sa.RowMapping],
        ) -> tuple[AtomicKnowledgeCandidate, ...]:
            nonlocal failed
            if not failed:
                failed = True
                raise RuntimeError("injected_worker_exit")
            return await original_extract(source_rows)

        monkeypatch.setattr(
            knowledge_organization_service,
            "_extract_sources",
            fail_once,
        )
        assert await process_next_knowledge_organization() is True
        async with get_engine().connect() as connection:
            first_attempt = (
                (
                    await connection.execute(
                        sa.select(tables.obsidian_organizer_runs).where(
                            tables.obsidian_organizer_runs.c.run_id == run_id
                        )
                    )
                )
                .mappings()
                .one()
            )
        assert first_attempt["knowledge_status"] == "extracting"
        assert first_attempt["knowledge_attempt_count"] == 1
        assert await process_next_knowledge_organization() is True
        async with get_engine().connect() as connection:
            recovered = (
                (
                    await connection.execute(
                        sa.select(tables.obsidian_organizer_runs).where(
                            tables.obsidian_organizer_runs.c.run_id == run_id
                        )
                    )
                )
                .mappings()
                .one()
            )
        assert recovered["knowledge_status"] == "awaiting_review"
        assert recovered["knowledge_attempt_count"] == 2
        assert len(recovered["proposal_ids"]) == 1


@pytest.mark.asyncio
async def test_knowledge_organizer_empty_extraction_requests_more_context() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    content = "Note."
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        paired = await client.post("/learner/v1/assets/obsidian-plugin-connections")
        connection_id = paired.json()["connection_id"]
        headers = {"Authorization": f"Bearer {paired.json()['sync_secret']}"}
        await client.post("/learner/v1/assets/obsidian-organizer-runs")
        imported = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/import",
            headers=headers,
            json={
                "schema_version": "learning-context/v1",
                "vault_name": "bin01",
                "entries": [
                    {
                        "source_key": "BinnAgentX/00-Inbox/insufficient.md",
                        "title": "Insufficient grammar note",
                        "kind": "grammar",
                        "tags": ["grammar"],
                        "excerpt": content,
                        "modified_at": datetime.now(UTC).isoformat(),
                        "authorized_content": {
                            "scope_prefix": "BinnAgentX/00-Inbox/",
                            "content": content,
                            "content_hash": sha256(content.encode()).hexdigest(),
                        },
                    }
                ],
            },
        )
        run_id = imported.json()["organization"]["run_id"]
        assert await process_next_knowledge_organization() is True
        async with get_engine().connect() as connection:
            run = (
                (
                    await connection.execute(
                        sa.select(tables.obsidian_organizer_runs).where(
                            tables.obsidian_organizer_runs.c.run_id == run_id
                        )
                    )
                )
                .mappings()
                .one()
            )
            proposal_count = await connection.scalar(
                sa.select(sa.func.count())
                .select_from(tables.knowledge_change_proposals)
                .where(tables.knowledge_change_proposals.c.run_id == run_id)
            )
        assert run["knowledge_status"] == "needs_more_context"
        assert run["error_code"] == "atomic_extractor_returned_no_supported_claims"
        assert proposal_count == 0


@pytest.mark.asyncio
async def test_bidirectional_sync_personalized_reading_and_annotation_export(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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
        assert reading.status_code == 202, reading.text
        assert reading.json()["status"] == "requested"
        assert reading.json()["training_eligible"] is False
        assert reading.json()["start_block_reason"] == "material_not_ready"
        await process_personalized_material(reading.json()["material_id"])
        generated = await client.get("/learner/v1/training-materials")
        reading_payload = next(
            item
            for item in generated.json()
            if item["material_id"] == reading.json()["material_id"]
        )
        assert len(reading_payload["paragraphs"]) >= 3
        assert "Contrast and concession" in " ".join(reading_payload["focus_points"])
        assert reading_payload["status"] == "awaiting_review"
        assert reading_payload["quality_status"] == "semantic_review_required"
        assert reading_payload["training_eligible"] is False
        assert reading_payload["start_block_reason"] == "quality_review_required"
        reading = httpx2.Response(200, json=reading_payload)
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
            working_state = await connection.scalar(
                sa.select(tables.agent_working_memory.c.payload).where(
                    tables.agent_working_memory.c.learner_id == memory_event["learner_id"],
                    tables.agent_working_memory.c.agent_name == "personalized_reading.generate",
                )
            )
        assert memory_event["operation"] == "recall"
        assert len(memory_event["memory_ids"]) == 1
        assert isinstance(working_state, dict)
        assert working_state["last_material_id"] == reading.json()["material_id"]

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

        quality_blocked = await client.post(
            f"/learner/v1/runs/personalized/{reading.json()['material_id']}",
            headers={"Idempotency-Key": "start-unreviewed-personalized-reading"},
            json={},
        )
        assert quality_blocked.status_code == 422, quality_blocked.text
        assert quality_blocked.json()["code"] == "CONTENT_NOT_ELIGIBLE"
        assert (
            quality_blocked.json()["reason"]
            == "personalized_training_material_quality_review_required"
        )
        control_headers = {"X-BinnAgent-Control-Role": "developer_reviewer"}
        review_queue = await client.get(
            "/control/v1/personalized-content/reviews",
            headers=control_headers,
        )
        assert review_queue.status_code == 200, review_queue.text
        candidate = next(
            item
            for item in review_queue.json()
            if item["material_id"] == reading.json()["material_id"]
        )
        assert [item["correct_answer"] for item in candidate["question_bank"]] == [
            "B",
            "C",
            "A",
        ]
        for question in candidate["question_bank"]:
            evidence = question["minimum_evidence"]
            paragraph_index = int(evidence["paragraph_id"].removeprefix("personalized_p_")) - 1
            paragraph = candidate["paragraphs"][paragraph_index]
            assert paragraph[evidence["start"] : evidence["end"]] == evidence["text_quote"]
            assert all(
                option.get("error_mechanism")
                for option in question["options"]
                if option["option_id"] != question["correct_answer"]
            )
        assert candidate["grammar_annotations"][0]["analysis"]["status"] == "review_required"
        assert candidate["grammar_annotations"][0]["analysis"]["parser_id"] == (
            "model_candidate_unverified"
        )
        assert (
            candidate["transfer_contract"]["objective_bundle_id"]
            == (candidate["objective_bundle"]["objective_bundle_id"])
        )
        grammar_learner_id = candidate["objective_bundle"]["learner_id"]
        reviewed = await client.post(
            f"/control/v1/personalized-content/reviews/{reading.json()['material_id']}",
            headers=control_headers,
            json={
                "action": "approve",
                "reason": (
                    "人工复核通过: 三道题答案唯一且证据逐字命中, 干扰项机制明确; "
                    "让步结构候选与原文一致; 表达任务保持同一目标并切换到新语境。"
                ),
            },
        )
        assert reviewed.status_code == 200, reviewed.text
        assert reviewed.json()["status"] == "ready"
        assert reviewed.json()["quality_status"] == "semantic_reviewed"
        assert reviewed.json()["grammar_annotations"][0]["analysis"]["status"] == "resolved"
        assert reviewed.json()["grammar_annotations"][0]["review"]["reviewer_id"] == (
            "developer_reviewer"
        )
        reviewed_queue = await client.get("/learner/v1/training-materials")
        reading_payload = next(
            item
            for item in reviewed_queue.json()
            if item["material_id"] == reading.json()["material_id"]
        )
        reading = httpx2.Response(200, json=reading_payload)

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
        assert workspace["material"]["question"]["question_type"] == "detail_comprehension"
        assert workspace["material"]["question"]["options"][1]["option_id"] == "B"
        assert '"hints"' not in started.text

        blocked_reading = await client.post("/learner/v1/training-materials/personalized")
        assert blocked_reading.status_code == 202, blocked_reading.text
        await process_personalized_material(blocked_reading.json()["material_id"])
        blocked_queue = await client.get("/learner/v1/training-materials")
        blocked_payload = next(
            item
            for item in blocked_queue.json()
            if item["material_id"] == blocked_reading.json()["material_id"]
        )
        blocked_reviewed = await client.post(
            f"/control/v1/personalized-content/reviews/{blocked_reading.json()['material_id']}",
            headers=control_headers,
            json={
                "action": "approve",
                "reason": "人工复核通过: 证据、答案、语法候选和迁移任务均满足审核清单。",
            },
        )
        assert blocked_reviewed.status_code == 200, blocked_reviewed.text
        blocked_queue = await client.get("/learner/v1/training-materials")
        blocked_payload = next(
            item
            for item in blocked_queue.json()
            if item["material_id"] == blocked_reading.json()["material_id"]
        )
        blocked_reading = httpx2.Response(200, json=blocked_payload)
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
                "text": "Option B. The passage transfers familiar knowledge into a new context.",
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
        grammar_hint = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/grammar-challenge/hint"
        )
        assert grammar_hint.status_code == 200, grammar_hint.text
        async with get_engine().connect() as connection:
            reviewed_grammar = await connection.scalar(
                sa.select(tables.personalized_training_materials.c.grammar_annotations).where(
                    tables.personalized_training_materials.c.material_id
                    == reading.json()["material_id"]
                )
            )
        assert isinstance(reviewed_grammar, list)
        grammar_correction = reviewed_grammar[0]["correct_text"]
        grammar_verified = await client.post(
            f"/learner/v1/tasks/{task['task_id']}/grammar-challenge/verify",
            json={"correction": grammar_correction},
        )
        assert grammar_verified.status_code == 200, grammar_verified.text
        assert grammar_verified.json()["verification_correct"] is True
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
        assert expression_workspace.json()["material"]["target_argument_move"] == "concession"
        expression_content_version = expression_workspace.json()["material"]["content_version_id"]
        assert "__expression_v1__reading_evidence_" in expression_content_version
        async with get_engine().connect() as connection:
            snapshot = (
                (
                    await connection.execute(
                        sa.select(tables.reading_evidence_snapshots).where(
                            tables.reading_evidence_snapshots.c.task_id == task["task_id"]
                        )
                    )
                )
                .mappings()
                .one()
            )
        assert snapshot["objective_bundle_id"] == (f"objective_{reading.json()['material_id']}")
        assert (
            task_annotation.json()["annotations"][0]["annotation_id"]
            in (snapshot["payload"]["difficulty_target_ids"])
        )
        assert snapshot["payload"]["expression_task"]["reading_evidence_snapshot_id"] == str(
            snapshot["snapshot_id"]
        )
        async with get_engine().begin() as connection:
            stored_expression = await connection.scalar(
                sa.select(tables.personalized_training_materials.c.expression_task).where(
                    tables.personalized_training_materials.c.material_id
                    == reading.json()["material_id"]
                )
            )
            assert isinstance(stored_expression, dict)
            assert "reading_evidence_snapshot_id" not in stored_expression
            await connection.execute(
                tables.personalized_training_materials.update()
                .where(
                    tables.personalized_training_materials.c.material_id
                    == reading.json()["material_id"]
                )
                .values(expression_task={**stored_expression, "title": "A later run's title"})
            )
        replayed_expression_workspace = await client.get(
            f"/learner/v1/runs/{workspace['run']['workflow_run_id']}/workspace"
        )
        assert (
            replayed_expression_workspace.json()["material"]["title"]
            == expression_workspace.json()["material"]["title"]
        )
        assert (
            replayed_expression_workspace.json()["material"]["content_version_id"]
            == expression_content_version
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

        projected_assets = await client.get("/learner/v1/assets")
        projected = next(
            item for item in projected_assets.json() if item["title"] == "Contrast and concession"
        )
        assert projected["evidence_count"] == 1
        assert projected["evidence_status"] == "hinted_usable"
        assert projected["next_review_at"] is not None
        async with get_engine().connect() as connection:
            grammar_evidence = (
                (
                    await connection.execute(
                        sa.select(tables.grammar_learning_evidence).where(
                            tables.grammar_learning_evidence.c.workflow_run_id
                            == workspace["run"]["workflow_run_id"]
                        )
                    )
                )
                .mappings()
                .all()
            )
            grammar_state = (
                (
                    await connection.execute(
                        sa.select(tables.learner_grammar_states).where(
                            tables.learner_grammar_states.c.learner_id == grammar_learner_id,
                            tables.learner_grammar_states.c.construction_id
                            == "clause.adverbial.concession.although.v1",
                            tables.learner_grammar_states.c.modality == "productive",
                        )
                    )
                )
                .mappings()
                .one_or_none()
            )
            states_by_modality = {
                str(row["modality"]): row
                for row in (
                    (
                        await connection.execute(
                            sa.select(tables.learner_grammar_states).where(
                                tables.learner_grammar_states.c.learner_id == grammar_learner_id,
                                tables.learner_grammar_states.c.construction_id
                                == "clause.adverbial.concession.although.v1",
                            )
                        )
                    )
                    .mappings()
                    .all()
                )
            }
        assert {row["evidence_kind"] for row in grammar_evidence} == {
            "supported_recognition",
            "production_attempt_unverified",
        }
        assert states_by_modality["receptive"]["status"] == "supported"
        assert states_by_modality["receptive"]["independent_context_count"] == 0
        assert grammar_state is not None, grammar_evidence
        assert grammar_state["status"] == "production_unverified"
        assert grammar_state["independent_context_count"] == 0

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

        async with get_engine().begin() as connection:
            await connection.execute(
                tables.personalized_training_materials.update()
                .where(
                    tables.personalized_training_materials.c.material_id
                    == blocked_reading.json()["material_id"]
                )
                .values(status="completed", completed_at=datetime.now(UTC))
            )
            await connection.execute(
                tables.learning_asset_index.update()
                .where(tables.learning_asset_index.c.asset_id == projected["asset_id"])
                .values(next_review_at=datetime(2020, 1, 1, tzinfo=UTC))
            )
        assert await enqueue_due_personalized_material() is True
        due_queue = await client.get("/learner/v1/training-materials")
        due_material = next(item for item in due_queue.json() if item["status"] == "requested")
        assert due_material["source_context_count"] == 1
        assert due_material["start_block_reason"] == "material_not_ready"

        async def fail_generation(*_args: object, **_kwargs: object) -> object:
            raise RuntimeError("provider unavailable")

        monkeypatch.setattr(
            "binnagent_api.personalized_material_service.generate_personalized_reading",
            fail_generation,
        )
        due_material_id = due_material["material_id"]
        for attempt in range(1, 4):
            result = await process_personalized_material(due_material_id)
            assert result == ("generation_failed" if attempt == 3 else "requested")
            if attempt < 3:
                async with get_engine().begin() as connection:
                    await connection.execute(
                        tables.personalized_training_materials.update()
                        .where(
                            tables.personalized_training_materials.c.material_id == due_material_id
                        )
                        .values(next_generation_attempt_at=datetime.now(UTC))
                    )
        failed_queue = await client.get("/learner/v1/training-materials")
        failed = next(
            item for item in failed_queue.json() if item["material_id"] == due_material_id
        )
        assert failed["status"] == "generation_failed"
        assert await enqueue_due_personalized_material() is False

        retried = await client.post(f"/learner/v1/training-materials/{due_material_id}/retry")
        assert retried.status_code == 202, retried.text
        assert retried.json()["status"] == "requested"
        async with get_engine().connect() as connection:
            attempt_count = await connection.scalar(
                sa.select(tables.personalized_training_materials.c.generation_attempt_count).where(
                    tables.personalized_training_materials.c.material_id == due_material_id
                )
            )
        assert attempt_count == 0

        async def generate_without_source_mapping(
            *_args: object, **_kwargs: object
        ) -> PersonalizedReadingOutput:
            return PersonalizedReadingOutput(
                title="A Reliable Reading Without Forced Attribution",
                paragraphs=[
                    "A careful reader compares a familiar rule with the evidence in a new text. "
                    "The comparison matters because recognition alone does not prove transfer.",
                    "Although an earlier explanation may appear convincing, the main claim can "
                    "change when a hidden condition becomes visible to the reader.",
                    "A useful review therefore preserves uncertainty, checks the sentence "
                    "structure, and avoids assigning success to a note without reliable proof.",
                ],
                focus_points=["在新语境中复核让步结构与主句判断"],
                source_titles=[],
            )

        monkeypatch.setattr(
            "binnagent_api.personalized_material_service.generate_personalized_reading",
            generate_without_source_mapping,
        )
        assert await process_personalized_material(due_material_id) == "awaiting_review"
        due_reviewed = await client.post(
            f"/control/v1/personalized-content/reviews/{due_material_id}",
            headers=control_headers,
            json={
                "action": "approve",
                "reason": (
                    "人工复核通过: 来源资产由目标包绑定, 题目证据和语法替换均通过确定性校验。"
                ),
            },
        )
        assert due_reviewed.status_code == 200, due_reviewed.text
        async with get_engine().connect() as connection:
            ready_row = (
                (
                    await connection.execute(
                        sa.select(tables.personalized_training_materials).where(
                            tables.personalized_training_materials.c.material_id == due_material_id
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
                            tables.personalized_material_events.c.material_id == due_material_id
                        )
                    )
                ).scalars()
            )
        assert ready_row["status"] == "ready"
        assert ready_row["evidence_target_asset_ids"] == [projected["asset_id"]]
        assert all(QualityReport.model_validate(report) for report in ready_row["quality_reports"])
        assert "semantic_review_requested" in event_types
        assert "semantic_review_approved" in event_types


@pytest.mark.asyncio
async def test_login_triggered_inbox_organization_is_planned_and_acknowledged(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class IntentAdapter:
        async def classify(self, notes: tuple[InboxNote, ...]) -> InboxAdapterResult:
            return InboxAdapterResult(
                output=InboxClassificationOutput.model_validate(
                    {
                        "classifications": [
                            {
                                "context_id": note.context_id,
                                "kind": "grammar",
                            }
                            for note in notes
                        ]
                    }
                ),
                prompt_version="test-intent-v1",
            )

    monkeypatch.setattr(
        obsidian_organizer,
        "inbox_classification_adapter",
        lambda _settings: IntentAdapter(),
    )
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        paired = await client.post("/learner/v1/assets/obsidian-plugin-connections")
        connection_id = paired.json()["connection_id"]
        headers = {"Authorization": f"Bearer {paired.json()['sync_secret']}"}
        async with get_engine().begin() as connection:
            await enqueue_login_organization(
                connection,
                learner_id="learner_synthetic_local",
                session_token="test-session-token",
            )
        imported = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/import",
            headers=headers,
            json={
                "schema_version": "learning-context/v1",
                "vault_name": "bin01",
                "entries": [
                    {
                        "source_key": "BinnAgentX/00-Inbox/although.md",
                        "title": "Although",
                        "kind": "grammar",
                        "tags": ["grammar"],
                        "excerpt": "Although introduces a concession before the main claim.",
                        "modified_at": datetime.now(UTC).isoformat(),
                    }
                ],
            },
        )
        assert imported.status_code == 200, imported.text
        plan = imported.json()["organization"]
        assert plan["status"] == "queued"
        assert plan["inbox_count"] == 1
        assert plan["classified_count"] == 1
        assert plan["actions"] == []
        assert plan["needs_full_content_source_keys"] == ["BinnAgentX/00-Inbox/although.md"]
        repeated = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/import",
            headers=headers,
            json={
                "schema_version": "learning-context/v1",
                "vault_name": "bin01",
                "entries": [
                    {
                        "source_key": "BinnAgentX/00-Inbox/although.md",
                        "title": "Although",
                        "kind": "grammar",
                        "tags": ["grammar"],
                        "excerpt": "Although introduces a concession before the main claim.",
                        "modified_at": datetime.now(UTC).isoformat(),
                    }
                ],
            },
        )
        assert repeated.status_code == 200, repeated.text
        assert repeated.json()["organization"] == plan
        content = "Although introduces a concession before the main claim."
        content_hash = sha256(content.encode()).hexdigest()
        captured_body = {
            "schema_version": "learning-context/v1",
            "vault_name": "bin01",
            "entries": [
                {
                    "source_key": "BinnAgentX/00-Inbox/although.md",
                    "title": "Although",
                    "kind": "grammar",
                    "tags": ["grammar"],
                    "excerpt": content,
                    "modified_at": datetime.now(UTC).isoformat(),
                    "authorized_content": {
                        "scope_prefix": "BinnAgentX/00-Inbox/",
                        "content": content,
                        "content_hash": content_hash,
                    },
                }
            ],
        }
        captured = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/import",
            headers=headers,
            json=captured_body,
        )
        assert captured.status_code == 200, captured.text
        assert captured.json()["organization"]["knowledge_status"] == "extracting"
        assert captured.json()["organization"]["needs_full_content_source_keys"] == []
        assert captured.json()["organization"]["actions"] == []
        assert await process_next_knowledge_organization() is True
        proposals = await client.get(
            "/control/v1/knowledge-organization/proposals",
            headers={"X-BinnAgent-Control-Role": "developer_reviewer"},
        )
        approved = await client.post(
            f"/control/v1/knowledge-organization/proposals/"
            f"{proposals.json()[0]['proposal_id']}/review",
            headers={"X-BinnAgent-Control-Role": "developer_reviewer"},
            json={"action": "approve"},
        )
        assert approved.status_code == 200, approved.text
        archival = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/import",
            headers=headers,
            json=captured_body,
        )
        archive_plan = archival.json()["organization"]
        assert archive_plan["status"] == "planned"
        assert archive_plan["actions"][0]["target_folder"] == "BinnAgentX/02-Grammar"
        acknowledged = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/organizer-runs/{plan['run_id']}/ack",
            headers=headers,
            json={
                "completed_action_ids": [archive_plan["actions"][0]["action_id"]],
                "completed_source_keys": {
                    archive_plan["actions"][0]["action_id"]: ("BinnAgentX/02-Grammar/although.md")
                },
            },
        )
        assert acknowledged.status_code == 200, acknowledged.text
        async with get_engine().connect() as connection:
            status_value = await connection.scalar(
                sa.select(tables.obsidian_organizer_runs.c.status).where(
                    tables.obsidian_organizer_runs.c.run_id == plan["run_id"]
                )
            )
        assert status_value == "completed"


@pytest.mark.asyncio
async def test_asset_page_can_queue_one_manual_organization_run() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        unpaired = await client.post("/learner/v1/assets/obsidian-organizer-runs")
        assert unpaired.status_code == 409
        assert unpaired.json()["code"] == "OBSIDIAN_CONNECTION_REQUIRED"

        paired = await client.post("/learner/v1/assets/obsidian-plugin-connections")
        assert paired.status_code == 200, paired.text

        first = await client.post("/learner/v1/assets/obsidian-organizer-runs")
        repeated = await client.post("/learner/v1/assets/obsidian-organizer-runs")

        assert first.status_code == 202, first.text
        assert repeated.status_code == 202, repeated.text
        assert first.json() == repeated.json()
        assert first.json()["status"] == "queued"
        assert first.json()["next_step"] == "sync_obsidian_plugin"

        async with get_engine().connect() as connection:
            run = (
                (
                    await connection.execute(
                        sa.select(tables.obsidian_organizer_runs).where(
                            tables.obsidian_organizer_runs.c.run_id == first.json()["run_id"]
                        )
                    )
                )
                .mappings()
                .one()
            )
        assert run["trigger_type"] == "manual"
