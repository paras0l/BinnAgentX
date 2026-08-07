"""Application service for durable personalized-reading material jobs."""

from __future__ import annotations

import asyncio
import os
import socket
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from hashlib import sha256
from typing import Any
from uuid import uuid4

import httpx2
import sqlalchemy as sa
from binnagent_agent.agents.content_reviewer import ContentReviewRequest, ContentReviewResult
from binnagent_agent.observability import observe, stable_trace_id
from binnagent_agent.workflows import (
    GRAPH_VERSION,
    build_personalized_content_graph,
    open_postgres_checkpointer,
    stable_thread_id,
)
from binnagent_agent.workflows.personalized_content_graph import (
    PersonalizedContentState,
)
from binnagent_domain.learning.content_quality import (
    ContentArtifact,
    ExpressionTaskArtifact,
    GrammarAnalysisArtifact,
    LearningObjectiveBundle,
    QualityIssueCode,
    QualityReport,
    QualityResult,
    QualitySeverity,
    ReadingQuestionArtifact,
    TransferContract,
    stable_content_hash,
)
from binnagent_domain.model_errors import (
    LearnerBalanceInsufficientError,
    ProviderBalanceInsufficientError,
    provider_balance_error_from,
)
from binnagent_evaluation.trajectory import evaluate_trajectory
from langchain_core.runnables import RunnableConfig
from langgraph.types import Command
from pydantic import ValidationError
from sqlalchemy.dialects.postgresql import insert as pg_insert

from binnagent_api.content_generation_service import build_content_reviewer_adapter
from binnagent_api.database import get_engine
from binnagent_api.knowledge_extraction_service import enrich_review_contexts
from binnagent_api.learner_level_service import (
    generation_level_context,
    latest_level_assessment,
    recent_material_feedback_context,
)
from binnagent_api.learner_usage import (
    ensure_model_usage_available,
    learner_usage_scope,
    provider_token_usage,
    record_model_usage,
)
from binnagent_api.model_adapters import (
    PersonalizedAssessmentOutput,
    PersonalizedReadingOutput,
    personalized_assessment_adapter,
    personalized_reading_adapter,
)
from binnagent_api.personalized_package import (
    build_article,
    build_grammar_artifacts,
    build_imported_article,
    build_objective_bundle,
    build_question_artifacts,
    build_transfer_artifacts,
    deterministic_assessment,
    generated_article_grammar_requirements,
    generated_article_grammar_target,
    imported_article_targets,
    persisted_expression,
    persisted_grammar,
    persisted_question,
    structural_quality_reports,
)
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

MAX_GENERATION_ATTEMPTS = 3
GENERATION_LEASE = timedelta(minutes=3)


def _model_balance_failure(exc: Exception) -> tuple[str, str] | None:
    if isinstance(exc, ProviderBalanceInsufficientError):
        return (
            "MODEL_PROVIDER_BALANCE_INSUFFICIENT",
            "当前模型供应商余额不足, 请在控制舱切换模型后重试。",
        )
    if isinstance(exc, LearnerBalanceInsufficientError):
        return (
            "LEARNER_MODEL_BALANCE_INSUFFICIENT",
            "你的模型词元额度已用完, 请等待额度重置或联系管理员。",
        )
    return None


def _worker_identity() -> str:
    return f"personalized:{socket.gethostname()}:{os.getpid()}"


async def process_next_personalized_material() -> bool:
    claimed = await _claim_personalized_material(worker_id=_worker_identity())
    if claimed is None:
        return False
    await _set_worker_activity(state="running", material_id=str(claimed["material_id"]))
    try:
        with learner_usage_scope(str(claimed["learner_id"])):
            await _generate_claimed_personalized_material(claimed)
    finally:
        await _set_worker_activity(state="idle", material_id=None)
    return True


async def requeue_interrupted_personalized_materials() -> int:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        rows = (
            (
                await connection.execute(
                    tables.personalized_training_materials.update()
                    .where(
                        tables.personalized_training_materials.c.status.in_(
                            ("generating", "validating")
                        ),
                        sa.or_(
                            tables.personalized_training_materials.c.lease_expires_at.is_(None),
                            tables.personalized_training_materials.c.lease_expires_at <= now,
                        ),
                    )
                    .values(
                        status="requested",
                        claimed_by=None,
                        lease_expires_at=None,
                        next_generation_attempt_at=now,
                        updated_at=now,
                    )
                    .returning(tables.personalized_training_materials.c.material_id)
                )
            )
            .scalars()
            .all()
        )
        for material_id in rows:
            await _insert_event(
                connection,
                material_id=str(material_id),
                event_type="lease_recovered",
                stage="requested",
                message="Worker 租约过期, 任务已安全重新排队",
                occurred_at=now,
            )
    return len(rows)


async def enqueue_due_personalized_material() -> bool:
    """Create at most one daily review job for a learner with overdue evidence."""

    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        due = (
            (
                await connection.execute(
                    sa.select(
                        tables.learning_asset_index.c.learner_id,
                        tables.obsidian_learning_context.c.context_id,
                    )
                    .join(
                        tables.obsidian_learning_context,
                        sa.and_(
                            tables.obsidian_learning_context.c.asset_id
                            == tables.learning_asset_index.c.asset_id,
                            tables.obsidian_learning_context.c.learner_id
                            == tables.learning_asset_index.c.learner_id,
                        ),
                    )
                    .where(
                        tables.learning_asset_index.c.next_review_at.is_not(None),
                        tables.learning_asset_index.c.next_review_at <= now,
                        ~sa.exists(
                            sa.select(1).where(
                                tables.personalized_training_materials.c.learner_id
                                == tables.learning_asset_index.c.learner_id,
                                tables.personalized_training_materials.c.created_at
                                >= now - timedelta(days=1),
                                tables.personalized_training_materials.c.status.in_(
                                    (
                                        "requested",
                                        "generating",
                                        "validating",
                                        "ready",
                                        "in_progress",
                                        "generation_failed",
                                    )
                                ),
                            )
                        ),
                    )
                    .order_by(
                        tables.learning_asset_index.c.next_review_at,
                        tables.learning_asset_index.c.updated_at.desc(),
                    )
                    .limit(6)
                    .with_for_update(skip_locked=True)
                )
            )
            .mappings()
            .all()
        )
        if not due:
            return False
        learner_id = str(due[0]["learner_id"])
        context_ids = [
            str(item["context_id"]) for item in due if str(item["learner_id"]) == learner_id
        ]
        material_id = f"training_material_{uuid4().hex}"
        await connection.execute(
            tables.personalized_training_materials.insert().values(
                material_id=material_id,
                learner_id=learner_id,
                title="正在准备到期复习材料",
                paragraphs=[],
                focus_points=["目标: 验证已到复习节点的知识"],
                source_context_ids=context_ids,
                source_kind="agent_generated",
                status="requested",
                generation_attempt_count=0,
                generation_error_code=None,
                next_generation_attempt_at=now,
                claimed_by=None,
                lease_expires_at=None,
                requested_goal="验证已到复习节点的词汇、语法与表达",
                requested_kinds=[],
                evidence_target_asset_ids=[],
                quality_status="not_evaluated",
                quality_reports=[],
                objective_bundle={},
                question_bank=[],
                grammar_annotations=[],
                transfer_contract=None,
                expression_task=None,
                runtime_kind="langgraph",
                graph_thread_id=stable_thread_id(
                    "personalized-content",
                    material_id,
                ),
                graph_version=GRAPH_VERSION,
                started_at=None,
                completed_at=None,
                active_workflow_run_id=None,
                created_at=now,
                updated_at=now,
            )
        )
        await _insert_event(
            connection,
            material_id=material_id,
            event_type="review_job_queued",
            stage="requested",
            message="到期复习材料已进入生成队列",
            detail={"source_context_count": len(context_ids)},
            occurred_at=now,
        )
    return True


async def enqueue_legacy_personalized_material_upgrade() -> bool:
    """Move one unused incomplete legacy draft into its owner's current generation path."""
    async with get_engine().connect() as connection:
        material_id = await connection.scalar(
            sa.select(tables.personalized_training_materials.c.material_id)
            .where(
                tables.personalized_training_materials.c.status == "ready",
                tables.personalized_training_materials.c.quality_status == "unverified_legacy",
                tables.personalized_training_materials.c.runtime_kind == "explicit_state_machine",
                tables.personalized_training_materials.c.active_workflow_run_id.is_(None),
            )
            .order_by(tables.personalized_training_materials.c.created_at)
            .limit(1)
        )
    if material_id is None:
        return False
    await regenerate_legacy_personalized_material(
        material_id=str(material_id),
        reviewer_id="system_personalized_material_migration",
        reason="旧材料缺少完整训练包, 在所属用户范围内自动升级并重新生成。",
    )
    return True


async def process_personalized_material(material_id: str) -> str:
    claimed = await _claim_personalized_material(
        material_id=material_id,
        worker_id=_worker_identity(),
    )
    if claimed is None:
        async with get_engine().connect() as connection:
            status = await connection.scalar(
                sa.select(tables.personalized_training_materials.c.status).where(
                    tables.personalized_training_materials.c.material_id == material_id
                )
            )
        if status is None:
            raise LookupError(f"personalized material not found: {material_id}")
        return str(status)
    return await _generate_claimed_personalized_material(claimed)


async def _claim_personalized_material(
    *,
    worker_id: str,
    material_id: str | None = None,
) -> dict[str, Any] | None:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        filters = [
            tables.personalized_training_materials.c.status == "requested",
            sa.or_(
                tables.personalized_training_materials.c.next_generation_attempt_at.is_(None),
                tables.personalized_training_materials.c.next_generation_attempt_at <= now,
            ),
        ]
        if material_id is not None:
            filters.append(tables.personalized_training_materials.c.material_id == material_id)
        row = (
            (
                await connection.execute(
                    sa.select(tables.personalized_training_materials)
                    .where(*filters)
                    .order_by(tables.personalized_training_materials.c.created_at)
                    .limit(1)
                    .with_for_update(skip_locked=True)
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            return None
        claimed_material_id = str(row["material_id"])
        await connection.execute(
            tables.personalized_training_materials.update()
            .where(tables.personalized_training_materials.c.material_id == claimed_material_id)
            .values(
                status="generating",
                generation_attempt_count=tables.personalized_training_materials.c.generation_attempt_count
                + 1,
                generation_error_code=None,
                claimed_by=worker_id,
                lease_expires_at=now + GENERATION_LEASE,
                next_generation_attempt_at=None,
                updated_at=now,
            )
        )
        await _insert_event(
            connection,
            material_id=claimed_material_id,
            event_type="generation_started",
            stage="generating",
            attempt=int(row["generation_attempt_count"]) + 1,
            message="Worker 已领取任务, 开始生成个性化材料",
            detail={"source_context_count": len(row["source_context_ids"])},
            occurred_at=now,
        )
        claimed = dict(row)
        claimed["generation_attempt_count"] = int(row["generation_attempt_count"]) + 1
        claimed["claimed_by"] = worker_id
        claimed["lease_expires_at"] = now + GENERATION_LEASE
    return claimed


async def _generate_claimed_personalized_material(row: dict[str, Any]) -> str:
    heartbeat = asyncio.create_task(
        _heartbeat_personalized_lease(
            material_id=str(row["material_id"]),
            claimed_by=str(row["claimed_by"]),
        )
    )
    try:
        settings = get_settings()
        with observe(
            "personalized.material.pipeline",
            as_type="agent",
            input={
                "material_id": str(row["material_id"]),
                "source_context_count": len(list(row["source_context_ids"])),
                "requested_goal": str(row["requested_goal"]),
            },
            metadata={
                "project_key": "binnagentx",
                "operation": "personalized_material_pipeline",
                "material_id": str(row["material_id"]),
                "source_kind": str(row.get("source_kind") or "obsidian"),
                "runtime_kind": str(row.get("runtime_kind") or "legacy"),
                "generation_attempt": int(row["generation_attempt_count"]),
                "provider": settings.model_adapter,
            },
            trace_id=stable_trace_id(
                "personalized_material",
                f"{row['material_id']}:{row['generation_attempt_count']}",
            ),
            version=str(row.get("graph_version") or "legacy"),
        ) as observation:
            result = await _generate_with_claim(row)
            if observation is not None:
                observation.update(output={"status": result})
            return result
    finally:
        heartbeat.cancel()
        with suppress(asyncio.CancelledError):
            await heartbeat


async def _generate_with_claim(row: dict[str, Any]) -> str:
    material_id = str(row["material_id"])
    async with get_engine().connect() as connection:
        context_rows = (
            (
                await connection.execute(
                    sa.select(tables.obsidian_learning_context).where(
                        tables.obsidian_learning_context.c.learner_id == row["learner_id"],
                        tables.obsidian_learning_context.c.context_id.in_(
                            row["source_context_ids"]
                        ),
                    )
                )
            )
            .mappings()
            .all()
        )
        adaptation_profile = generation_level_context(
            await latest_level_assessment(connection, str(row["learner_id"]))
        )
        adaptation_profile["recent_material_feedback"] = await recent_material_feedback_context(
            connection, str(row["learner_id"])
        )
    contexts = tuple(
        {
            "kind": str(context["asset_kind"]),
            "title": str(context["title"]),
            "excerpt": str(context["excerpt"]),
        }
        for context in context_rows
    )
    if row.get("runtime_kind") == "langgraph":
        return await _generate_langgraph_with_claim(
            row,
            contexts=contexts,
            context_rows=[dict(value) for value in context_rows],
            adaptation_profile=adaptation_profile,
        )
    try:
        steps = ["memory.load"]
        await _record_event(
            material_id,
            event_type="knowledge_extraction_started",
            stage="knowledge_extraction",
            attempt=int(row["generation_attempt_count"]),
            message="正在从授权笔记提取可复习知识",
        )
        contexts, extraction_called, extraction_error = await enrich_review_contexts(contexts)
        if extraction_called:
            steps.append("model.knowledge_extract")
            await _record_event(
                material_id,
                event_type="knowledge_extraction_completed",
                stage="knowledge_extraction",
                attempt=int(row["generation_attempt_count"]),
                message="知识抽取完成",
            )
        elif extraction_error:
            await _record_event(
                material_id,
                event_type="knowledge_extraction_fallback",
                stage="knowledge_extraction",
                attempt=int(row["generation_attempt_count"]),
                message="知识抽取未产生结构化结果, 继续使用原始授权上下文",
                detail={"error_code": extraction_error},
            )
        else:
            await _record_event(
                material_id,
                event_type="knowledge_extraction_skipped",
                stage="knowledge_extraction",
                attempt=int(row["generation_attempt_count"]),
                message="当前模型策略未启用知识抽取, 继续使用原始授权上下文",
            )
        await _record_event(
            material_id,
            event_type="reading_generation_started",
            stage="reading_generation",
            attempt=int(row["generation_attempt_count"]),
            message="正在生成符合学习目标的英文阅读",
        )
        output = await generate_personalized_reading(
            contexts,
            goal=str(row["requested_goal"]),
            adaptation_profile=adaptation_profile,
        )
        steps.append("model.personalized_reading")
        await _record_event(
            material_id,
            event_type="reading_generation_completed",
            stage="reading_generation",
            attempt=int(row["generation_attempt_count"]),
            message="模型已返回阅读材料, 进入确定性校验",
            detail={"paragraph_count": len(output.paragraphs)},
        )
        await _mark_validating(material_id, claimed_by=str(row["claimed_by"]))
        _validate_generated_reading(output, contexts)
        steps.append("validate.personalized_reading")
        referenced_titles = set(output.source_titles)
        target_asset_ids = [
            str(context["asset_id"])
            for context in context_rows
            if str(context["title"]) in referenced_titles
        ]
        trajectory = evaluate_trajectory(
            tuple((*steps, "persist.material")),
            allowed_steps=frozenset(
                {
                    "memory.load",
                    "model.knowledge_extract",
                    "model.personalized_reading",
                    "validate.personalized_reading",
                    "persist.material",
                }
            ),
            required_order=(
                "memory.load",
                "model.personalized_reading",
                "validate.personalized_reading",
                "persist.material",
            ),
            max_model_calls=2,
        )
        if not trajectory.passed:
            raise ValueError("personalized_trajectory_invalid:" + ",".join(trajectory.reason_codes))
    except Exception as exc:
        now = datetime.now(UTC)
        attempts = int(row["generation_attempt_count"])
        balance_failure = _model_balance_failure(exc)
        terminal = balance_failure is not None or attempts >= MAX_GENERATION_ATTEMPTS
        delay = timedelta(seconds=30 * 2 ** max(0, attempts - 1))
        error_code = (
            balance_failure[0]
            if balance_failure is not None
            else f"{type(exc).__name__}:{str(exc)[:80]}"
        )
        async with get_engine().begin() as connection:
            result = await connection.execute(
                tables.personalized_training_materials.update()
                .where(
                    tables.personalized_training_materials.c.material_id == material_id,
                    tables.personalized_training_materials.c.claimed_by == row["claimed_by"],
                )
                .values(
                    status="generation_failed" if terminal else "requested",
                    generation_error_code=error_code,
                    next_generation_attempt_at=None if terminal else now + delay,
                    claimed_by=None,
                    lease_expires_at=None,
                    updated_at=now,
                )
            )
            if not result.rowcount:
                raise RuntimeError(f"personalized material lease lost: {material_id}") from exc
            await _insert_event(
                connection,
                material_id=material_id,
                event_type="generation_failed" if terminal else "generation_retry_scheduled",
                stage="generation_failed" if terminal else "requested",
                attempt=attempts,
                message=(
                    balance_failure[1]
                    if balance_failure is not None
                    else "个性化材料生成失败, 已达到最大尝试次数"
                    if terminal
                    else "本次生成失败, 已安排自动重试"
                ),
                detail={
                    "error_code": error_code,
                    "terminal": terminal,
                    "next_attempt_at": None if terminal else (now + delay).isoformat(),
                },
                occurred_at=now,
            )
        return "generation_failed" if terminal else "requested"
    async with get_engine().begin() as connection:
        result = await connection.execute(
            tables.personalized_training_materials.update()
            .where(
                tables.personalized_training_materials.c.material_id == material_id,
                tables.personalized_training_materials.c.claimed_by == row["claimed_by"],
            )
            .values(
                title=output.title,
                paragraphs=output.paragraphs,
                focus_points=output.focus_points,
                status="ready",
                quality_status="structurally_validated",
                quality_reports=[
                    QualityReport(
                        report_id=f"{material_id}_structure_v1",
                        artifact_id=material_id,
                        validator_id="personalized_reading_structure",
                        validator_version="v1",
                        result=QualityResult.PASS,
                        severity=QualitySeverity.INFO,
                        confidence=1.0,
                    ).model_dump(mode="json"),
                    QualityReport(
                        report_id=f"{material_id}_semantic_gate_v1",
                        artifact_id=material_id,
                        validator_id="personalized_reading_semantic_gate",
                        validator_version="v1",
                        result=QualityResult.REVIEW_REQUIRED,
                        issue_code=QualityIssueCode.SEMANTIC_REVIEW_NOT_RUN,
                        severity=QualitySeverity.BLOCKER,
                        repair_scope=("question_bank", "grammar_annotations"),
                        confidence=1.0,
                    ).model_dump(mode="json"),
                ],
                generation_error_code=None,
                evidence_target_asset_ids=list(dict.fromkeys(target_asset_ids)),
                claimed_by=None,
                lease_expires_at=None,
                next_generation_attempt_at=None,
                updated_at=datetime.now(UTC),
            )
        )
        if not result.rowcount:
            raise RuntimeError(f"personalized material lease lost: {material_id}")
        if not target_asset_ids:
            await _insert_event(
                connection,
                material_id=material_id,
                event_type="evidence_mapping_skipped",
                stage="validating",
                attempt=int(row["generation_attempt_count"]),
                message="材料通过校验; 模型未返回可靠来源标题, 本次不更新来源资产证据",
                detail={"reported_source_titles": output.source_titles},
            )
        await _insert_event(
            connection,
            material_id=material_id,
            event_type="generation_completed",
            stage="ready",
            attempt=int(row["generation_attempt_count"]),
            message="个性化材料已通过结构校验, 等待题目与语言质量审核",
            detail={
                "evidence_target_count": len(target_asset_ids),
                "quality_status": "structurally_validated",
            },
        )
    return "ready"


async def _generate_langgraph_with_claim(
    row: dict[str, Any],
    *,
    contexts: tuple[dict[str, Any], ...],
    context_rows: list[dict[str, Any]],
    adaptation_profile: dict[str, Any],
) -> str:
    material_id = str(row["material_id"])
    imported_targets = (
        imported_article_targets([str(value) for value in row["paragraphs"]])
        if row.get("source_kind") == "imported"
        else None
    )
    objective = build_objective_bundle(
        material_id=material_id,
        learner_id=str(row["learner_id"]),
        source_asset_ids=(
            [f"{material_id}_imported_article"]
            if row.get("source_kind") == "imported"
            else [str(value["asset_id"]) for value in context_rows]
        ),
        goal=str(row["requested_goal"]),
        adaptation_profile=adaptation_profile,
        **(
            {
                "construction_id": imported_targets[0],
                "discourse_target": imported_targets[1],
            }
            if imported_targets is not None
            else {}
        ),
    )
    await _persist_objective(row, objective)
    try:
        database_url = get_settings().database_url.get_secret_value()
        async with open_postgres_checkpointer(database_url) as saver:
            graph = _build_personalized_material_graph(
                row=row,
                contexts=contexts,
                adaptation_profile=adaptation_profile,
                checkpointer=saver,
            )
            config = _graph_config(row)
            snapshot = await graph.aget_state(config)
            resume_from_checkpoint = bool(snapshot.values and snapshot.next)
            failed_node = str(snapshot.next[0]) if snapshot.next else None
            if resume_from_checkpoint:
                await _record_event(
                    material_id,
                    event_type="checkpoint_resume_started",
                    stage="generating",
                    message="已从保留的失败节点检查点继续执行",
                    detail={
                        "failed_node": failed_node,
                        "recovery_mode": "checkpoint_resume",
                    },
                )
            try:
                result = await graph.ainvoke(
                    (
                        None
                        if resume_from_checkpoint
                        else {
                            "objective_bundle": objective.model_dump(mode="json"),
                            "repair_attempts": 0,
                            "workflow_status": "queued",
                            "graph_version": GRAPH_VERSION,
                        }
                    ),
                    config,
                )
            except Exception as exc:
                failed_snapshot = await graph.aget_state(config)
                failed_node = str(failed_snapshot.next[0]) if failed_snapshot.next else failed_node
                return await _handle_langgraph_generation_failure(
                    row,
                    exc,
                    failed_node=failed_node,
                )
        workflow_status = str(result.get("workflow_status", ""))
        if workflow_status == "completed":
            return "ready"
        if workflow_status == "rejected":
            decision = dict(result.get("review_decision", {}))
            await _reject_reviewed_material(
                material_id=material_id,
                reviewer_id=str(decision.get("reviewer_id", "personalized_content_review_agent")),
                reason=str(decision.get("reason", "automated_quality_review_rejected")),
            )
            return "rejected"
        if result.get("__interrupt__"):
            await _persist_review_candidate(row, dict(result))
            return "awaiting_review"
        raise RuntimeError("personalized_graph_terminal_state_missing")
    except Exception as exc:
        return await _handle_langgraph_generation_failure(row, exc, failed_node=None)


def _build_personalized_material_graph(
    *,
    row: dict[str, Any],
    contexts: tuple[dict[str, Any], ...],
    adaptation_profile: dict[str, Any],
    checkpointer: Any,
) -> Any:
    material_id = str(row["material_id"])
    reviewer = build_content_reviewer_adapter(get_settings())
    review_results: dict[int, ContentReviewResult] = {}

    async def generate_article(
        objective: LearningObjectiveBundle,
        key: str,
    ) -> dict[str, Any]:
        if row.get("source_kind") == "imported":
            return build_imported_article(
                material_id=material_id,
                objective=objective,
                title=str(row["title"]),
                paragraphs=[str(value) for value in row["paragraphs"]],
                focus_points=[str(value) for value in row["focus_points"]],
            )
        revision = _revision_from_key(key)
        output = await _cached_personalized_reading(
            material_id=material_id,
            revision=revision,
            contexts=contexts,
            goal=str(row["requested_goal"]),
            adaptation_profile=adaptation_profile,
            objective=objective,
        )
        return build_article(
            material_id=material_id,
            objective=objective,
            output=output,
        )

    async def generate_questions(
        objective: LearningObjectiveBundle,
        article: dict[str, Any],
        key: str,
    ) -> tuple[ReadingQuestionArtifact, ...]:
        assessment = await _cached_personalized_assessment(
            material_id=material_id,
            revision=_revision_from_key(key),
            objective=objective,
            article=article,
        )
        return build_question_artifacts(
            material_id=material_id,
            objective=objective,
            article=article,
            assessment=assessment,
        )

    async def generate_language(
        objective: LearningObjectiveBundle,
        article: dict[str, Any],
        key: str,
    ) -> tuple[GrammarAnalysisArtifact, ...]:
        assessment = await _cached_personalized_assessment(
            material_id=material_id,
            revision=_revision_from_key(key),
            objective=objective,
            article=article,
        )
        return build_grammar_artifacts(
            material_id=material_id,
            objective=objective,
            article=article,
            assessment=assessment,
        )

    async def generate_transfer(
        objective: LearningObjectiveBundle,
        article: dict[str, Any],
        questions: tuple[ReadingQuestionArtifact, ...],
        key: str,
    ) -> tuple[TransferContract, ExpressionTaskArtifact]:
        assessment = await _cached_personalized_assessment(
            material_id=material_id,
            revision=_revision_from_key(key),
            objective=objective,
            article=article,
        )
        return build_transfer_artifacts(
            material_id=material_id,
            objective=objective,
            article=article,
            questions=questions,
            assessment=assessment,
        )

    async def publish(state: PersonalizedContentState, key: str) -> str:
        return await _publish_reviewed_material(
            material_id=material_id,
            state=dict(state),
            publish_key=key,
        )

    async def validate_package(
        state: PersonalizedContentState,
    ) -> tuple[QualityReport, ...]:
        structural_report = structural_quality_reports(dict(state))[0]
        article = dict(state["article"])
        article_artifact = ContentArtifact.model_validate(article["artifact"])
        if reviewer is None:
            return (
                structural_report,
                QualityReport(
                    report_id=f"{article_artifact.artifact_id}_review_agent_fixture_v1",
                    artifact_id=article_artifact.artifact_id,
                    validator_id="personalized_content_review_agent_fixture",
                    validator_version="v1",
                    result=QualityResult.PASS,
                    severity=QualitySeverity.INFO,
                    confidence=1.0,
                ),
            )
        candidate = {
            "title": article["title"],
            "paragraphs": article["paragraphs"],
            "focus_points": article.get("focus_points", []),
            "question_bank": state["questions"],
            "grammar_annotations": state["grammar_annotations"],
            "transfer_contract": state["transfer_contract"],
            "expression_task": state["expression_task"],
        }
        await ensure_model_usage_available()
        try:
            result = await asyncio.to_thread(
                reviewer.review,
                ContentReviewRequest(
                    content_type="matched_reading",
                    source_item={
                        "title": "learner-authorized private context",
                        "paragraphs": [],
                        "difficulty": adaptation_profile,
                    },
                    candidate_item=candidate,
                ),
            )
        except Exception as exc:
            balance_error = provider_balance_error_from(
                exc,
                provider=str(getattr(reviewer, "name", get_settings().model_adapter)),
            )
            if balance_error is not None:
                raise balance_error from exc
            raise
        input_tokens, output_tokens, counting_method = provider_token_usage(
            {},
            request_payload=candidate,
            output=result.model_dump_json(),
        )
        settings = get_settings()
        reviewer_provider = str(getattr(reviewer, "name", settings.model_adapter))
        await record_model_usage(
            provider=reviewer_provider,
            model=(
                settings.ollama_chat_model
                if reviewer_provider == "ollama"
                else settings.deepseek_chat_model
                if reviewer_provider == "deepseek"
                else settings.longcat_chat_model
            ),
            operation="personalized_content_review",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=Decimal(
                str(getattr(reviewer, "estimated_cost_usd", settings.model_estimated_cost_usd))
            ),
            counting_method=counting_method,
        )
        revision = int(state.get("repair_attempts", 0))
        review_results[revision] = result
        if result.passes_release_gate():
            review_report = QualityReport(
                report_id=f"{article_artifact.artifact_id}_review_agent_r{revision}_v1",
                artifact_id=article_artifact.artifact_id,
                validator_id="personalized_content_review_agent",
                validator_version="prompt_content_judge_v1",
                result=QualityResult.PASS,
                severity=QualitySeverity.INFO,
                confidence=0.9,
            )
        else:
            review_report = QualityReport(
                report_id=f"{article_artifact.artifact_id}_review_agent_r{revision}_v1",
                artifact_id=article_artifact.artifact_id,
                validator_id="personalized_content_review_agent",
                validator_version="prompt_content_judge_v1",
                result=(
                    QualityResult.REJECT if result.verdict == "reject" else QualityResult.REVISE
                ),
                issue_code=_review_issue_code(result),
                severity=(
                    QualitySeverity.BLOCKER if result.verdict == "reject" else QualitySeverity.ERROR
                ),
                repair_scope=(_review_repair_scope(result),),
                confidence=0.9,
            )
        return structural_report, review_report

    async def decide_review(
        state: PersonalizedContentState,
        _reports: tuple[QualityReport, ...],
    ) -> dict[str, Any]:
        revision = int(state.get("repair_attempts", 0))
        result = review_results[revision]
        action = "reject" if result.verdict == "reject" or revision >= 2 else "revise"
        return {
            "action": action,
            "reviewer_id": "personalized_content_review_agent",
            "reason": result.summary,
            **({"repair_scope": _review_repair_scope(result)} if action == "revise" else {}),
        }

    return build_personalized_content_graph(
        article_generator=generate_article,
        question_generator=generate_questions,
        quality_validator=lambda _objective, _article, _questions: (),
        language_generator=generate_language,
        transfer_generator=generate_transfer,
        package_quality_validator=validate_package,
        review_decider=decide_review,
        publisher=publish,
        checkpointer=checkpointer,
        graph_version=str(row["graph_version"] or GRAPH_VERSION),
    )


def _review_repair_scope(result: ContentReviewResult) -> str:
    paths = " ".join(issue.field_path.lower() for issue in result.issues)
    if "question" in paths or "answer" in paths or "evidence" in paths:
        return "question_bank"
    if "grammar" in paths or "language" in paths:
        return "grammar_annotations"
    if "transfer" in paths or "expression" in paths:
        return "transfer_contract"
    return "article"


def _review_issue_code(result: ContentReviewResult) -> QualityIssueCode:
    scope = _review_repair_scope(result)
    return {
        "article": QualityIssueCode.ARTICLE_COHERENCE_FAILED,
        "question_bank": QualityIssueCode.QUESTION_NOT_ANSWERABLE,
        "grammar_annotations": QualityIssueCode.GRAMMAR_PARSE_LOW_CONFIDENCE,
        "transfer_contract": QualityIssueCode.TRANSFER_TASK_UNRELATED,
    }[scope]


async def review_personalized_material(
    *,
    material_id: str,
    reviewer_id: str,
    action: str,
    reason: str,
    repair_scope: str | None = None,
) -> dict[str, Any]:
    row, contexts, adaptation_profile = await _personalized_graph_context(material_id)
    if row["runtime_kind"] != "langgraph":
        if (
            row["quality_status"] == "unverified_legacy"
            and row["status"] == "ready"
            and action == "reject"
        ):
            await _reject_reviewed_material(
                material_id=material_id,
                reviewer_id=reviewer_id,
                reason=reason,
            )
            async with get_engine().connect() as connection:
                rejected = (
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
            return dict(rejected)
        raise ValueError("personalized_legacy_material_requires_regeneration")
    if row["status"] not in {"awaiting_review", "ready", "rejected"}:
        raise ValueError("personalized_material_not_reviewable")
    if row["status"] == "ready" and row["quality_status"] == "semantic_reviewed":
        return dict(row)
    if row["status"] == "rejected":
        raise ValueError("personalized_material_already_rejected")
    review_claim = f"review:{reviewer_id}:{uuid4().hex}"
    claimed_row = await _claim_personalized_review(
        row=dict(row),
        review_claim=review_claim,
    )
    database_url = get_settings().database_url.get_secret_value()
    try:
        async with open_postgres_checkpointer(database_url) as saver:
            graph = _build_personalized_material_graph(
                row=claimed_row,
                contexts=contexts,
                adaptation_profile=adaptation_profile,
                checkpointer=saver,
            )
            result = await graph.ainvoke(
                Command(
                    resume={
                        "action": action,
                        "reviewer_id": reviewer_id,
                        "reason": reason,
                        "repair_scope": repair_scope,
                    }
                ),
                _graph_config(claimed_row),
            )
        if result.get("__interrupt__"):
            await _persist_review_candidate(claimed_row, dict(result))
        elif result.get("workflow_status") == "rejected":
            await _reject_reviewed_material(
                material_id=material_id,
                reviewer_id=reviewer_id,
                reason=reason,
            )
    except Exception:
        await _release_personalized_review_claim(
            material_id=material_id,
            review_claim=review_claim,
        )
        raise
    async with get_engine().connect() as connection:
        updated = (
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
    return dict(updated)


async def resume_failed_personalized_material(
    *,
    material_id: str,
    reviewer_id: str,
    reason: str,
) -> dict[str, Any]:
    """Queue one failed LangGraph run from its existing failed-node checkpoint."""

    row, contexts, adaptation_profile = await _personalized_graph_context(material_id)
    if row["runtime_kind"] != "langgraph":
        raise ValueError("personalized_checkpoint_resume_requires_langgraph")
    if row["status"] != "generation_failed":
        raise ValueError("personalized_checkpoint_resume_not_allowed")
    if not row.get("graph_thread_id"):
        raise ValueError("personalized_checkpoint_resume_thread_missing")

    database_url = get_settings().database_url.get_secret_value()
    async with open_postgres_checkpointer(database_url) as saver:
        graph = _build_personalized_material_graph(
            row=dict(row),
            contexts=contexts,
            adaptation_profile=adaptation_profile,
            checkpointer=saver,
        )
        snapshot = await graph.aget_state(_graph_config(dict(row)))
    if not snapshot.values or not snapshot.next:
        raise ValueError("personalized_checkpoint_resume_state_missing")
    failed_node = str(snapshot.next[0])

    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        current = (
            (
                await connection.execute(
                    sa.select(tables.personalized_training_materials)
                    .where(tables.personalized_training_materials.c.material_id == material_id)
                    .with_for_update()
                )
            )
            .mappings()
            .one_or_none()
        )
        if current is None:
            raise LookupError("personalized_material_not_found")
        if current["status"] != "generation_failed" or current["claimed_by"] is not None:
            raise ValueError("personalized_checkpoint_resume_state_changed")
        await connection.execute(
            tables.model_invocation_ledger.delete().where(
                tables.model_invocation_ledger.c.workflow_run_id == material_id,
                tables.model_invocation_ledger.c.status == "pending",
            )
        )
        await connection.execute(
            tables.personalized_training_materials.update()
            .where(tables.personalized_training_materials.c.material_id == material_id)
            .values(
                status="requested",
                generation_attempt_count=0,
                generation_error_code=None,
                next_generation_attempt_at=now,
                claimed_by=None,
                lease_expires_at=None,
                completed_at=None,
                updated_at=now,
            )
        )
        await _insert_event(
            connection,
            material_id=material_id,
            event_type="human_checkpoint_resume_requested",
            stage="requested",
            message="人工干预已完成, 等待从原失败节点继续执行",
            detail={
                "reviewer_id": reviewer_id,
                "reason": reason,
                "failed_node": failed_node,
                "recovery_mode": "human_checkpoint_resume",
            },
            occurred_at=now,
        )
        updated = (
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
    return dict(updated)


async def regenerate_legacy_personalized_material(
    *,
    material_id: str,
    reviewer_id: str,
    reason: str,
) -> dict[str, Any]:
    """Upgrade one incomplete legacy draft into the existing LangGraph generation path."""
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.personalized_training_materials)
                    .where(tables.personalized_training_materials.c.material_id == material_id)
                    .with_for_update()
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            raise LookupError(f"personalized material not found: {material_id}")
        if (
            row["runtime_kind"] == "langgraph"
            or row["quality_status"] != "unverified_legacy"
            or row["status"] != "ready"
        ):
            raise ValueError("personalized_material_legacy_regeneration_not_allowed")
        if row["active_workflow_run_id"] is not None:
            raise ValueError("personalized_material_has_active_training")
        await connection.execute(
            tables.personalized_training_materials.update()
            .where(tables.personalized_training_materials.c.material_id == material_id)
            .values(
                title="正在升级并重新生成完整材料包",
                paragraphs=[],
                focus_points=[f"目标: {row['requested_goal']}"],
                status="requested",
                generation_attempt_count=0,
                generation_error_code=None,
                next_generation_attempt_at=now,
                claimed_by=None,
                lease_expires_at=None,
                evidence_target_asset_ids=[],
                quality_status="not_evaluated",
                quality_reports=[],
                objective_bundle={},
                question_bank=[],
                grammar_annotations=[],
                transfer_contract=None,
                expression_task=None,
                runtime_kind="langgraph",
                graph_thread_id=stable_thread_id("personalized-content", material_id),
                graph_version=GRAPH_VERSION,
                started_at=None,
                completed_at=None,
                updated_at=now,
            )
        )
        await _insert_event(
            connection,
            material_id=material_id,
            event_type="legacy_regeneration_requested",
            stage="requested",
            attempt=None,
            message=(
                "系统已将旧材料迁入所属用户的完整材料生成链路"
                if reviewer_id == "system_personalized_material_migration"
                else "经用户授权的人工异常处理要求旧材料重新生成"
            ),
            detail={"reviewer_id": reviewer_id, "reason": reason},
            occurred_at=now,
        )
        updated = (
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
    return dict(updated)


async def _claim_personalized_review(
    *,
    row: dict[str, Any],
    review_claim: str,
) -> dict[str, Any]:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        claimed = (
            (
                await connection.execute(
                    tables.personalized_training_materials.update()
                    .where(
                        tables.personalized_training_materials.c.material_id == row["material_id"],
                        tables.personalized_training_materials.c.status == "awaiting_review",
                        sa.or_(
                            tables.personalized_training_materials.c.claimed_by.is_(None),
                            tables.personalized_training_materials.c.lease_expires_at <= now,
                        ),
                    )
                    .values(
                        claimed_by=review_claim,
                        lease_expires_at=now + GENERATION_LEASE,
                        updated_at=now,
                    )
                    .returning(tables.personalized_training_materials)
                )
            )
            .mappings()
            .one_or_none()
        )
    if claimed is None:
        raise ValueError("personalized_material_review_in_progress")
    return dict(claimed)


async def _release_personalized_review_claim(
    *,
    material_id: str,
    review_claim: str,
) -> None:
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.personalized_training_materials.update()
            .where(
                tables.personalized_training_materials.c.material_id == material_id,
                tables.personalized_training_materials.c.status == "awaiting_review",
                tables.personalized_training_materials.c.claimed_by == review_claim,
            )
            .values(
                claimed_by=None,
                lease_expires_at=None,
                updated_at=datetime.now(UTC),
            )
        )


async def _personalized_graph_context(
    material_id: str,
) -> tuple[sa.RowMapping, tuple[dict[str, Any], ...], dict[str, Any]]:
    async with get_engine().connect() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.personalized_training_materials).where(
                        tables.personalized_training_materials.c.material_id == material_id
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            raise LookupError("personalized_material_not_found")
        context_rows = (
            (
                await connection.execute(
                    sa.select(tables.obsidian_learning_context).where(
                        tables.obsidian_learning_context.c.learner_id == row["learner_id"],
                        tables.obsidian_learning_context.c.context_id.in_(
                            row["source_context_ids"]
                        ),
                    )
                )
            )
            .mappings()
            .all()
        )
        adaptation_profile = generation_level_context(
            await latest_level_assessment(connection, str(row["learner_id"]))
        )
        adaptation_profile["recent_material_feedback"] = await recent_material_feedback_context(
            connection,
            str(row["learner_id"]),
        )
    contexts = tuple(
        {
            "kind": str(context["asset_kind"]),
            "title": str(context["title"]),
            "excerpt": str(context["excerpt"]),
        }
        for context in context_rows
    )
    return row, contexts, adaptation_profile


async def _persist_objective(
    row: dict[str, Any],
    objective: LearningObjectiveBundle,
) -> None:
    async with get_engine().begin() as connection:
        result = await connection.execute(
            tables.personalized_training_materials.update()
            .where(
                tables.personalized_training_materials.c.material_id == row["material_id"],
                tables.personalized_training_materials.c.claimed_by == row["claimed_by"],
            )
            .values(
                objective_bundle=objective.model_dump(mode="json"),
                graph_thread_id=row["graph_thread_id"],
                graph_version=GRAPH_VERSION,
                updated_at=datetime.now(UTC),
            )
        )
        if not result.rowcount:
            raise RuntimeError(f"personalized material lease lost: {row['material_id']}")


async def _persist_review_candidate(
    row: dict[str, Any],
    state: dict[str, Any],
) -> None:
    material_id = str(row["material_id"])
    objective = LearningObjectiveBundle.model_validate(state["objective_bundle"])
    article = dict(state["article"])
    questions = tuple(ReadingQuestionArtifact.model_validate(value) for value in state["questions"])
    annotations = tuple(
        GrammarAnalysisArtifact.model_validate(value) for value in state["grammar_annotations"]
    )
    transfer = TransferContract.model_validate(state["transfer_contract"])
    expression = ExpressionTaskArtifact.model_validate(state["expression_task"])
    revision = int(state.get("repair_attempts", 0))
    assessment = await _load_cached_assessment(
        material_id=material_id,
        revision=revision,
    )
    persisted_questions = [
        persisted_question(question, draft=draft)
        for question, draft in zip(
            questions,
            assessment.questions,
            strict=True,
        )
    ]
    persisted_annotations = [
        persisted_grammar(annotation, draft)
        for annotation, draft in zip(
            annotations,
            assessment.grammar_annotations,
            strict=True,
        )
    ]
    expression_payload = persisted_expression(
        objective=objective,
        transfer=transfer,
        expression=expression,
        draft=assessment.transfer,
    )
    article_artifact = ContentArtifact.model_validate(article["artifact"])
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.personalized_training_materials.update()
            .where(tables.personalized_training_materials.c.material_id == material_id)
            .values(
                title=str(article["title"]),
                paragraphs=list(article["paragraphs"]),
                focus_points=list(article.get("focus_points", [])),
                status="awaiting_review",
                quality_status="semantic_review_required",
                quality_reports=list(state["quality_reports"]),
                objective_bundle=objective.model_dump(mode="json"),
                question_bank=persisted_questions,
                grammar_annotations=persisted_annotations,
                transfer_contract=transfer.model_dump(mode="json"),
                expression_task=expression_payload,
                evidence_target_asset_ids=list(objective.source_asset_ids),
                generation_error_code=None,
                claimed_by=None,
                lease_expires_at=None,
                next_generation_attempt_at=None,
                graph_version=str(state["graph_version"]),
                updated_at=now,
            )
        )
        await _insert_event(
            connection,
            material_id=material_id,
            event_type=("semantic_revision_ready" if revision else "semantic_review_requested"),
            stage="awaiting_review",
            attempt=int(row.get("generation_attempt_count", 1)),
            message="完整材料包已通过确定性门, 等待人工语义审核",
            detail={
                "article_artifact_id": article_artifact.artifact_id,
                "question_count": len(questions),
                "grammar_count": len(annotations),
                "repair_attempts": revision,
            },
            occurred_at=now,
        )


async def _publish_reviewed_material(
    *,
    material_id: str,
    state: dict[str, Any],
    publish_key: str,
) -> str:
    decision = dict(state.get("review_decision", {}))
    reviewer_id = str(decision.get("reviewer_id", "personalized_content_review_agent"))
    reason = str(decision.get("reason", "automated_semantic_review_passed"))
    objective = LearningObjectiveBundle.model_validate(state["objective_bundle"])
    article = dict(state["article"])
    questions = tuple(ReadingQuestionArtifact.model_validate(value) for value in state["questions"])
    annotations = tuple(
        GrammarAnalysisArtifact.model_validate(value) for value in state["grammar_annotations"]
    )
    transfer = TransferContract.model_validate(state["transfer_contract"])
    expression = ExpressionTaskArtifact.model_validate(state["expression_task"])
    revision = int(state.get("repair_attempts", 0))
    assessment = await _load_cached_assessment(
        material_id=material_id,
        revision=revision,
    )
    persisted_questions = [
        persisted_question(question, draft=draft)
        for question, draft in zip(questions, assessment.questions, strict=True)
    ]
    persisted_annotations = [
        persisted_grammar(annotation, draft)
        for annotation, draft in zip(
            annotations,
            assessment.grammar_annotations,
            strict=True,
        )
    ]
    expression_payload = persisted_expression(
        objective=objective,
        transfer=transfer,
        expression=expression,
        draft=assessment.transfer,
    )
    existing_reports = [QualityReport.model_validate(value) for value in state["quality_reports"]]
    automated = reviewer_id == "personalized_content_review_agent"
    final_reports = (
        existing_reports
        if automated
        else [
            *existing_reports,
            QualityReport(
                report_id=f"{material_id}_human_{sha256(publish_key.encode()).hexdigest()[:16]}",
                artifact_id=ContentArtifact.model_validate(
                    state["article"]["artifact"]
                ).artifact_id,
                validator_id=reviewer_id,
                validator_version="human-v1",
                result=QualityResult.PASS,
                severity=QualitySeverity.INFO,
                confidence=1.0,
            ),
        ]
    )
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        reviewed_annotations = _human_reviewed_grammar_annotations(
            persisted_annotations,
            reviewer_id=reviewer_id,
            reviewed_at=now,
            automated=automated,
        )
        await connection.execute(
            tables.personalized_training_materials.update()
            .where(tables.personalized_training_materials.c.material_id == material_id)
            .values(
                title=str(article["title"]),
                paragraphs=list(article["paragraphs"]),
                focus_points=list(article.get("focus_points", [])),
                status="ready",
                quality_status="semantic_reviewed",
                objective_bundle=objective.model_dump(mode="json"),
                question_bank=persisted_questions,
                grammar_annotations=reviewed_annotations,
                transfer_contract=transfer.model_dump(mode="json"),
                expression_task=expression_payload,
                evidence_target_asset_ids=list(objective.source_asset_ids),
                quality_reports=[report.model_dump(mode="json") for report in final_reports],
                generation_error_code=None,
                claimed_by=None,
                lease_expires_at=None,
                next_generation_attempt_at=None,
                graph_version=str(state["graph_version"]),
                completed_at=now,
                updated_at=now,
            )
        )
        already_recorded = await connection.scalar(
            sa.select(tables.personalized_material_events.c.event_id).where(
                tables.personalized_material_events.c.material_id == material_id,
                tables.personalized_material_events.c.event_type == "semantic_review_approved",
            )
        )
        if already_recorded is None:
            await _insert_event(
                connection,
                material_id=material_id,
                event_type="semantic_review_approved",
                stage="ready",
                message=(
                    "独立审核 Agent 已批准完整材料包, 允许进入用户训练链路"
                    if automated
                    else "人工异常审核已批准完整材料包, 允许进入用户训练链路"
                ),
                detail={
                    "reviewer_id": reviewer_id,
                    "reason": reason,
                    "publish_key": publish_key,
                },
                occurred_at=now,
            )
    return material_id


def _human_reviewed_grammar_annotations(
    annotations: object,
    *,
    reviewer_id: str,
    reviewed_at: datetime,
    automated: bool = False,
) -> list[dict[str, Any]]:
    if not isinstance(annotations, list) or not annotations:
        raise RuntimeError("personalized_grammar_annotations_missing_during_publish")
    reviewed: list[dict[str, Any]] = []
    for value in annotations:
        if not isinstance(value, dict) or not isinstance(value.get("analysis"), dict):
            raise RuntimeError("personalized_grammar_annotation_invalid_during_publish")
        analysis = dict(value["analysis"])
        analysis.update(
            {
                "parser_id": (
                    "personalized_content_review_agent" if automated else "human_semantic_review"
                ),
                "parser_version": ("prompt_content_judge_v1" if automated else "human-v1"),
                "confidence": 0.9 if automated else 1.0,
                "status": "resolved",
            }
        )
        reviewed.append(
            {
                **value,
                "analysis": analysis,
                "review": {
                    "reviewer_id": reviewer_id,
                    "reviewed_at": reviewed_at.isoformat(),
                },
            }
        )
    return reviewed


async def _reject_reviewed_material(
    *,
    material_id: str,
    reviewer_id: str,
    reason: str,
) -> None:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.personalized_training_materials.update()
            .where(tables.personalized_training_materials.c.material_id == material_id)
            .values(
                status="rejected",
                quality_status="rejected",
                generation_error_code=(
                    "automated_quality_review_rejected"
                    if reviewer_id == "personalized_content_review_agent"
                    else "human_semantic_review_rejected"
                ),
                claimed_by=None,
                lease_expires_at=None,
                completed_at=now,
                updated_at=now,
            )
        )
        await _insert_event(
            connection,
            material_id=material_id,
            event_type="semantic_review_rejected",
            stage="rejected",
            message=(
                "独立审核 Agent 未通过材料包, 未进入用户训练队列"
                if reviewer_id == "personalized_content_review_agent"
                else "经用户授权的人工异常审核拒绝材料包, 未进入训练"
            ),
            detail={"reviewer_id": reviewer_id, "reason": reason},
            occurred_at=now,
        )


async def _cached_personalized_reading(
    *,
    material_id: str,
    revision: int,
    contexts: tuple[dict[str, Any], ...],
    goal: str,
    adaptation_profile: dict[str, Any],
    objective: LearningObjectiveBundle,
) -> PersonalizedReadingOutput:
    request = {
        "contexts": contexts,
        "goal": goal,
        "adaptation_profile": adaptation_profile,
        "objective": objective.model_dump(mode="json"),
        "revision": revision,
    }
    invocation_key = _model_invocation_key(material_id, "article", revision)
    cached = await _reserve_or_load_model_invocation(
        invocation_key=invocation_key,
        material_id=material_id,
        tool_name="personalized_reading.generate",
        request_hash=stable_content_hash(request),
    )
    if cached is not None:
        try:
            cached_output = PersonalizedReadingOutput.model_validate(cached)
            generated_article_grammar_target(
                paragraphs=list(cached_output.paragraphs),
                objective=objective,
            )
            return cached_output
        except (ValidationError, ValueError) as exc:
            output = deterministic_personalized_reading(
                contexts,
                goal=goal,
                adaptation_profile=adaptation_profile,
            )
            generated_article_grammar_target(
                paragraphs=list(output.paragraphs),
                objective=objective,
            )
            await _record_event(
                material_id,
                event_type="reading_deterministic_fallback",
                stage="generating",
                message="缓存文章缺少冻结语法目标, 已切换到同目标的可验证阅读",
                detail={"reason_code": str(exc).split(":", maxsplit=1)[0]},
            )
            await _complete_material_model_invocation(
                invocation_key=invocation_key,
                response_payload=output.model_dump(mode="json"),
            )
            return output
    try:
        output = await generate_personalized_reading(
            contexts,
            goal=goal,
            adaptation_profile=adaptation_profile,
            required_grammar_targets=generated_article_grammar_requirements(objective),
        )
        try:
            generated_article_grammar_target(
                paragraphs=list(output.paragraphs),
                objective=objective,
            )
        except (ValidationError, ValueError) as exc:
            output = deterministic_personalized_reading(
                contexts,
                goal=goal,
                adaptation_profile=adaptation_profile,
            )
            generated_article_grammar_target(
                paragraphs=list(output.paragraphs),
                objective=objective,
            )
            await _record_event(
                material_id,
                event_type="reading_deterministic_fallback",
                stage="generating",
                message="模型文章缺少冻结语法目标, 已切换到同目标的可验证阅读",
                detail={"reason_code": str(exc).split(":", maxsplit=1)[0]},
            )
    except Exception:
        await _release_model_invocation(invocation_key)
        raise
    await _complete_material_model_invocation(
        invocation_key=invocation_key,
        response_payload=output.model_dump(mode="json"),
    )
    return output


async def _cached_personalized_assessment(
    *,
    material_id: str,
    revision: int,
    objective: LearningObjectiveBundle,
    article: dict[str, Any],
) -> PersonalizedAssessmentOutput:
    request = {
        "objective": objective.model_dump(mode="json"),
        "article": article,
        "revision": revision,
    }
    invocation_key = _model_invocation_key(material_id, "assessment", revision)
    cached = await _reserve_or_load_model_invocation(
        invocation_key=invocation_key,
        material_id=material_id,
        tool_name="personalized_reading.assess",
        request_hash=stable_content_hash(request),
    )
    if cached is not None:
        try:
            cached_output = PersonalizedAssessmentOutput.model_validate(cached)
            _validate_personalized_assessment(
                material_id=material_id,
                objective=objective,
                article=article,
                assessment=cached_output,
            )
            return cached_output
        except (ValidationError, ValueError) as exc:
            output = deterministic_assessment(article=article, objective=objective)
            _validate_personalized_assessment(
                material_id=material_id,
                objective=objective,
                article=article,
                assessment=output,
            )
            await _record_event(
                material_id,
                event_type="assessment_deterministic_fallback",
                stage="generating",
                message="缓存题包未通过确定性门, 已生成同文章的可验证题包",
                detail={"reason_code": type(exc).__name__},
            )
            await _complete_material_model_invocation(
                invocation_key=invocation_key,
                response_payload=output.model_dump(mode="json"),
            )
            return output
    adapter = personalized_assessment_adapter(get_settings())
    fallback_reason: str | None = None
    try:
        if adapter is None:
            output = deterministic_assessment(article=article, objective=objective)
        else:
            try:
                output = await adapter.generate(
                    title=str(article["title"]),
                    paragraphs=[str(value) for value in article["paragraphs"]],
                    objective_bundle=objective.model_dump(mode="json"),
                )
                _validate_personalized_assessment(
                    material_id=material_id,
                    objective=objective,
                    article=article,
                    assessment=output,
                )
            except (
                ValidationError,
                ValueError,
                httpx2.TransportError,
                httpx2.HTTPStatusError,
                TimeoutError,
            ) as exc:
                fallback_reason = type(exc).__name__
                output = deterministic_assessment(article=article, objective=objective)
        _validate_personalized_assessment(
            material_id=material_id,
            objective=objective,
            article=article,
            assessment=output,
        )
    except Exception:
        await _release_model_invocation(invocation_key)
        raise
    if fallback_reason is not None:
        await _record_event(
            material_id,
            event_type="assessment_deterministic_fallback",
            stage="generating",
            message="模型题包未通过确定性门, 已基于同一篇个性化文章生成可验证题包",
            detail={"reason_code": fallback_reason},
        )
    await _complete_material_model_invocation(
        invocation_key=invocation_key,
        response_payload=output.model_dump(mode="json"),
    )
    return output


def _validate_personalized_assessment(
    *,
    material_id: str,
    objective: LearningObjectiveBundle,
    article: dict[str, Any],
    assessment: PersonalizedAssessmentOutput,
) -> None:
    questions = build_question_artifacts(
        material_id=material_id,
        objective=objective,
        article=article,
        assessment=assessment,
    )
    build_grammar_artifacts(
        material_id=material_id,
        objective=objective,
        article=article,
        assessment=assessment,
    )
    build_transfer_artifacts(
        material_id=material_id,
        objective=objective,
        article=article,
        questions=questions,
        assessment=assessment,
    )


async def _load_cached_assessment(
    *,
    material_id: str,
    revision: int,
) -> PersonalizedAssessmentOutput:
    invocation_key = _model_invocation_key(material_id, "assessment", revision)
    async with get_engine().connect() as connection:
        payload = await connection.scalar(
            sa.select(tables.model_invocation_ledger.c.response_payload).where(
                tables.model_invocation_ledger.c.invocation_key == invocation_key,
                tables.model_invocation_ledger.c.status == "completed",
            )
        )
    if not isinstance(payload, dict):
        raise RuntimeError("personalized_assessment_cache_missing")
    return PersonalizedAssessmentOutput.model_validate(payload)


async def _reserve_or_load_model_invocation(
    *,
    invocation_key: str,
    material_id: str,
    tool_name: str,
    request_hash: str,
) -> dict[str, Any] | None:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        inserted = await connection.execute(
            pg_insert(tables.model_invocation_ledger)
            .values(
                invocation_key=invocation_key,
                tool_name=tool_name,
                workflow_run_id=material_id,
                task_id=material_id,
                request_hash=request_hash,
                status="pending",
                response_payload=None,
                output_hash=None,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(index_elements=["invocation_key"])
        )
        if inserted.rowcount:
            return None
        row = (
            (
                await connection.execute(
                    sa.select(tables.model_invocation_ledger)
                    .where(tables.model_invocation_ledger.c.invocation_key == invocation_key)
                    .with_for_update()
                )
            )
            .mappings()
            .one()
        )
        if row["request_hash"] != request_hash:
            raise RuntimeError("personalized_model_invocation_hash_mismatch")
        if row["status"] == "completed" and isinstance(row["response_payload"], dict):
            return dict(row["response_payload"])
        if row["updated_at"] <= now - GENERATION_LEASE:
            await connection.execute(
                tables.model_invocation_ledger.update()
                .where(tables.model_invocation_ledger.c.invocation_key == invocation_key)
                .values(updated_at=now)
            )
            return None
    raise RuntimeError("personalized_model_invocation_in_progress")


async def _complete_material_model_invocation(
    *,
    invocation_key: str,
    response_payload: dict[str, Any],
) -> None:
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.model_invocation_ledger.update()
            .where(tables.model_invocation_ledger.c.invocation_key == invocation_key)
            .values(
                status="completed",
                response_payload=response_payload,
                output_hash=stable_content_hash(response_payload),
                updated_at=datetime.now(UTC),
            )
        )


async def _release_model_invocation(invocation_key: str) -> None:
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.model_invocation_ledger.delete().where(
                tables.model_invocation_ledger.c.invocation_key == invocation_key,
                tables.model_invocation_ledger.c.status == "pending",
            )
        )


async def _handle_langgraph_generation_failure(
    row: dict[str, Any],
    exc: Exception,
    *,
    failed_node: str | None,
) -> str:
    now = datetime.now(UTC)
    attempts = int(row["generation_attempt_count"])
    balance_failure = _model_balance_failure(exc)
    terminal = balance_failure is not None or attempts >= MAX_GENERATION_ATTEMPTS
    delay = timedelta(seconds=30 * 2 ** max(0, attempts - 1))
    status = "generation_failed" if terminal else "requested"
    error_code = (
        balance_failure[0]
        if balance_failure is not None
        else f"{type(exc).__name__}:{str(exc)[:80]}"
    )
    async with get_engine().begin() as connection:
        result = await connection.execute(
            tables.personalized_training_materials.update()
            .where(
                tables.personalized_training_materials.c.material_id == row["material_id"],
                tables.personalized_training_materials.c.claimed_by == row["claimed_by"],
            )
            .values(
                status=status,
                generation_error_code=error_code,
                next_generation_attempt_at=None if terminal else now + delay,
                claimed_by=None,
                lease_expires_at=None,
                updated_at=now,
            )
        )
        if not result.rowcount:
            raise RuntimeError(f"personalized material lease lost: {row['material_id']}") from exc
        await _insert_event(
            connection,
            material_id=str(row["material_id"]),
            event_type="generation_failed" if terminal else "generation_retry_scheduled",
            stage=status,
            attempt=attempts,
            message=(
                balance_failure[1]
                if balance_failure is not None
                else "失败节点已保留检查点, 等待人工修复后继续"
                if terminal
                else "失败节点已保留检查点, 已安排从该节点自动恢复"
            ),
            detail={
                "error_code": error_code,
                "diagnostic": str(exc)[:1000],
                "runtime_kind": "langgraph",
                "failed_node": failed_node,
                "recovery_mode": (
                    "human_checkpoint_resume" if terminal else "automatic_checkpoint_resume"
                ),
            },
            occurred_at=now,
        )
    return status


def _model_invocation_key(material_id: str, component: str, revision: int) -> str:
    return sha256(f"{material_id}:{component}:r{revision}".encode()).hexdigest()


def _revision_from_key(key: str) -> int:
    marker = key.rsplit(":r", maxsplit=1)
    if len(marker) != 2 or not marker[1].isdigit():
        raise ValueError("personalized_component_revision_missing")
    return int(marker[1])


def _graph_config(row: dict[str, Any]) -> RunnableConfig:
    thread_id = row.get("graph_thread_id")
    if not isinstance(thread_id, str) or not thread_id:
        raise ValueError("personalized_graph_thread_id_missing")
    return {"configurable": {"thread_id": thread_id}}


async def generate_personalized_reading(
    contexts: tuple[dict[str, Any], ...],
    *,
    goal: str,
    adaptation_profile: dict[str, Any] | None = None,
    required_grammar_targets: list[str] | None = None,
) -> PersonalizedReadingOutput:
    resolved_profile = adaptation_profile or {
        "overall_level": "developing",
        "dimensions": {},
        "confidence_band": "low",
        "instruction": "证据不足, 采用保守负荷。",
    }
    adapter = personalized_reading_adapter(get_settings())
    if adapter is not None:
        return await adapter.generate(
            contexts,
            goal=goal,
            adaptation_profile=resolved_profile,
            required_grammar_targets=required_grammar_targets or [],
        )
    return deterministic_personalized_reading(
        contexts,
        goal=goal,
        adaptation_profile=resolved_profile,
    )


def deterministic_personalized_reading(
    contexts: tuple[dict[str, Any], ...],
    *,
    goal: str,
    adaptation_profile: dict[str, Any],
) -> PersonalizedReadingOutput:
    return PersonalizedReadingOutput(
        title="A Second Look at Familiar Ideas",
        paragraphs=[
            "A learner may meet the same idea in very different settings. Recent notes about "
            "a familiar language pattern can therefore become more useful when they are tested "
            "in a new context "
            "rather than simply reread.",
            "Imagine a small research team that changes its plan after an early result appears "
            "convincing. Although the first explanation seems natural, one member checks the "
            "evidence, separates the main claim from its supporting details, and notices a "
            "condition that everyone else has ignored.",
            "The team does not discard its earlier knowledge. Instead, it transfers that "
            "knowledge carefully, asking which pattern still applies and which part depends "
            "on the new situation. This deliberate comparison turns a remembered rule into "
            "a flexible reading skill.",
        ],
        focus_points=[
            f"目标: {goal}",
            f"当前适配水平: {adaptation_profile['overall_level']}",
            *[f"迁移复现: {item['title']}" for item in contexts[:3]],
        ][:5],
        source_titles=[str(item["title"]) for item in contexts[:3]],
    )


async def _mark_validating(material_id: str, *, claimed_by: str) -> None:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        result = await connection.execute(
            tables.personalized_training_materials.update()
            .where(
                tables.personalized_training_materials.c.material_id == material_id,
                tables.personalized_training_materials.c.claimed_by == claimed_by,
            )
            .values(
                status="validating",
                lease_expires_at=now + GENERATION_LEASE,
                updated_at=now,
            )
        )
        if not result.rowcount:
            raise RuntimeError(f"personalized material lease lost: {material_id}")
        await _insert_event(
            connection,
            material_id=material_id,
            event_type="validation_started",
            stage="validating",
            message="正在校验段落数量、重复内容、Agent 轨迹和来源映射",
            occurred_at=now,
        )


async def _heartbeat_personalized_lease(*, material_id: str, claimed_by: str) -> None:
    while True:
        await asyncio.sleep(5)
        now = datetime.now(UTC)
        async with get_engine().begin() as connection:
            result = await connection.execute(
                tables.personalized_training_materials.update()
                .where(
                    tables.personalized_training_materials.c.material_id == material_id,
                    tables.personalized_training_materials.c.claimed_by == claimed_by,
                    tables.personalized_training_materials.c.status.in_(
                        ("generating", "validating")
                    ),
                )
                .values(lease_expires_at=now + GENERATION_LEASE, updated_at=now)
            )
            if not result.rowcount:
                raise RuntimeError(f"personalized material lease lost: {material_id}")
            await connection.execute(
                tables.content_worker_runtime.update()
                .where(tables.content_worker_runtime.c.worker_id == "content-worker-primary")
                .values(state="running", current_job_id=material_id, heartbeat_at=now)
            )


async def _set_worker_activity(*, state: str, material_id: str | None) -> None:
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.content_worker_runtime.update()
            .where(tables.content_worker_runtime.c.worker_id == "content-worker-primary")
            .values(
                state=state,
                current_job_id=material_id,
                heartbeat_at=datetime.now(UTC),
            )
        )


async def _record_event(
    material_id: str,
    *,
    event_type: str,
    stage: str,
    message: str,
    attempt: int | None = None,
    detail: dict[str, Any] | None = None,
) -> None:
    async with get_engine().begin() as connection:
        await _insert_event(
            connection,
            material_id=material_id,
            event_type=event_type,
            stage=stage,
            attempt=attempt,
            message=message,
            detail=detail,
        )


async def _insert_event(
    connection: Any,
    *,
    material_id: str,
    event_type: str,
    stage: str,
    message: str,
    attempt: int | None = None,
    detail: dict[str, Any] | None = None,
    occurred_at: datetime | None = None,
) -> None:
    await connection.execute(
        tables.personalized_material_events.insert().values(
            material_id=material_id,
            event_type=event_type,
            stage=stage,
            attempt=attempt,
            message=message,
            detail=detail or {},
            occurred_at=occurred_at or datetime.now(UTC),
        )
    )


def _validate_generated_reading(
    output: PersonalizedReadingOutput,
    contexts: tuple[dict[str, Any], ...],
) -> None:
    if not contexts:
        raise ValueError("personalized_context_missing")
    normalized = [" ".join(paragraph.lower().split()) for paragraph in output.paragraphs]
    if len(normalized) != len(set(normalized)):
        raise ValueError("personalized_paragraph_duplicate")
