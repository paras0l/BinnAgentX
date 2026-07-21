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
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.agent_memory import obsidian_memory
from binnagent_api.database import get_engine
from binnagent_api.learner_auth import LearnerIdentity
from binnagent_api.model_adapters import PersonalizedReadingOutput, personalized_reading_adapter
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

training_material_router = APIRouter(prefix="/v1/training-materials", tags=["training-materials"])


class PersonalizedTrainingMaterialView(BaseModel):
    material_id: str
    title: str
    paragraphs: list[str]
    focus_points: list[str]
    source_context_count: int
    training_eligible: bool
    start_block_reason: Literal["calibration_required", "active_training"] | None
    status: str
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


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
    training_eligible = has_completed_run and (active_workflow_run_id is None or owns_active_run)
    start_block_reason: Literal["calibration_required", "active_training"] | None = None
    if not has_completed_run:
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
    status_code=status.HTTP_201_CREATED,
)
async def generate_personalized_training_material(
    request: Request,
) -> PersonalizedTrainingMaterialView:
    identity: LearnerIdentity = request.state.learner_identity
    invocation_key = f"personalized_reading_memory_{uuid4().hex}"
    memories = await obsidian_memory.recall(
        MemoryAccessContext(
            learner_id=identity.learner_id,
            agent_name="personalized_reading.generate",
            invocation_key=invocation_key,
        ),
        MemoryQuery(limit=6),
    )
    if not memories:
        raise HTTPException(status_code=409, detail="obsidian_context_required")

    contexts = tuple(
        {
            "kind": memory.kind,
            "title": memory.title,
            "excerpt": memory.content,
        }
        for memory in memories
    )
    output = await _generate_reading(contexts)
    now = datetime.now(UTC)
    material_id = f"training_material_{uuid4().hex}"
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.personalized_training_materials.insert().values(
                material_id=material_id,
                learner_id=identity.learner_id,
                title=output.title,
                paragraphs=output.paragraphs,
                focus_points=output.focus_points,
                source_context_ids=[memory.memory_id for memory in memories],
                status="ready",
                started_at=None,
                completed_at=None,
                active_workflow_run_id=None,
                created_at=now,
                updated_at=now,
            )
        )
        row = await _owned_material(connection, identity.learner_id, material_id)
        has_completed_run, active_workflow_run_id = await _training_state(
            connection, identity.learner_id
        )
    return _material_view(
        row,
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


async def _generate_reading(
    contexts: tuple[dict[str, str], ...],
) -> PersonalizedReadingOutput:
    adapter = personalized_reading_adapter(get_settings())
    if adapter is None:
        focus = ", ".join(item["title"] for item in contexts[:3])
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
            focus_points=[f"迁移复现: {item['title']}" for item in contexts[:3]],
        )
    try:
        return await adapter.generate(contexts)
    except Exception as exc:
        raise HTTPException(
            status_code=503, detail="personalized_reading_generation_failed"
        ) from exc
