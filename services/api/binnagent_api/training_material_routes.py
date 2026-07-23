"""Learner-owned training material queue endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

import sqlalchemy as sa
from binnagent_agent.memory import MemoryAccessContext, MemoryQuery
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.errors import DomainError
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.agent_memory import obsidian_memory
from binnagent_api.agent_working_memory import working_memory
from binnagent_api.database import get_engine
from binnagent_api.learner_auth import LearnerIdentity
from binnagent_api.vertical_slice import tables

training_material_router = APIRouter(prefix="/v1/training-materials", tags=["training-materials"])


class PersonalizedTrainingMaterialView(BaseModel):
    material_id: str
    title: str
    paragraphs: list[str]
    focus_points: list[str]
    source_context_count: int
    training_eligible: bool
    start_block_reason: (
        Literal["calibration_required", "active_training", "material_not_ready"] | None
    )
    status: str
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PersonalizedMaterialGenerationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    goal: str = Field(default="综合巩固近期笔记", max_length=240)
    kinds: list[str] = Field(default_factory=list, max_length=6)

    @field_validator("goal")
    @classmethod
    def normalized_goal(cls, value: str) -> str:
        return " ".join(value.strip().split()) or "综合巩固近期笔记"

    @field_validator("kinds")
    @classmethod
    def valid_kinds(cls, values: list[str]) -> list[str]:
        allowed = {
            "vocabulary",
            "grammar",
            "writing_expression",
            "reading_skill",
            "exam_skill",
            "writing_skill",
        }
        if any(value not in allowed for value in values):
            raise ValueError("personalized_material_kind_invalid")
        return list(dict.fromkeys(values))


def _material_view(
    row: sa.RowMapping,
    *,
    has_completed_run: bool,
    active_workflow_run_id: str | None,
) -> PersonalizedTrainingMaterialView:
    owns_active_run = (
        active_workflow_run_id is not None
        and str(row["active_workflow_run_id"] or "") == active_workflow_run_id
    )
    material_ready = str(row["status"]) in {"ready", "in_progress", "completed"}
    training_eligible = (
        material_ready and has_completed_run and (active_workflow_run_id is None or owns_active_run)
    )
    start_block_reason: (
        Literal["calibration_required", "active_training", "material_not_ready"] | None
    ) = None
    if not material_ready:
        start_block_reason = "material_not_ready"
    elif not has_completed_run:
        start_block_reason = "calibration_required"
    elif not training_eligible:
        start_block_reason = "active_training"
    return PersonalizedTrainingMaterialView(
        material_id=str(row["material_id"]),
        title=str(row["title"]),
        paragraphs=list(row["paragraphs"]),
        focus_points=list(row["focus_points"]),
        source_context_count=len(row["source_context_ids"]),
        training_eligible=training_eligible,
        start_block_reason=start_block_reason,
        status=str(row["status"]),
        started_at=row["started_at"],
        completed_at=row["completed_at"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


async def _owned_material(
    connection: AsyncConnection, learner_id: str, material_id: str
) -> sa.RowMapping:
    row = (
        (
            await connection.execute(
                sa.select(tables.personalized_training_materials).where(
                    tables.personalized_training_materials.c.material_id == material_id,
                    tables.personalized_training_materials.c.learner_id == learner_id,
                )
            )
        )
        .mappings()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="training_material_not_found")
    return row


@training_material_router.get("", response_model=list[PersonalizedTrainingMaterialView])
async def list_training_materials(request: Request) -> list[PersonalizedTrainingMaterialView]:
    identity: LearnerIdentity = request.state.learner_identity
    async with get_engine().connect() as connection:
        has_completed_run, active_workflow_run_id = await _training_state(
            connection, identity.learner_id
        )
        rows = (
            (
                await connection.execute(
                    sa.select(tables.personalized_training_materials)
                    .where(
                        tables.personalized_training_materials.c.learner_id == identity.learner_id
                    )
                    .order_by(
                        sa.case(
                            (tables.personalized_training_materials.c.status == "in_progress", 0),
                            (tables.personalized_training_materials.c.status == "ready", 1),
                            else_=2,
                        ),
                        tables.personalized_training_materials.c.created_at.desc(),
                    )
                    .limit(30)
                )
            )
            .mappings()
            .all()
        )
    return [
        _material_view(
            row,
            has_completed_run=has_completed_run,
            active_workflow_run_id=active_workflow_run_id,
        )
        for row in rows
    ]


@training_material_router.api_route(
    "/{material_id}/status",
    methods=["POST", "PUT", "PATCH"],
    deprecated=True,
)
async def reject_legacy_material_status_update(material_id: str, request: Request) -> None:
    """Turn stale-client 404s into an explicit reload instruction without mutating state."""
    identity: LearnerIdentity = request.state.learner_identity
    async with get_engine().connect() as connection:
        await _owned_material(connection, identity.learner_id, material_id)
    raise DomainError(
        PublicErrorCode.SESSION_CONFLICT,
        "legacy_training_material_client_must_reload",
    )


@training_material_router.post(
    "/personalized",
    response_model=PersonalizedTrainingMaterialView,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_personalized_training_material(
    request: Request,
    body: PersonalizedMaterialGenerationRequest | None = None,
) -> PersonalizedTrainingMaterialView:
    identity: LearnerIdentity = request.state.learner_identity
    generation = body or PersonalizedMaterialGenerationRequest()
    invocation_key = f"personalized_reading_memory_{uuid4().hex}"
    state = await working_memory.load(
        learner_id=identity.learner_id,
        agent_name="personalized_reading.generate",
        scope="material_generation",
    )
    recent_ids = {
        str(value)
        for value in (state or {}).get("recent_context_ids", [])
        if isinstance(value, str)
    }
    candidates = await obsidian_memory.recall(
        MemoryAccessContext(
            learner_id=identity.learner_id,
            agent_name="personalized_reading.generate",
            invocation_key=invocation_key,
        ),
        MemoryQuery(
            text=generation.goal,
            kinds=frozenset(generation.kinds),
            recently_used_memory_ids=frozenset(recent_ids),
            limit=12,
        ),
    )
    fresh = [memory for memory in candidates if memory.memory_id not in recent_ids]
    repeated = [memory for memory in candidates if memory.memory_id in recent_ids]
    memories = tuple((fresh + repeated)[:6])
    if not memories:
        raise DomainError(
            PublicErrorCode.OBSIDIAN_CONTEXT_REQUIRED,
            "obsidian_context_required",
        )

    now = datetime.now(UTC)
    material_id = f"training_material_{uuid4().hex}"
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.personalized_training_materials.insert().values(
                material_id=material_id,
                learner_id=identity.learner_id,
                title="正在生成个性化阅读",
                paragraphs=[],
                focus_points=[f"目标: {generation.goal}"],
                source_context_ids=[memory.memory_id for memory in memories],
                status="requested",
                generation_attempt_count=0,
                generation_error_code=None,
                next_generation_attempt_at=now,
                claimed_by=None,
                lease_expires_at=None,
                requested_goal=generation.goal,
                requested_kinds=generation.kinds,
                evidence_target_asset_ids=[],
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
                event_type="generation_requested",
                stage="requested",
                attempt=None,
                message="学习者已请求从 Obsidian 笔记生成材料",
                detail={
                    "source_context_count": len(memories),
                    "requested_kinds": generation.kinds,
                },
                occurred_at=now,
            )
        )
        row = await _owned_material(connection, identity.learner_id, material_id)
        has_completed_run, active_workflow_run_id = await _training_state(
            connection, identity.learner_id
        )
    remembered_ids = list(
        dict.fromkeys([memory.memory_id for memory in memories] + list(recent_ids))
    )
    await working_memory.remember(
        learner_id=identity.learner_id,
        agent_name="personalized_reading.generate",
        scope="material_generation",
        payload={
            "last_goal": generation.goal,
            "recent_context_ids": remembered_ids[:18],
            "last_material_id": material_id,
        },
    )
    return _material_view(
        row,
        has_completed_run=has_completed_run,
        active_workflow_run_id=active_workflow_run_id,
    )


@training_material_router.post(
    "/{material_id}/retry",
    response_model=PersonalizedTrainingMaterialView,
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_personalized_training_material(
    material_id: str,
    request: Request,
) -> PersonalizedTrainingMaterialView:
    identity: LearnerIdentity = request.state.learner_identity
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        row = await _owned_material(connection, identity.learner_id, material_id)
        if row["status"] != "generation_failed":
            raise HTTPException(status_code=409, detail="training_material_retry_not_allowed")
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
                updated_at=now,
            )
        )
        await connection.execute(
            tables.personalized_material_events.insert().values(
                material_id=material_id,
                event_type="manual_retry_requested",
                stage="requested",
                attempt=None,
                message="学习者已请求重新生成材料",
                detail={},
                occurred_at=now,
            )
        )
        updated = await _owned_material(connection, identity.learner_id, material_id)
        has_completed_run, active_workflow_run_id = await _training_state(
            connection, identity.learner_id
        )
    return _material_view(
        updated,
        has_completed_run=has_completed_run,
        active_workflow_run_id=active_workflow_run_id,
    )


async def _training_state(connection: AsyncConnection, learner_id: str) -> tuple[bool, str | None]:
    completed_run = await connection.scalar(
        sa.select(tables.workflow_runs.c.workflow_run_id)
        .where(
            tables.workflow_runs.c.learner_id == learner_id,
            tables.workflow_runs.c.state == "completed",
        )
        .limit(1)
    )
    active_run = await connection.scalar(
        sa.select(tables.workflow_runs.c.workflow_run_id)
        .where(
            tables.workflow_runs.c.learner_id == learner_id,
            tables.workflow_runs.c.state != "completed",
        )
        .order_by(tables.workflow_runs.c.updated_at.desc())
        .limit(1)
    )
    return completed_run is not None, str(active_run) if active_run is not None else None
