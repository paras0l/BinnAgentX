from __future__ import annotations

import asyncio
import logging
import signal
from contextlib import suppress
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import sqlalchemy as sa
from binnagent_agent.workflows.content_generation import ContentGeneratorError
from binnagent_api.content_generation_service import build_content_generation_workflow
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

logger = logging.getLogger("binnagent.worker")


async def requeue_interrupted_jobs() -> int:
    async with get_engine().begin() as connection:
        result = await connection.execute(
            tables.content_generation_jobs.update()
            .where(tables.content_generation_jobs.c.status == "running")
            .values(status="queued", started_at=None)
        )
    return int(result.rowcount or 0)


async def process_next_content_job() -> bool:
    async with get_engine().begin() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.content_generation_jobs)
                    .where(tables.content_generation_jobs.c.status == "queued")
                    .order_by(tables.content_generation_jobs.c.created_at)
                    .limit(1)
                    .with_for_update(skip_locked=True)
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            return False
        job = dict(row)
        await connection.execute(
            tables.content_generation_jobs.update()
            .where(tables.content_generation_jobs.c.job_id == job["job_id"])
            .values(status="running", started_at=_utc_now())
        )

    logger.info("content generation job started: %s", job["job_id"])
    updates = await _run_job(job)
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.content_generation_jobs.update()
            .where(tables.content_generation_jobs.c.job_id == job["job_id"])
            .values(**updates)
        )
    logger.info(
        "content generation job finished: %s (%s)",
        job["job_id"],
        updates["status"],
    )
    return True


async def _run_job(job: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    workflow = build_content_generation_workflow(
        settings,
        output_directory=Path(str(job["output_directory"])),
        pack_id=str(job["pack_id"]),
        pack_version=str(job["pack_version"]),
    )
    try:
        result = await asyncio.to_thread(workflow.run, seed=job["seed"])
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
    }


def _failed_update(status: str, errors: list[str]) -> dict[str, Any]:
    return {
        "status": status,
        "manifest_path": None,
        "item_count": 0,
        "agent_reviewed_count": 0,
        "validation_errors": errors,
        "completed_at": _utc_now(),
    }


async def run_worker(*, stop_event: asyncio.Event | None = None, once: bool = False) -> None:
    settings = get_settings()
    event = stop_event or asyncio.Event()
    requeued = await requeue_interrupted_jobs()
    logger.info("worker ready; requeued interrupted jobs: %s", requeued)
    try:
        while not event.is_set():
            processed = await process_next_content_job()
            if once:
                return
            if processed:
                continue
            with suppress(TimeoutError):
                await asyncio.wait_for(event.wait(), timeout=settings.content_worker_poll_seconds)
    finally:
        await dispose_engine()


def run() -> None:
    logging.basicConfig(level=get_settings().log_level, format="%(levelname)s %(message)s")

    async def main() -> None:
        stop_event = asyncio.Event()
        loop = asyncio.get_running_loop()
        for signum in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(signum, stop_event.set)
        await run_worker(stop_event=stop_event)

    asyncio.run(main())


def _utc_now() -> datetime:
    return datetime.now(UTC)
