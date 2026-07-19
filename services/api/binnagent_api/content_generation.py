from __future__ import annotations

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Annotated, Any, Literal
from uuid import uuid4

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.content_generation_service import (
    ContentPackPublisher,
    ContentPackPublishError,
)
from binnagent_api.database import get_engine
from binnagent_api.learner_auth import utc_now
from binnagent_api.settings import PROJECT_ROOT, get_settings
from binnagent_api.vertical_slice import tables

content_generation_router = APIRouter(prefix="/v1/content-generation", tags=["content-generation"])

JobStatus = Literal[
    "queued",
    "running",
    "generated",
    "validation_failed",
    "generation_failed",
]


class CreateContentGenerationJobRequest(BaseModel):
    seed: int | None = Field(default=None, ge=0, le=2**31 - 1)


class ContentGenerationJobView(BaseModel):
    job_id: str
    status: JobStatus
    seed: int | None
    pack_id: str
    pack_version: str
    item_count: int
    agent_reviewed_count: int
    validation_errors: list[str]
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    published_at: datetime | None
    is_active: bool
    can_publish: bool


@content_generation_router.get("/jobs", response_model=list[ContentGenerationJobView])
async def list_content_generation_jobs(
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> list[ContentGenerationJobView]:
    active_job_id = _publisher().active_job_id()
    async with get_engine().connect() as connection:
        rows = (
            (
                await connection.execute(
                    sa.select(tables.content_generation_jobs)
                    .order_by(tables.content_generation_jobs.c.created_at.desc())
                    .limit(30)
                )
            )
            .mappings()
            .all()
        )
    return [_view(row, active_job_id) for row in rows]


@content_generation_router.post(
    "/jobs",
    response_model=ContentGenerationJobView,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_content_generation_job(
    body: CreateContentGenerationJobRequest,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ContentGenerationJobView:
    settings = get_settings()
    now = utc_now()
    job_id = f"content_job_{uuid4().hex}"
    pack_id = f"agent_content_{settings.env}_{job_id}"
    output_directory = Path(settings.content_generation_output_directory) / "packs" / job_id
    values: dict[str, Any] = {
        "job_id": job_id,
        "status": "queued",
        "seed": body.seed,
        "pack_id": pack_id,
        "pack_version": "v1",
        "output_directory": str(output_directory),
        "manifest_path": None,
        "item_count": 0,
        "agent_reviewed_count": 0,
        "validation_errors": [],
        "requested_by_role": identity.role,
        "published_by_role": None,
        "created_at": now,
        "started_at": None,
        "completed_at": None,
        "published_at": None,
    }
    async with get_engine().begin() as connection:
        await connection.execute(sa.text("SELECT pg_advisory_xact_lock(124908417)"))
        pending_job_id = await connection.scalar(
            sa.select(tables.content_generation_jobs.c.job_id)
            .where(tables.content_generation_jobs.c.status.in_(("queued", "running")))
            .order_by(tables.content_generation_jobs.c.created_at)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if pending_job_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="content_generation_job_already_in_progress",
            )
        await connection.execute(tables.content_generation_jobs.insert().values(**values))
    return _view(values, _publisher().active_job_id())


@content_generation_router.post(
    "/jobs/{job_id}/publish",
    response_model=ContentGenerationJobView,
)
async def publish_content_generation_job(
    job_id: str,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ContentGenerationJobView:
    publisher = _publisher()
    async with get_engine().begin() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.content_generation_jobs)
                    .where(tables.content_generation_jobs.c.job_id == job_id)
                    .with_for_update()
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            raise HTTPException(status_code=404, detail="content_generation_job_not_found")
        if (
            row["status"] != "generated"
            or int(row["item_count"]) <= 0
            or int(row["agent_reviewed_count"]) != int(row["item_count"])
            or not row["manifest_path"]
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="content_generation_job_not_publishable",
            )
        try:
            await asyncio.to_thread(
                publisher.publish,
                Path(str(row["manifest_path"])),
                job_id=job_id,
            )
        except ContentPackPublishError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            ) from exc
        published_at = utc_now()
        await connection.execute(
            tables.content_generation_jobs.update()
            .where(tables.content_generation_jobs.c.job_id == job_id)
            .values(published_at=published_at, published_by_role=identity.role)
        )
        updated = dict(row)
        updated.update(published_at=published_at, published_by_role=identity.role)
    return _view(updated, job_id)


def _publisher() -> ContentPackPublisher:
    settings = get_settings()
    return ContentPackPublisher(
        repository_root=PROJECT_ROOT,
        generated_root=Path(settings.content_generation_output_directory),
    )


def _view(row: Any, active_job_id: str | None) -> ContentGenerationJobView:
    job_status = str(row["status"])
    item_count = int(row["item_count"])
    reviewed_count = int(row["agent_reviewed_count"])
    errors = row["validation_errors"]
    return ContentGenerationJobView(
        job_id=str(row["job_id"]),
        status=job_status,
        seed=int(row["seed"]) if row["seed"] is not None else None,
        pack_id=str(row["pack_id"]),
        pack_version=str(row["pack_version"]),
        item_count=item_count,
        agent_reviewed_count=reviewed_count,
        validation_errors=[str(value) for value in errors] if isinstance(errors, list) else [],
        created_at=row["created_at"],
        started_at=row["started_at"],
        completed_at=row["completed_at"],
        published_at=row["published_at"],
        is_active=str(row["job_id"]) == active_job_id,
        can_publish=job_status == "generated" and item_count > 0 and reviewed_count == item_count,
    )
