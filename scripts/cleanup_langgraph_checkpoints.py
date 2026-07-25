"""Conservative, explicit cleanup for terminal LangGraph business threads."""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import UTC, datetime, timedelta
from typing import Any

import binnagent_api.vertical_slice.tables as tables
import sqlalchemy as sa
from binnagent_agent.workflows import open_postgres_checkpointer
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.settings import get_settings

_CONFIRMATION = "DELETE_ELIGIBLE_LANGGRAPH_CHECKPOINTS"


async def eligible_threads(*, older_than_days: int) -> list[dict[str, Any]]:
    cutoff = datetime.now(UTC) - timedelta(days=older_than_days)
    async with get_engine().connect() as connection:
        personalized = (
            (
                await connection.execute(
                    sa.select(
                        tables.personalized_training_materials.c.material_id.label("run_id"),
                        tables.personalized_training_materials.c.graph_thread_id,
                        tables.personalized_training_materials.c.graph_version,
                        tables.personalized_training_materials.c.updated_at.label("terminal_at"),
                    ).where(
                        tables.personalized_training_materials.c.runtime_kind == "langgraph",
                        tables.personalized_training_materials.c.status == "completed",
                        tables.personalized_training_materials.c.graph_thread_id.is_not(None),
                        tables.personalized_training_materials.c.updated_at <= cutoff,
                    )
                )
            )
            .mappings()
            .all()
        )
        knowledge = (
            (
                await connection.execute(
                    sa.select(
                        tables.obsidian_organizer_runs.c.run_id,
                        tables.obsidian_organizer_runs.c.graph_thread_id,
                        tables.obsidian_organizer_runs.c.graph_version,
                        tables.obsidian_organizer_runs.c.completed_at.label("terminal_at"),
                    ).where(
                        tables.obsidian_organizer_runs.c.runtime_kind == "langgraph",
                        tables.obsidian_organizer_runs.c.status == "completed",
                        tables.obsidian_organizer_runs.c.knowledge_status.in_(
                            ("validation_scheduled", "rejected", "failed")
                        ),
                        tables.obsidian_organizer_runs.c.graph_thread_id.is_not(None),
                        tables.obsidian_organizer_runs.c.completed_at.is_not(None),
                        tables.obsidian_organizer_runs.c.completed_at <= cutoff,
                    )
                )
            )
            .mappings()
            .all()
        )
    return [
        {
            "run_id": str(row["run_id"]),
            "thread_id": str(row["graph_thread_id"]),
            "graph_version": row["graph_version"],
            "terminal_at": row["terminal_at"].isoformat(),
        }
        for row in [*personalized, *knowledge]
    ]


async def run(
    *,
    older_than_days: int,
    execute: bool,
    confirmation: str | None,
    operator: str,
) -> dict[str, Any]:
    candidates = await eligible_threads(older_than_days=older_than_days)
    if execute and confirmation != _CONFIRMATION:
        raise ValueError("checkpoint_cleanup_confirmation_invalid")
    deleted: list[str] = []
    if execute:
        database_url = get_settings().database_url.get_secret_value()
        async with open_postgres_checkpointer(database_url) as saver:
            for candidate in candidates:
                await saver.adelete_thread(candidate["thread_id"])
                deleted.append(candidate["thread_id"])
    return {
        "mode": "execute" if execute else "dry_run",
        "operator": operator,
        "older_than_days": older_than_days,
        "discovered_at": datetime.now(UTC).isoformat(),
        "eligible_threads": candidates,
        "deleted_thread_ids": deleted,
        "confirmation_required": _CONFIRMATION,
    }


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--older-than-days", type=int, default=30)
    parser.add_argument("--operator", required=True)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--confirm")
    arguments = parser.parse_args()
    if arguments.older_than_days < 1:
        parser.error("--older-than-days must be at least 1")
    return arguments


async def _main() -> None:
    arguments = _arguments()
    try:
        report = await run(
            older_than_days=arguments.older_than_days,
            execute=arguments.execute,
            confirmation=arguments.confirm,
            operator=arguments.operator,
        )
        print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(_main())
