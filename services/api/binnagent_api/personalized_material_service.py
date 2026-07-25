"""Application service for durable personalized-reading material jobs."""

from __future__ import annotations

import asyncio
import os
import socket
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any
from uuid import uuid4

import sqlalchemy as sa
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
from binnagent_evaluation.trajectory import evaluate_trajectory
from langchain_core.runnables import RunnableConfig
from langgraph.types import Command
from sqlalchemy.dialects.postgresql import insert as pg_insert

from binnagent_api.database import get_engine
from binnagent_api.knowledge_extraction_service import enrich_review_contexts
from binnagent_api.learner_level_service import (
    generation_level_context,
    latest_level_assessment,
    recent_material_feedback_context,
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
    build_objective_bundle,
    build_question_artifacts,
    build_transfer_artifacts,
    deterministic_assessment,
    persisted_expression,
    persisted_grammar,
    persisted_question,
    structural_quality_reports,
)
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

MAX_GENERATION_ATTEMPTS = 3
GENERATION_LEASE = timedelta(minutes=3)


def _worker_identity() -> str:
    return f"personalized:{socket.gethostname()}:{os.getpid()}"


async def process_next_personalized_material() -> bool:
    claimed = await _claim_personalized_material(worker_id=_worker_identity())
    if claimed is None:
        return False
    await _set_worker_activity(state="running", material_id=str(claimed["material_id"]))
    try:
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
        return await _generate_with_claim(row)
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
        terminal = attempts >= MAX_GENERATION_ATTEMPTS
        delay = timedelta(seconds=30 * 2 ** max(0, attempts - 1))
        async with get_engine().begin() as connection:
            result = await connection.execute(
                tables.personalized_training_materials.update()
                .where(
                    tables.personalized_training_materials.c.material_id == material_id,
                    tables.personalized_training_materials.c.claimed_by == row["claimed_by"],
                )
                .values(
                    status="generation_failed" if terminal else "requested",
                    generation_error_code=f"{type(exc).__name__}:{str(exc)[:80]}",
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
                    "个性化材料生成失败, 已达到最大尝试次数"
                    if terminal
                    else "本次生成失败, 已安排自动重试"
                ),
                detail={
                    "error_code": f"{type(exc).__name__}:{str(exc)[:80]}",
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
    objective = build_objective_bundle(
        material_id=material_id,
        learner_id=str(row["learner_id"]),
        source_asset_ids=[str(value["asset_id"]) for value in context_rows],
        goal=str(row["requested_goal"]),
        adaptation_profile=adaptation_profile,
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
            result = await graph.ainvoke(
                {
                    "objective_bundle": objective.model_dump(mode="json"),
                    "repair_attempts": 0,
                    "workflow_status": "queued",
                    "graph_version": GRAPH_VERSION,
                },
                config,
            )
        if result.get("__interrupt__"):
            await _persist_review_candidate(row, dict(result))
            return "awaiting_review"
        raise RuntimeError("personalized_graph_review_interrupt_missing")
    except Exception as exc:
        return await _handle_langgraph_generation_failure(row, exc)


def _build_personalized_material_graph(
    *,
    row: dict[str, Any],
    contexts: tuple[dict[str, Any], ...],
    adaptation_profile: dict[str, Any],
    checkpointer: Any,
) -> Any:
    material_id = str(row["material_id"])

    async def generate_article(
        objective: LearningObjectiveBundle,
        key: str,
    ) -> dict[str, Any]:
        revision = _revision_from_key(key)
        output = await _cached_personalized_reading(
            material_id=material_id,
            revision=revision,
            contexts=contexts,
            goal=str(row["requested_goal"]),
            adaptation_profile=adaptation_profile,
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

    return build_personalized_content_graph(
        article_generator=generate_article,
        question_generator=generate_questions,
        quality_validator=lambda _objective, _article, _questions: (),
        language_generator=generate_language,
        transfer_generator=generate_transfer,
        package_quality_validator=lambda state: structural_quality_reports(dict(state)),
        publisher=publish,
        checkpointer=checkpointer,
        graph_version=str(row["graph_version"] or GRAPH_VERSION),
    )


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
        raise ValueError("personalized_material_not_langgraph")
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
    decision = dict(state["review_decision"])
    reviewer_id = str(decision["reviewer_id"])
    reason = str(decision.get("reason", "human_semantic_review"))
    existing_reports = [QualityReport.model_validate(value) for value in state["quality_reports"]]
    human_report = QualityReport(
        report_id=f"{material_id}_human_{sha256(publish_key.encode()).hexdigest()[:16]}",
        artifact_id=ContentArtifact.model_validate(state["article"]["artifact"]).artifact_id,
        validator_id=reviewer_id,
        validator_version="human-v1",
        result=QualityResult.PASS,
        severity=QualitySeverity.INFO,
        confidence=1.0,
    )
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        stored_annotations = await connection.scalar(
            sa.select(tables.personalized_training_materials.c.grammar_annotations)
            .where(tables.personalized_training_materials.c.material_id == material_id)
            .with_for_update()
        )
        reviewed_annotations = _human_reviewed_grammar_annotations(
            stored_annotations,
            reviewer_id=reviewer_id,
            reviewed_at=now,
        )
        await connection.execute(
            tables.personalized_training_materials.update()
            .where(tables.personalized_training_materials.c.material_id == material_id)
            .values(
                status="ready",
                quality_status="semantic_reviewed",
                grammar_annotations=reviewed_annotations,
                quality_reports=[
                    *[report.model_dump(mode="json") for report in existing_reports],
                    human_report.model_dump(mode="json"),
                ],
                generation_error_code=None,
                claimed_by=None,
                lease_expires_at=None,
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
                message="人工审核已批准完整材料包, 允许进入既有训练链路",
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
                "parser_id": "human_semantic_review",
                "parser_version": "human-v1",
                "confidence": 1.0,
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
                generation_error_code="human_semantic_review_rejected",
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
            message="人工审核拒绝材料包, 未进入训练",
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
) -> PersonalizedReadingOutput:
    request = {
        "contexts": contexts,
        "goal": goal,
        "adaptation_profile": adaptation_profile,
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
        return PersonalizedReadingOutput.model_validate(cached)
    try:
        output = await generate_personalized_reading(
            contexts,
            goal=goal,
            adaptation_profile=adaptation_profile,
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
        return PersonalizedAssessmentOutput.model_validate(cached)
    adapter = personalized_assessment_adapter(get_settings())
    try:
        if adapter is None:
            output = deterministic_assessment(article=article, objective=objective)
        else:
            output = await adapter.generate(
                title=str(article["title"]),
                paragraphs=[str(value) for value in article["paragraphs"]],
                objective_bundle=objective.model_dump(mode="json"),
            )
    except Exception:
        await _release_model_invocation(invocation_key)
        raise
    await _complete_material_model_invocation(
        invocation_key=invocation_key,
        response_payload=output.model_dump(mode="json"),
    )
    return output


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
) -> str:
    now = datetime.now(UTC)
    attempts = int(row["generation_attempt_count"])
    terminal = attempts >= MAX_GENERATION_ATTEMPTS
    delay = timedelta(seconds=30 * 2 ** max(0, attempts - 1))
    status = "generation_failed" if terminal else "requested"
    async with get_engine().begin() as connection:
        result = await connection.execute(
            tables.personalized_training_materials.update()
            .where(
                tables.personalized_training_materials.c.material_id == row["material_id"],
                tables.personalized_training_materials.c.claimed_by == row["claimed_by"],
            )
            .values(
                status=status,
                generation_error_code=f"{type(exc).__name__}:{str(exc)[:80]}",
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
                "完整个性化材料工作流失败, 已达到最大尝试次数"
                if terminal
                else "完整个性化材料工作流失败, 已安排安全重试"
            ),
            detail={
                "error_code": f"{type(exc).__name__}:{str(exc)[:80]}",
                "diagnostic": str(exc)[:1000],
                "runtime_kind": "langgraph",
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
        )
    focus = ", ".join(str(item["title"]) for item in contexts[:3])
    return PersonalizedReadingOutput(
        title="A Second Look at Familiar Ideas",
        paragraphs=[
            "A learner may meet the same idea in very different settings. Recent notes about "
            f"{focus} can therefore become more useful when they are tested in a new context "
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
            f"当前适配水平: {resolved_profile['overall_level']}",
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
