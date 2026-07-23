from __future__ import annotations

import asyncio
import logging
import os
import socket
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import sqlalchemy as sa
from binnagent_agent.observability import observation_ids, observe, shutdown_observability
from binnagent_agent.workflows.content_generation import (
    ContentGenerationCancelled,
    ContentGenerationProgress,
    ContentGeneratorError,
)
from binnagent_api.content_generation_service import build_content_generation_workflow
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.learner_level_service import process_next_level_assessment
from binnagent_api.personalized_material_service import (
    enqueue_due_personalized_material,
    process_next_personalized_material,
    requeue_interrupted_personalized_materials,
)
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables
from sqlalchemy.dialects.postgresql import insert as pg_insert

logger = logging.getLogger("binnagent.worker")
WORKER_ID = "content-worker-primary"
WORKER_INSTANCE_ID = f"{socket.gethostname()}:{os.getpid()}"
CONTENT_JOB_LEASE = timedelta(seconds=30)


async def requeue_interrupted_jobs() -> int:
    now = _utc_now()
    async with get_engine().begin() as connection:
        result = await connection.execute(
            tables.content_generation_jobs.update()
            .where(
                tables.content_generation_jobs.c.status == "running",
                sa.or_(
                    tables.content_generation_jobs.c.lease_expires_at.is_(None),
                    tables.content_generation_jobs.c.lease_expires_at <= now,
                ),
            )
            .values(
                status="queued",
                started_at=None,
                claimed_by=None,
                lease_expires_at=None,
            )
        )
    return int(result.rowcount or 0)


async def process_next_content_job() -> bool:
    job = await _claim_content_job()
    if job is None:
        return False
    await _execute_content_job(job)
    return True


async def process_content_job(job_id: str) -> str:
    job = await _claim_content_job(job_id=job_id)
    if job is None:
        async with get_engine().connect() as connection:
            status = await connection.scalar(
                sa.select(tables.content_generation_jobs.c.status).where(
                    tables.content_generation_jobs.c.job_id == job_id
                )
            )
        if status is None:
            raise LookupError(f"content job not found: {job_id}")
        return str(status)
    return await _execute_content_job(job)


async def _claim_content_job(*, job_id: str | None = None) -> dict[str, Any] | None:
    now = _utc_now()
    settings = get_settings()
    async with get_engine().begin() as connection:
        filters = [tables.content_generation_jobs.c.status == "queued"]
        if job_id is not None:
            filters.append(tables.content_generation_jobs.c.job_id == job_id)
        row = (
            (
                await connection.execute(
                    sa.select(tables.content_generation_jobs)
                    .where(*filters)
                    .order_by(tables.content_generation_jobs.c.created_at)
                    .limit(1)
                    .with_for_update(skip_locked=True)
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            return None
        job = dict(row)
        if job.get("cancel_requested_at") is not None:
            await connection.execute(
                tables.content_generation_jobs.update()
                .where(tables.content_generation_jobs.c.job_id == job["job_id"])
                .values(
                    status="cancelled",
                    current_stage="cancelled",
                    completed_at=_utc_now(),
                )
            )
            return None
        await connection.execute(
            tables.content_generation_jobs.update()
            .where(tables.content_generation_jobs.c.job_id == job["job_id"])
            .values(
                status="running",
                started_at=now,
                current_stage="starting",
                heartbeat_at=now,
                attempt_count=tables.content_generation_jobs.c.attempt_count + 1,
                model_provider=settings.model_adapter,
                model_name=_model_name(settings),
                claimed_by=WORKER_INSTANCE_ID,
                lease_expires_at=now + CONTENT_JOB_LEASE,
            )
        )
        await _upsert_worker(connection, state="running", job_id=str(job["job_id"]))
    job["attempt_count"] = int(job["attempt_count"]) + 1
    job["claimed_by"] = WORKER_INSTANCE_ID
    job["lease_expires_at"] = now + CONTENT_JOB_LEASE
    return job


async def _execute_content_job(job: dict[str, Any]) -> str:
    job_id = str(job["job_id"])
    logger.info("content generation job started: %s", job_id)
    updates = await _run_job(job)
    updates["claimed_by"] = None
    updates["lease_expires_at"] = None
    async with get_engine().begin() as connection:
        result = await connection.execute(
            tables.content_generation_jobs.update()
            .where(
                tables.content_generation_jobs.c.job_id == job_id,
                tables.content_generation_jobs.c.claimed_by == WORKER_INSTANCE_ID,
            )
            .values(**updates)
        )
        if not result.rowcount:
            raise RuntimeError(f"content job lease lost: {job_id}")
        await _upsert_worker(connection, state="idle", job_id=None)
    logger.info(
        "content generation job finished: %s (%s)",
        job_id,
        updates["status"],
    )
    return str(updates["status"])


async def _run_job(job: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    loop = asyncio.get_running_loop()

    def progress_callback(progress: ContentGenerationProgress) -> None:
        future = asyncio.run_coroutine_threadsafe(
            _record_progress(str(job["job_id"]), progress),
            loop,
        )
        if future.result(timeout=10):
            raise ContentGenerationCancelled("cancel_requested_by_operator")

    workflow = build_content_generation_workflow(
        settings,
        output_directory=Path(str(job["output_directory"])),
        pack_id=str(job["pack_id"]),
        pack_version=str(job["pack_version"]),
        progress_callback=progress_callback,
    )
    try:
        with observe(
            "content.pack.generate",
            as_type="agent",
            input={"job_id": job["job_id"], "seed": job["seed"]},
            metadata={
                "job_id": job["job_id"],
                "pack_id": job["pack_id"],
                "provider": settings.model_adapter,
            },
        ) as observation:
            trace_id, _ = observation_ids(observation)
            if trace_id:
                await _set_trace_id(str(job["job_id"]), trace_id)
            result = await _run_with_heartbeat(
                job_id=str(job["job_id"]),
                operation=asyncio.to_thread(workflow.run, seed=job["seed"]),
            )
            if observation is not None:
                observation.update(
                    output={
                        "item_count": result.item_count,
                        "reviewed_count": result.agent_reviewed_count,
                        "errors": result.errors,
                    }
                )
    except ContentGenerationCancelled as exc:
        return _cancelled_update(str(exc))
    except ContentGeneratorError as exc:
        return _failed_update("generation_failed", [str(exc)])
    except Exception as exc:  # keep the queue recoverable while recording the internal reason
        logger.exception("content generation job crashed: %s", job["job_id"])
        return _failed_update("generation_failed", [f"{type(exc).__name__}: {exc}"])

    errors = list(result.errors)
    job_status = "generated"
    if errors:
        job_status = "validation_failed"
    elif result.item_count <= 0 or result.agent_reviewed_count != result.item_count:
        job_status = "validation_failed"
        errors.append("generated_pack_not_fully_agent_reviewed")
    return {
        "status": job_status,
        "manifest_path": str(result.manifest_path),
        "item_count": result.item_count if job_status == "generated" else 0,
        "agent_reviewed_count": (result.agent_reviewed_count if job_status == "generated" else 0),
        "validation_errors": errors,
        "completed_at": _utc_now(),
        "current_stage": "completed" if job_status == "generated" else "validation_failed",
        "progress_completed": result.item_count,
        "heartbeat_at": _utc_now(),
    }


def _failed_update(status: str, errors: list[str]) -> dict[str, Any]:
    return {
        "status": status,
        "manifest_path": None,
        "item_count": 0,
        "agent_reviewed_count": 0,
        "validation_errors": errors,
        "completed_at": _utc_now(),
        "current_stage": "failed",
        "heartbeat_at": _utc_now(),
    }


def _cancelled_update(reason: str) -> dict[str, Any]:
    return {
        "status": "cancelled",
        "manifest_path": None,
        "item_count": 0,
        "agent_reviewed_count": 0,
        "validation_errors": [reason],
        "completed_at": _utc_now(),
        "current_stage": "cancelled",
        "heartbeat_at": _utc_now(),
    }


async def run_worker(*, stop_event: asyncio.Event | None = None, once: bool = False) -> None:
    settings = get_settings()
    event = stop_event or asyncio.Event()
    requeued = await requeue_interrupted_jobs()
    requeued += await requeue_interrupted_personalized_materials()
    async with get_engine().begin() as connection:
        await _upsert_worker(connection, state="idle", job_id=None, reset_started=True)
    logger.info("worker ready; requeued interrupted jobs: %s", requeued)
    try:
        while not event.is_set():
            await requeue_interrupted_jobs()
            await requeue_interrupted_personalized_materials()
            await enqueue_due_personalized_material()
            processed = await process_next_content_job()
            processed = await process_next_level_assessment() or processed
            processed = await process_next_personalized_material() or processed
            if once:
                return
            if processed:
                continue
            async with get_engine().begin() as connection:
                await _upsert_worker(connection, state="idle", job_id=None)
            with suppress(TimeoutError):
                await asyncio.wait_for(event.wait(), timeout=settings.content_worker_poll_seconds)
    finally:
        shutdown_observability()
        await dispose_engine()


def run() -> None:
    logging.basicConfig(level=get_settings().log_level, format="%(levelname)s %(message)s")
    asyncio.run(run_worker())


def _utc_now() -> datetime:
    return datetime.now(UTC)


async def _record_progress(job_id: str, progress: ContentGenerationProgress) -> bool:
    now = _utc_now()
    async with get_engine().begin() as connection:
        cancel_requested = await connection.scalar(
            sa.select(tables.content_generation_jobs.c.cancel_requested_at).where(
                tables.content_generation_jobs.c.job_id == job_id
            )
        )
        values: dict[str, Any] = {
            "current_stage": progress.stage,
            "current_item_id": progress.item_id,
            "heartbeat_at": now,
            "lease_expires_at": now + CONTENT_JOB_LEASE,
        }
        if progress.completed is not None:
            values["progress_completed"] = progress.completed
        await connection.execute(
            tables.content_generation_jobs.update()
            .where(
                tables.content_generation_jobs.c.job_id == job_id,
                tables.content_generation_jobs.c.claimed_by == WORKER_INSTANCE_ID,
            )
            .values(**values)
        )
        await connection.execute(
            tables.content_generation_events.insert().values(
                job_id=job_id,
                event_type=progress.event_type,
                stage=progress.stage,
                agent_role=progress.agent_role,
                item_id=progress.item_id,
                attempt=progress.attempt,
                message=progress.message,
                detail=progress.detail or {},
                occurred_at=now,
            )
        )
        await _upsert_worker(connection, state="running", job_id=job_id)
    return cancel_requested is not None


async def _set_trace_id(job_id: str, trace_id: str) -> None:
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.content_generation_jobs.update()
            .where(tables.content_generation_jobs.c.job_id == job_id)
            .values(langfuse_trace_id=trace_id, heartbeat_at=_utc_now())
        )


async def _upsert_worker(
    connection: Any,
    *,
    state: str,
    job_id: str | None,
    reset_started: bool = False,
) -> None:
    now = _utc_now()
    insert = pg_insert(tables.content_worker_runtime).values(
        worker_id=WORKER_ID,
        state=state,
        current_job_id=job_id,
        started_at=now,
        heartbeat_at=now,
    )
    updates: dict[str, Any] = {
        "state": state,
        "current_job_id": job_id,
        "heartbeat_at": now,
    }
    if reset_started:
        updates["started_at"] = now
    await connection.execute(
        insert.on_conflict_do_update(
            index_elements=[tables.content_worker_runtime.c.worker_id],
            set_=updates,
        )
    )


def _model_name(settings: Any) -> str:
    if settings.model_adapter == "ollama":
        return str(settings.ollama_chat_model)
    if settings.model_adapter == "deepseek":
        return str(settings.deepseek_chat_model)
    if settings.model_adapter == "longcat":
        return str(settings.longcat_chat_model)
    return "deterministic_fixture"


async def _run_with_heartbeat(job_id: str, operation: Any) -> Any:
    task = asyncio.create_task(operation)
    while not task.done():
        done, _ = await asyncio.wait({task}, timeout=5)
        if done:
            break
        async with get_engine().begin() as connection:
            now = _utc_now()
            await connection.execute(
                tables.content_generation_jobs.update()
                .where(
                    tables.content_generation_jobs.c.job_id == job_id,
                    tables.content_generation_jobs.c.claimed_by == WORKER_INSTANCE_ID,
                )
                .values(
                    heartbeat_at=now,
                    lease_expires_at=now + CONTENT_JOB_LEASE,
                )
            )
            await _upsert_worker(connection, state="running", job_id=job_id)
    return await task
