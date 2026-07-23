"""Queue and evaluate the learner's current adaptation level."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import sqlalchemy as sa
from binnagent_agent.agents.level_assessor import (
    LevelAssessmentAgent,
    LevelAssessmentOutput,
    LevelEvidenceSummary,
)
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.database import get_engine
from binnagent_api.vertical_slice import tables

_agent = LevelAssessmentAgent()


async def enqueue_level_assessment(
    connection: AsyncConnection,
    *,
    learner_id: str | None,
    workflow_run_id: str,
    now: datetime,
) -> None:
    if learner_id is None:
        return
    await connection.execute(
        postgresql_insert(tables.learner_level_assessments)
        .values(
            assessment_id=f"level_assessment_{uuid4().hex}",
            learner_id=learner_id,
            trigger_workflow_run_id=workflow_run_id,
            status="queued",
            evidence_summary={},
            dimensions={},
            evidence_count=0,
            reason_codes=[],
            attempt_count=0,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_nothing(
            index_elements=[tables.learner_level_assessments.c.trigger_workflow_run_id]
        )
    )


async def process_next_level_assessment() -> bool:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.learner_level_assessments)
                    .where(tables.learner_level_assessments.c.status == "queued")
                    .order_by(tables.learner_level_assessments.c.created_at)
                    .with_for_update(skip_locked=True)
                    .limit(1)
                )
            )
            .mappings()
            .first()
        )
        if row is None:
            return False
        assessment_id = str(row["assessment_id"])
        await connection.execute(
            tables.learner_level_assessments.update()
            .where(tables.learner_level_assessments.c.assessment_id == assessment_id)
            .values(
                status="processing",
                attempt_count=tables.learner_level_assessments.c.attempt_count + 1,
                updated_at=now,
            )
        )
    try:
        async with get_engine().connect() as connection:
            evidence = await collect_level_evidence(connection, str(row["learner_id"]))
        output = _agent.assess(evidence)
    except Exception as exc:
        async with get_engine().begin() as connection:
            await connection.execute(
                tables.learner_level_assessments.update()
                .where(tables.learner_level_assessments.c.assessment_id == assessment_id)
                .values(
                    status="failed", error_code=type(exc).__name__, updated_at=datetime.now(UTC)
                )
            )
        return True
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.learner_level_assessments.update()
            .where(tables.learner_level_assessments.c.assessment_id == assessment_id)
            .values(
                status="completed",
                evidence_summary=evidence.model_dump(),
                overall_level=output.overall_level,
                dimensions=output.dimensions.model_dump(),
                confidence_band=output.confidence_band,
                evidence_count=output.evidence_count,
                reason_codes=output.reason_codes,
                error_code=None,
                updated_at=datetime.now(UTC),
                completed_at=datetime.now(UTC),
            )
        )
    return True


async def collect_level_evidence(
    connection: AsyncConnection, learner_id: str
) -> LevelEvidenceSummary:
    owned_tasks = (
        sa.select(tables.learning_tasks.c.task_id)
        .join(
            tables.workflow_runs,
            tables.workflow_runs.c.workflow_run_id == tables.learning_tasks.c.workflow_run_id,
        )
        .where(tables.workflow_runs.c.learner_id == learner_id)
    )
    task_rows = (
        (
            await connection.execute(
                sa.select(
                    tables.learning_tasks.c.task_id,
                    tables.learning_tasks.c.task_type,
                    tables.learning_tasks.c.state,
                    tables.learning_tasks.c.highest_hint_level,
                ).where(tables.learning_tasks.c.task_id.in_(owned_tasks))
            )
        )
        .mappings()
        .all()
    )
    task_ids = [str(row["task_id"]) for row in task_rows]
    completed_rows = [row for row in task_rows if str(row["state"]) == "completed"]
    independent = sum(int(row["highest_hint_level"]) == 0 for row in completed_rows)
    hinted = sum(int(row["highest_hint_level"]) > 0 for row in completed_rows)
    expression_attempts = sum(str(row["task_type"]) == "micro_expression" for row in completed_rows)

    async def count(table: sa.Table, condition: Any) -> int:
        if not task_ids:
            return 0
        value = await connection.scalar(
            sa.select(sa.func.count()).select_from(table).where(condition)
        )
        return int(value or 0)

    revision_count = await count(
        tables.revision_events, tables.revision_events.c.task_id.in_(task_ids)
    )
    annotation_count = await count(
        tables.task_annotations, tables.task_annotations.c.task_id.in_(task_ids)
    )
    grammar_rows = (
        (
            await connection.execute(
                sa.select(
                    tables.task_grammar_challenges.c.attempt_count,
                    tables.task_grammar_challenges.c.resolved,
                ).where(tables.task_grammar_challenges.c.task_id.in_(task_ids or ["__none__"]))
            )
        )
        .mappings()
        .all()
    )
    ratings = (
        (
            await connection.execute(
                sa.select(tables.difficulty_feedback_events.c.rating)
                .join(
                    tables.workflow_runs,
                    tables.workflow_runs.c.workflow_run_id
                    == tables.difficulty_feedback_events.c.workflow_run_id,
                )
                .where(
                    tables.workflow_runs.c.learner_id == learner_id,
                    tables.difficulty_feedback_events.c.rating.is_not(None),
                )
            )
        )
        .scalars()
        .all()
    )
    return LevelEvidenceSummary(
        completed_tasks=len(completed_rows),
        independent_tasks=independent,
        hinted_tasks=hinted,
        revision_count=revision_count,
        annotation_count=annotation_count,
        grammar_attempts=sum(int(row["attempt_count"]) for row in grammar_rows),
        grammar_resolved=sum(bool(row["resolved"]) for row in grammar_rows),
        expression_attempts=expression_attempts,
        difficulty_too_easy=sum(rating == "too_easy" for rating in ratings),
        difficulty_matched=sum(rating == "matched" for rating in ratings),
        difficulty_too_hard=sum(rating == "too_hard" for rating in ratings),
    )


async def latest_level_assessment(
    connection: AsyncConnection, learner_id: str
) -> LevelAssessmentOutput | None:
    row = (
        (
            await connection.execute(
                sa.select(tables.learner_level_assessments)
                .where(
                    tables.learner_level_assessments.c.learner_id == learner_id,
                    tables.learner_level_assessments.c.status == "completed",
                )
                .order_by(tables.learner_level_assessments.c.completed_at.desc())
                .limit(1)
            )
        )
        .mappings()
        .first()
    )
    if row is None:
        return None
    return LevelAssessmentOutput.model_validate(
        {
            "overall_level": row["overall_level"],
            "dimensions": row["dimensions"],
            "confidence_band": row["confidence_band"],
            "evidence_count": row["evidence_count"],
            "reason_codes": row["reason_codes"],
        }
    )


def generation_level_context(output: LevelAssessmentOutput | None) -> dict[str, Any]:
    if output is None:
        return {
            "overall_level": "developing",
            "dimensions": {},
            "confidence_band": "low",
            "instruction": "证据不足, 使用保守负荷并避免突然增加多个挑战维度。",
        }
    return {
        "overall_level": output.overall_level,
        "dimensions": output.dimensions.model_dump(),
        "confidence_band": output.confidence_band,
        "instruction": (
            "以当前适配水平控制词汇、句法、篇章关系和任务支架; 低置信度时只调整一个挑战维度。"
        ),
    }


def postgresql_insert(table: sa.Table):  # type: ignore[no-untyped-def]
    from sqlalchemy.dialects.postgresql import insert

    return insert(table)
