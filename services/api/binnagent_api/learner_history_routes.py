"""Account-owned, paginated training history projected from workflow facts."""

from __future__ import annotations

import math
from datetime import UTC, datetime, timedelta

import sqlalchemy as sa
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.database import get_engine
from binnagent_api.learner_auth import LearnerIdentity
from binnagent_api.vertical_slice import tables

learner_history_router = APIRouter(prefix="/v1/training-history", tags=["training-history"])


class TrainingHistoryItemView(BaseModel):
    workflow_run_id: str
    run_version: int
    run_kind: str
    completed_at: datetime
    difficulty_rating: str | None
    completed_task_count: int
    supported_task_count: int
    matched_content_version_id: str | None


class TrainingHistorySummaryView(BaseModel):
    completed_sessions: int
    independent_sessions: int
    completed_tasks: int
    supported_tasks: int
    completed_last_7_days: int


class TrainingHistoryPageView(BaseModel):
    items: list[TrainingHistoryItemView]
    page: int
    page_size: int
    total_items: int
    total_pages: int
    summary: TrainingHistorySummaryView


@learner_history_router.get("", response_model=TrainingHistoryPageView)
async def get_training_history(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=5, ge=1, le=20),
) -> TrainingHistoryPageView:
    identity: LearnerIdentity = request.state.learner_identity
    completed_runs = (
        sa.select(tables.workflow_runs.c.workflow_run_id)
        .where(
            tables.workflow_runs.c.learner_id == identity.learner_id,
            tables.workflow_runs.c.state == "completed",
        )
        .subquery()
    )
    async with get_engine().connect() as connection:
        total_items = int(
            await connection.scalar(sa.select(sa.func.count()).select_from(completed_runs)) or 0
        )
        rows = (
            (
                await connection.execute(
                    sa.select(tables.workflow_runs)
                    .where(
                        tables.workflow_runs.c.learner_id == identity.learner_id,
                        tables.workflow_runs.c.state == "completed",
                    )
                    .order_by(
                        tables.workflow_runs.c.updated_at.desc(),
                        tables.workflow_runs.c.workflow_run_id.desc(),
                    )
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .mappings()
            .all()
        )
        run_ids = [str(row["workflow_run_id"]) for row in rows]
        task_stats = await _task_stats(connection, run_ids)
        matched_versions = await _matched_versions(connection, run_ids)
        completed_tasks, supported_tasks, supported_sessions = await _all_task_stats(
            connection, identity.learner_id
        )
        completed_last_7_days = int(
            await connection.scalar(
                sa.select(sa.func.count())
                .select_from(tables.workflow_runs)
                .where(
                    tables.workflow_runs.c.learner_id == identity.learner_id,
                    tables.workflow_runs.c.state == "completed",
                    tables.workflow_runs.c.updated_at >= datetime.now(UTC) - timedelta(days=7),
                )
            )
            or 0
        )
    total_pages = math.ceil(total_items / page_size) if total_items else 0
    return TrainingHistoryPageView(
        items=[
            TrainingHistoryItemView(
                workflow_run_id=str(row["workflow_run_id"]),
                run_version=int(row["version"]),
                run_kind=str(row["run_kind"]),
                completed_at=row["updated_at"],
                difficulty_rating=(
                    str(row["difficulty_rating"]) if row["difficulty_rating"] is not None else None
                ),
                completed_task_count=task_stats.get(str(row["workflow_run_id"]), (0, 0))[0],
                supported_task_count=task_stats.get(str(row["workflow_run_id"]), (0, 0))[1],
                matched_content_version_id=matched_versions.get(str(row["workflow_run_id"])),
            )
            for row in rows
        ],
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        summary=TrainingHistorySummaryView(
            completed_sessions=total_items,
            independent_sessions=max(0, total_items - supported_sessions),
            completed_tasks=completed_tasks,
            supported_tasks=supported_tasks,
            completed_last_7_days=completed_last_7_days,
        ),
    )


async def _task_stats(
    connection: AsyncConnection, run_ids: list[str]
) -> dict[str, tuple[int, int]]:
    if not run_ids:
        return {}
    rows = (
        await connection.execute(
            sa.select(
                tables.run_task_completion_events.c.workflow_run_id,
                sa.func.count().label("completed"),
                sa.func.count()
                .filter(tables.run_task_completion_events.c.highest_hint_level > 0)
                .label("supported"),
            )
            .where(tables.run_task_completion_events.c.workflow_run_id.in_(run_ids))
            .group_by(tables.run_task_completion_events.c.workflow_run_id)
        )
    ).all()
    return {str(row.workflow_run_id): (int(row.completed), int(row.supported)) for row in rows}


async def _matched_versions(connection: AsyncConnection, run_ids: list[str]) -> dict[str, str]:
    if not run_ids:
        return {}
    rows = (
        await connection.execute(
            sa.select(
                tables.run_task_refs.c.workflow_run_id,
                tables.run_task_refs.c.content_version_id,
            ).where(
                tables.run_task_refs.c.workflow_run_id.in_(run_ids),
                tables.run_task_refs.c.role == "matched_reading",
            )
        )
    ).all()
    return {str(row.workflow_run_id): str(row.content_version_id) for row in rows}


async def _all_task_stats(connection: AsyncConnection, learner_id: str) -> tuple[int, int, int]:
    row = (
        await connection.execute(
            sa.select(
                sa.func.count(tables.run_task_completion_events.c.completion_event_id).label(
                    "completed"
                ),
                sa.func.count(tables.run_task_completion_events.c.completion_event_id)
                .filter(tables.run_task_completion_events.c.highest_hint_level > 0)
                .label("supported"),
                sa.func.count(sa.distinct(tables.run_task_completion_events.c.workflow_run_id))
                .filter(tables.run_task_completion_events.c.highest_hint_level > 0)
                .label("supported_sessions"),
            )
            .select_from(
                tables.run_task_completion_events.join(
                    tables.workflow_runs,
                    tables.workflow_runs.c.workflow_run_id
                    == tables.run_task_completion_events.c.workflow_run_id,
                )
            )
            .where(
                tables.workflow_runs.c.learner_id == learner_id,
                tables.workflow_runs.c.state == "completed",
            )
        )
    ).one()
    return int(row.completed), int(row.supported), int(row.supported_sessions)
