"""Control-cockpit learner account management."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.database import get_engine
from binnagent_api.learner_auth import utc_now
from binnagent_api.vertical_slice import tables

user_management_router = APIRouter(prefix="/v1/users", tags=["user-management"])


class ManagedLearnerView(BaseModel):
    learner_id: str
    nickname: str
    email: str
    account_type: str
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None
    active_session_count: int
    completed_run_count: int
    asset_count: int
    obsidian_paired: bool


def _user_query(now: datetime) -> sa.Select:  # type: ignore[type-arg]
    session_stats = (
        sa.select(
            tables.learner_sessions.c.learner_id.label("session_learner_id"),
            sa.func.max(tables.learner_sessions.c.created_at).label("last_login_at"),
            sa.func.count()
            .filter(
                tables.learner_sessions.c.revoked_at.is_(None),
                tables.learner_sessions.c.expires_at > now,
            )
            .label("active_session_count"),
        )
        .group_by(tables.learner_sessions.c.learner_id)
        .subquery()
    )
    completed_runs = (
        sa.select(
            tables.workflow_runs.c.learner_id.label("run_learner_id"),
            sa.func.count().label("completed_run_count"),
        )
        .where(tables.workflow_runs.c.state == "completed")
        .group_by(tables.workflow_runs.c.learner_id)
        .subquery()
    )
    asset_counts = (
        sa.select(
            tables.learning_asset_index.c.learner_id.label("asset_learner_id"),
            sa.func.count().label("asset_count"),
        )
        .group_by(tables.learning_asset_index.c.learner_id)
        .subquery()
    )
    obsidian_connections = (
        sa.select(
            tables.obsidian_sync_connections.c.learner_id.label("obsidian_learner_id"),
            sa.func.count().label("obsidian_connection_count"),
        )
        .where(tables.obsidian_sync_connections.c.revoked_at.is_(None))
        .group_by(tables.obsidian_sync_connections.c.learner_id)
        .subquery()
    )
    return (
        sa.select(
            tables.learners,
            session_stats.c.last_login_at,
            sa.func.coalesce(session_stats.c.active_session_count, 0).label("active_session_count"),
            sa.func.coalesce(completed_runs.c.completed_run_count, 0).label("completed_run_count"),
            sa.func.coalesce(asset_counts.c.asset_count, 0).label("asset_count"),
            sa.func.coalesce(obsidian_connections.c.obsidian_connection_count, 0).label(
                "obsidian_connection_count"
            ),
        )
        .outerjoin(
            session_stats,
            session_stats.c.session_learner_id == tables.learners.c.learner_id,
        )
        .outerjoin(
            completed_runs,
            completed_runs.c.run_learner_id == tables.learners.c.learner_id,
        )
        .outerjoin(
            asset_counts,
            asset_counts.c.asset_learner_id == tables.learners.c.learner_id,
        )
        .outerjoin(
            obsidian_connections,
            obsidian_connections.c.obsidian_learner_id == tables.learners.c.learner_id,
        )
    )


def _view(row: sa.RowMapping) -> ManagedLearnerView:
    account_type = str(row["account_type"])
    return ManagedLearnerView(
        learner_id=str(row["learner_id"]),
        nickname=str(row["nickname"]),
        email="" if account_type == "experience" else str(row["email"]),
        account_type=account_type,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        last_login_at=row["last_login_at"],
        active_session_count=int(row["active_session_count"]),
        completed_run_count=int(row["completed_run_count"]),
        asset_count=int(row["asset_count"]),
        obsidian_paired=int(row["obsidian_connection_count"]) > 0,
    )


async def _managed_user(
    connection: AsyncConnection, learner_id: str, now: datetime
) -> ManagedLearnerView:
    row = (
        (
            await connection.execute(
                _user_query(now).where(tables.learners.c.learner_id == learner_id)
            )
        )
        .mappings()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="learner_not_found")
    return _view(row)


@user_management_router.get("", response_model=list[ManagedLearnerView])
async def list_managed_users(
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> list[ManagedLearnerView]:
    now = utc_now()
    async with get_engine().connect() as connection:
        rows = (
            (
                await connection.execute(
                    _user_query(now).order_by(tables.learners.c.created_at.desc())
                )
            )
            .mappings()
            .all()
        )
    return [_view(row) for row in rows]


@user_management_router.post("/{learner_id}/revoke-sessions", response_model=ManagedLearnerView)
async def revoke_user_sessions(
    learner_id: str,
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ManagedLearnerView:
    now = utc_now()
    async with get_engine().begin() as connection:
        await _managed_user(connection, learner_id, now)
        await connection.execute(
            tables.learner_sessions.update()
            .where(
                tables.learner_sessions.c.learner_id == learner_id,
                tables.learner_sessions.c.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
        return await _managed_user(connection, learner_id, now)
