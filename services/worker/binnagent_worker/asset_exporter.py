"""Durably delivers learning-asset export requests to the Obsidian bridge."""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from uuid import UUID

import sqlalchemy as sa
from binnagent_api.asset_capture_service import refine_pending_asset_capture
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.learning_asset_routes import export_pending_asset
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

logger = logging.getLogger("binnagent.asset_exporter")


async def requeue_interrupted_asset_exports() -> None:
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.outbox_messages.update()
            .where(
                tables.outbox_messages.c.topic == "asset_export_requested",
                tables.outbox_messages.c.status == "dispatching",
            )
            .values(status="pending", available_at=_utc_now())
        )


async def process_next_asset_export() -> bool:
    now = _utc_now()
    async with get_engine().begin() as connection:
        message = (
            (
                await connection.execute(
                    sa.select(tables.outbox_messages)
                    .where(
                        tables.outbox_messages.c.topic == "asset_export_requested",
                        tables.outbox_messages.c.status.in_(("pending", "denoising")),
                        tables.outbox_messages.c.available_at <= now,
                    )
                    .order_by(tables.outbox_messages.c.occurred_at)
                    .with_for_update(skip_locked=True)
                    .limit(1)
                )
            )
            .mappings()
            .one_or_none()
        )
        if message is None:
            return False
        message_id = message["message_id"]
        asset_id = str(message["aggregate_id"])
        attempt_count = int(message["attempt_count"]) + 1
        await connection.execute(
            tables.outbox_messages.update()
            .where(tables.outbox_messages.c.message_id == message_id)
            .values(status="dispatching", attempt_count=attempt_count)
        )

    try:
        refinement = await refine_pending_asset_capture(
            message_id=UUID(str(message_id)),
            asset_id=asset_id,
            payload=dict(message["payload"]),
        )
        if refinement == "filtered":
            await _finalize_message(UUID(str(message_id)), "filtered", attempt_count)
            return True
        result = await export_pending_asset(asset_id)
    except Exception:  # keep the outbox recoverable even when a bridge is unavailable
        logger.exception("asset export crashed: %s", asset_id)
        result = "error"
    await _finalize_message(UUID(str(message_id)), result, attempt_count)
    return True


async def _finalize_message(message_id: UUID, result: str, attempt_count: int) -> None:
    now = _utc_now()
    if result in {"synced", "missing", "filtered"}:
        values = {"status": "processed", "processed_at": now, "available_at": now}
    else:
        delay_seconds = 20 if result == "pending_export" else min(300, 5 * attempt_count)
        values = {
            "status": "pending",
            "available_at": now + timedelta(seconds=delay_seconds),
        }
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.outbox_messages.update()
            .where(tables.outbox_messages.c.message_id == message_id)
            .values(**values)
        )


async def run_asset_exporter() -> None:
    settings = get_settings()
    await requeue_interrupted_asset_exports()
    try:
        while True:
            processed = await process_next_asset_export()
            if processed:
                continue
            await asyncio.sleep(settings.content_worker_poll_seconds)
    finally:
        await dispose_engine()


def _utc_now() -> datetime:
    return datetime.now(UTC)


def run() -> None:
    logging.basicConfig(level=get_settings().log_level, format="%(levelname)s %(message)s")
    with suppress(KeyboardInterrupt):
        asyncio.run(run_asset_exporter())
