"""Application service for durable personalized-reading material jobs."""

from __future__ import annotations

import asyncio
import os
import socket
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import sqlalchemy as sa
from binnagent_evaluation.trajectory import evaluate_trajectory

from binnagent_api.database import get_engine
from binnagent_api.knowledge_extraction_service import enrich_review_contexts
from binnagent_api.model_adapters import PersonalizedReadingOutput, personalized_reading_adapter
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
    contexts = tuple(
        {
            "kind": str(context["asset_kind"]),
            "title": str(context["title"]),
            "excerpt": str(context["excerpt"]),
        }
        for context in context_rows
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
            message="个性化材料已通过校验并进入学习队列",
            detail={"evidence_target_count": len(target_asset_ids)},
        )
    return "ready"


async def generate_personalized_reading(
    contexts: tuple[dict[str, Any], ...],
    *,
    goal: str,
) -> PersonalizedReadingOutput:
    adapter = personalized_reading_adapter(get_settings())
    if adapter is not None:
        return await adapter.generate(contexts, goal=goal)
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
