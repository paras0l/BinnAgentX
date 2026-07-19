from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any, Literal
from urllib.request import Request, urlopen
from uuid import uuid4

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.content_generation_service import (
    ContentPackPublisher,
    ContentPackPublishError,
)
from binnagent_api.content_orchestration import submit_content_generation_job
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
    "cancelled",
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
    current_stage: str
    current_item_id: str | None
    progress_completed: int
    progress_total: int
    attempt_count: int
    heartbeat_at: datetime | None
    cancel_requested_at: datetime | None
    langfuse_trace_id: str | None
    langfuse_trace_url: str | None
    model_provider: str | None
    model_name: str | None
    can_cancel: bool
    can_retry: bool
    prefect_task_run_id: str | None
    prefect_task_run_url: str | None


class ContentGenerationEventView(BaseModel):
    event_id: int
    event_type: str
    stage: str
    agent_role: str | None
    item_id: str | None
    attempt: int | None
    message: str
    detail: dict[str, Any]
    occurred_at: datetime


class ContentGenerationJobDetail(BaseModel):
    job: ContentGenerationJobView
    events: list[ContentGenerationEventView]


class WorkerStatusView(BaseModel):
    online: bool
    state: str
    current_job_id: str | None
    started_at: datetime | None
    heartbeat_at: datetime | None


class IntegrationStatusView(BaseModel):
    configured: bool
    reachable: bool
    url: str


class PrefectStatusView(IntegrationStatusView):
    active_workers: int


class ContentControlStatusView(BaseModel):
    worker: WorkerStatusView
    langfuse: IntegrationStatusView
    prefect: PrefectStatusView
    model_provider: str
    model_name: str
    queue_depth: int
    running_count: int
    failed_count: int
    active_pack_job_id: str | None


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


@content_generation_router.get("/status", response_model=ContentControlStatusView)
async def get_content_control_status(
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ContentControlStatusView:
    settings = get_settings()
    async with get_engine().connect() as connection:
        worker = (
            (await connection.execute(sa.select(tables.content_worker_runtime).limit(1)))
            .mappings()
            .one_or_none()
        )
        count_rows = (
            await connection.execute(
                sa.select(
                    tables.content_generation_jobs.c.status,
                    sa.func.count().label("count"),
                ).group_by(tables.content_generation_jobs.c.status)
            )
        ).all()
        counts: dict[str, int] = {
            str(row._mapping["status"]): int(row._mapping["count"]) for row in count_rows
        }
    heartbeat_at = worker["heartbeat_at"] if worker else None
    worker_online = bool(
        heartbeat_at
        and (datetime.now(UTC) - heartbeat_at).total_seconds()
        <= max(10.0, settings.content_worker_poll_seconds * 4)
    )
    langfuse_configured = bool(
        settings.langfuse_enabled and settings.langfuse_public_key and settings.langfuse_secret_key
    )
    langfuse_reachable = False
    if langfuse_configured:
        langfuse_reachable = await asyncio.to_thread(
            _url_reachable,
            settings.langfuse_base_url,
        )
    prefect_reachable, active_prefect_workers = (
        await asyncio.to_thread(_prefect_runtime_status, settings.prefect_api_url)
        if settings.prefect_enabled
        else (False, 0)
    )
    worker_online = worker_online or active_prefect_workers > 0
    worker_state = (
        str(worker["state"])
        if worker and worker_online
        else "idle"
        if active_prefect_workers > 0
        else "offline"
    )
    return ContentControlStatusView(
        worker=WorkerStatusView(
            online=worker_online,
            state=worker_state,
            current_job_id=(
                str(worker["current_job_id"]) if worker and worker["current_job_id"] else None
            ),
            started_at=worker["started_at"] if worker else None,
            heartbeat_at=heartbeat_at,
        ),
        langfuse=IntegrationStatusView(
            configured=langfuse_configured,
            reachable=langfuse_reachable,
            url=settings.langfuse_external_url,
        ),
        prefect=PrefectStatusView(
            configured=settings.prefect_enabled,
            reachable=prefect_reachable,
            url=settings.prefect_external_url,
            active_workers=active_prefect_workers,
        ),
        model_provider=settings.model_adapter,
        model_name=_model_name(settings),
        queue_depth=int(counts.get("queued", 0)),
        running_count=int(counts.get("running", 0)),
        failed_count=int(counts.get("generation_failed", 0))
        + int(counts.get("validation_failed", 0)),
        active_pack_job_id=_publisher().active_job_id(),
    )


@content_generation_router.get(
    "/jobs/{job_id}",
    response_model=ContentGenerationJobDetail,
)
async def get_content_generation_job(
    job_id: str,
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ContentGenerationJobDetail:
    async with get_engine().connect() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.content_generation_jobs).where(
                        tables.content_generation_jobs.c.job_id == job_id
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            raise HTTPException(status_code=404, detail="content_generation_job_not_found")
        events = (
            (
                await connection.execute(
                    sa.select(tables.content_generation_events)
                    .where(tables.content_generation_events.c.job_id == job_id)
                    .order_by(tables.content_generation_events.c.occurred_at.desc())
                    .limit(200)
                )
            )
            .mappings()
            .all()
        )
    return ContentGenerationJobDetail(
        job=_view(row, _publisher().active_job_id()),
        events=[ContentGenerationEventView.model_validate(dict(event)) for event in events],
    )


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
    if not settings.prefect_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="prefect_dispatch_disabled",
        )
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
        "current_stage": "queued",
        "current_item_id": None,
        "progress_completed": 0,
        "progress_total": 6,
        "attempt_count": 0,
        "heartbeat_at": None,
        "cancel_requested_at": None,
        "langfuse_trace_id": None,
        "model_provider": settings.model_adapter,
        "model_name": _model_name(settings),
        "prefect_task_run_id": None,
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
        await connection.execute(
            tables.content_generation_events.insert().values(
                job_id=job_id,
                event_type="job_queued",
                stage="queued",
                agent_role=None,
                item_id=None,
                attempt=None,
                message="任务已进入内容 Worker 队列",
                detail={"seed": body.seed},
                occurred_at=now,
            )
        )
    try:
        prefect_task_run_id = await asyncio.to_thread(submit_content_generation_job, job_id)
    except Exception as exc:
        failed_at = utc_now()
        error = f"prefect_dispatch_failed: {type(exc).__name__}: {str(exc)[:400]}"
        async with get_engine().begin() as connection:
            await connection.execute(
                tables.content_generation_jobs.update()
                .where(tables.content_generation_jobs.c.job_id == job_id)
                .values(
                    status="generation_failed",
                    current_stage="dispatch_failed",
                    validation_errors=[error],
                    completed_at=failed_at,
                )
            )
            await connection.execute(
                tables.content_generation_events.insert().values(
                    job_id=job_id,
                    event_type="prefect_dispatch_failed",
                    stage="dispatch_failed",
                    agent_role=None,
                    item_id=None,
                    attempt=None,
                    message="Prefect 未能接收任务, 可在控制舱重试",
                    detail={"error_type": type(exc).__name__},
                    occurred_at=failed_at,
                )
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="prefect_dispatch_failed",
        ) from exc
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.content_generation_jobs.update()
            .where(tables.content_generation_jobs.c.job_id == job_id)
            .values(prefect_task_run_id=prefect_task_run_id)
        )
        await connection.execute(
            tables.content_generation_events.insert().values(
                job_id=job_id,
                event_type="prefect_task_submitted",
                stage="queued",
                agent_role=None,
                item_id=None,
                attempt=None,
                message="Prefect 已接收任务, 等待内容 Worker",
                detail={"prefect_task_run_id": prefect_task_run_id},
                occurred_at=utc_now(),
            )
        )
    values["prefect_task_run_id"] = prefect_task_run_id
    return _view(values, _publisher().active_job_id())


@content_generation_router.post(
    "/jobs/{job_id}/cancel",
    response_model=ContentGenerationJobView,
)
async def cancel_content_generation_job(
    job_id: str,
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ContentGenerationJobView:
    now = utc_now()
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
        if row["status"] not in {"queued", "running"}:
            raise HTTPException(status_code=409, detail="content_generation_job_not_cancellable")
        values: dict[str, Any] = {"cancel_requested_at": now, "current_stage": "cancelling"}
        if row["status"] == "queued":
            values.update(status="cancelled", current_stage="cancelled", completed_at=now)
        await connection.execute(
            tables.content_generation_jobs.update()
            .where(tables.content_generation_jobs.c.job_id == job_id)
            .values(**values)
        )
        await connection.execute(
            tables.content_generation_events.insert().values(
                job_id=job_id,
                event_type="cancel_requested",
                stage=str(values["current_stage"]),
                agent_role=None,
                item_id=row["current_item_id"],
                attempt=None,
                message="操作者请求停止该任务",
                detail={},
                occurred_at=now,
            )
        )
        updated = {**dict(row), **values}
    return _view(updated, _publisher().active_job_id())


@content_generation_router.post(
    "/jobs/{job_id}/retry",
    response_model=ContentGenerationJobView,
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_content_generation_job(
    job_id: str,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ContentGenerationJobView:
    async with get_engine().connect() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.content_generation_jobs).where(
                        tables.content_generation_jobs.c.job_id == job_id
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
    if row is None:
        raise HTTPException(status_code=404, detail="content_generation_job_not_found")
    if row["status"] not in {"generation_failed", "validation_failed", "cancelled"}:
        raise HTTPException(status_code=409, detail="content_generation_job_not_retryable")
    return await create_content_generation_job(
        CreateContentGenerationJobRequest(seed=row["seed"]),
        identity,
    )


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
        await connection.execute(
            tables.content_generation_events.insert().values(
                job_id=job_id,
                event_type="pack_published",
                stage="published",
                agent_role=None,
                item_id=None,
                attempt=None,
                message="材料包已发布, 将用于之后创建的新训练",
                detail={"published_by_role": identity.role},
                occurred_at=published_at,
            )
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
        current_stage=str(row.get("current_stage") or job_status),
        current_item_id=(str(row["current_item_id"]) if row.get("current_item_id") else None),
        progress_completed=int(row.get("progress_completed") or 0),
        progress_total=int(row.get("progress_total") or 6),
        attempt_count=int(row.get("attempt_count") or 0),
        heartbeat_at=row.get("heartbeat_at"),
        cancel_requested_at=row.get("cancel_requested_at"),
        langfuse_trace_id=(str(row["langfuse_trace_id"]) if row.get("langfuse_trace_id") else None),
        langfuse_trace_url=_langfuse_trace_url(row.get("langfuse_trace_id")),
        model_provider=(str(row["model_provider"]) if row.get("model_provider") else None),
        model_name=str(row["model_name"]) if row.get("model_name") else None,
        can_cancel=job_status in {"queued", "running"} and row.get("cancel_requested_at") is None,
        can_retry=job_status in {"generation_failed", "validation_failed", "cancelled"},
        prefect_task_run_id=(
            str(row["prefect_task_run_id"]) if row.get("prefect_task_run_id") else None
        ),
        prefect_task_run_url=_prefect_task_run_url(row.get("prefect_task_run_id")),
    )


def _model_name(settings: Any) -> str:
    if settings.model_adapter == "ollama":
        return str(settings.ollama_chat_model)
    if settings.model_adapter == "deepseek":
        return str(settings.deepseek_chat_model)
    if settings.model_adapter == "longcat":
        return str(settings.longcat_chat_model)
    return "deterministic_fixture"


def _langfuse_trace_url(trace_id: Any) -> str | None:
    if not trace_id:
        return None
    base = get_settings().langfuse_external_url.rstrip("/")
    return f"{base}/trace/{trace_id}"


def _url_reachable(url: str) -> bool:
    try:
        with urlopen(url, timeout=1.5) as response:
            return int(response.status) < 500
    except Exception:
        return False


def _prefect_task_run_url(task_run_id: Any) -> str | None:
    if not task_run_id:
        return None
    base = get_settings().prefect_external_url.rstrip("/")
    return f"{base}/runs/task-run/{task_run_id}"


def _prefect_runtime_status(api_url: str) -> tuple[bool, int]:
    try:
        request = Request(
            f"{api_url.rstrip('/')}/task_workers/filter",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=1.5) as response:
            payload = json.load(response)
        return True, len(payload) if isinstance(payload, list) else 0
    except Exception:
        return False, 0
