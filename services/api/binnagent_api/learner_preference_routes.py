"""Account-owned learner preferences used by presentation and assistance flows."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

import sqlalchemy as sa
from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy.dialects.postgresql import insert as pg_insert

from binnagent_api.database import get_engine
from binnagent_api.learner_auth import LearnerIdentity
from binnagent_api.vertical_slice import tables

learner_preference_router = APIRouter(prefix="/v1/preferences", tags=["learner-preferences"])


class LearnerPreferences(BaseModel):
    assistance_mode: Literal["ask_first", "proactive", "quiet"] = "ask_first"
    feedback_detail: Literal["concise", "balanced", "detailed"] = "balanced"
    correction_tone: Literal["gentle", "direct"] = "gentle"
    show_decision_trace: bool = True
    temporary_tasks_enabled: bool = True
    reading_comfort: Literal["compact", "comfortable", "spacious"] = "comfortable"
    reduced_motion: bool = False
    skin: Literal["paper", "ragdoll", "ocean", "seal-summer"] = "paper"
    navigation_collapsed: bool = False


class LearnerPreferencesView(BaseModel):
    preferences: LearnerPreferences
    version: int
    persisted: bool
    updated_at: datetime | None


@learner_preference_router.get("", response_model=LearnerPreferencesView)
async def get_preferences(request: Request) -> LearnerPreferencesView:
    identity: LearnerIdentity = request.state.learner_identity
    async with get_engine().connect() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.learner_preferences).where(
                        tables.learner_preferences.c.learner_id == identity.learner_id
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
    if row is None:
        return LearnerPreferencesView(
            preferences=LearnerPreferences(),
            version=0,
            persisted=False,
            updated_at=None,
        )
    return LearnerPreferencesView(
        preferences=LearnerPreferences.model_validate(row["preferences"]),
        version=int(row["version"]),
        persisted=True,
        updated_at=row["updated_at"],
    )


@learner_preference_router.put("", response_model=LearnerPreferencesView)
async def put_preferences(
    request: Request, preferences: LearnerPreferences
) -> LearnerPreferencesView:
    identity: LearnerIdentity = request.state.learner_identity
    now = datetime.now(UTC)
    insert_statement = pg_insert(tables.learner_preferences).values(
        learner_id=identity.learner_id,
        preferences=preferences.model_dump(),
        version=1,
        created_at=now,
        updated_at=now,
    )
    statement = insert_statement.on_conflict_do_update(
        index_elements=[tables.learner_preferences.c.learner_id],
        set_={
            "preferences": preferences.model_dump(),
            "version": tables.learner_preferences.c.version + 1,
            "updated_at": now,
        },
    ).returning(tables.learner_preferences)
    async with get_engine().begin() as connection:
        row = (await connection.execute(statement)).mappings().one()
    return LearnerPreferencesView(
        preferences=LearnerPreferences.model_validate(row["preferences"]),
        version=int(row["version"]),
        persisted=True,
        updated_at=row["updated_at"],
    )
