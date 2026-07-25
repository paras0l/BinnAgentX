"""Read-only reconciliation report for business runs and LangGraph checkpoints."""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any

import binnagent_api.vertical_slice.tables as tables
import sqlalchemy as sa
from binnagent_agent.workflows import open_postgres_checkpointer
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.settings import get_settings

_BUSINESS_THREAD_PREFIXES = (
    "personalized-content:",
    "knowledge-organization:",
)


async def _business_runs() -> dict[str, dict[str, Any]]:
    async with get_engine().connect() as connection:
        personalized = (
            (
                await connection.execute(
                    sa.select(
                        tables.personalized_training_materials.c.material_id.label("run_id"),
                        tables.personalized_training_materials.c.graph_thread_id,
                        tables.personalized_training_materials.c.graph_version,
                        tables.personalized_training_materials.c.status,
                    ).where(tables.personalized_training_materials.c.runtime_kind == "langgraph")
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
                        tables.obsidian_organizer_runs.c.knowledge_status.label("status"),
                    ).where(tables.obsidian_organizer_runs.c.runtime_kind == "langgraph")
                )
            )
            .mappings()
            .all()
        )
    rows = [*personalized, *knowledge]
    return {
        str(row["graph_thread_id"]): {
            "run_id": str(row["run_id"]),
            "graph_version": row["graph_version"],
            "status": str(row["status"]),
        }
        for row in rows
        if row["graph_thread_id"] is not None
    }


async def _checkpoint_threads() -> dict[str, dict[str, Any]]:
    database_url = get_settings().database_url.get_secret_value()
    checkpoints: dict[str, list[dict[str, Any]]] = defaultdict(list)
    async with open_postgres_checkpointer(database_url) as saver:
        async for item in saver.alist(None):
            configurable = item.config.get("configurable", {})
            thread_id = str(configurable.get("thread_id", ""))
            if not thread_id.startswith(_BUSINESS_THREAD_PREFIXES):
                continue
            channel_values = item.checkpoint.get("channel_values", {})
            checkpoints[thread_id].append(
                {
                    "checkpoint_id": configurable.get("checkpoint_id"),
                    "created_at": item.checkpoint.get("ts"),
                    "graph_version": channel_values.get("graph_version"),
                }
            )
    return {
        thread_id: {
            "checkpoint_count": len(items),
            "latest": max(items, key=lambda item: str(item["created_at"] or "")),
        }
        for thread_id, items in checkpoints.items()
    }


async def _checkpoint_storage_bytes() -> int:
    names = ("checkpoints", "checkpoint_blobs", "checkpoint_writes")
    async with get_engine().connect() as connection:
        total = 0
        for name in names:
            value = await connection.scalar(
                sa.text("SELECT pg_total_relation_size(to_regclass(:name))"),
                {"name": name},
            )
            total += int(value or 0)
        return total


async def audit() -> dict[str, Any]:
    business = await _business_runs()
    checkpoints = await _checkpoint_threads()
    business_ids = set(business)
    checkpoint_ids = set(checkpoints)
    version_mismatches = [
        {
            "thread_id": thread_id,
            "business_graph_version": business[thread_id]["graph_version"],
            "checkpoint_graph_version": checkpoints[thread_id]["latest"]["graph_version"],
        }
        for thread_id in sorted(business_ids & checkpoint_ids)
        if business[thread_id]["graph_version"] != checkpoints[thread_id]["latest"]["graph_version"]
    ]
    return {
        "business_run_count": len(business),
        "checkpoint_thread_count": len(checkpoints),
        "checkpoint_count": sum(int(item["checkpoint_count"]) for item in checkpoints.values()),
        "checkpoint_storage_bytes": await _checkpoint_storage_bytes(),
        "business_runs_without_checkpoint": [
            {"thread_id": thread_id, **business[thread_id]}
            for thread_id in sorted(business_ids - checkpoint_ids)
        ],
        "checkpoint_threads_without_business_run": [
            {"thread_id": thread_id, **checkpoints[thread_id]}
            for thread_id in sorted(checkpoint_ids - business_ids)
        ],
        "graph_version_mismatches": version_mismatches,
        "policy": {
            "missing_checkpoint": "technical_review_required",
            "orphan_checkpoint": "retain_until_explicit_cleanup",
            "version_mismatch": "refuse_resume_until_compatible_version_declared",
        },
    }


async def _main() -> None:
    try:
        print(json.dumps(await audit(), ensure_ascii=False, indent=2, sort_keys=True))
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(_main())
