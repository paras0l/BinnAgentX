"""Persistent per-run admission control for non-model application tools."""

from __future__ import annotations

from datetime import UTC, datetime

import sqlalchemy as sa
from binnagent_agent.tools import ToolContext
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.vertical_slice import tables


class SqlAlchemyToolUsagePort:
    def __init__(self, connection: AsyncConnection) -> None:
        self._connection = connection

    async def admit_call(
        self,
        *,
        context: ToolContext,
        tool_name: str,
        max_calls_per_run: int,
    ) -> bool:
        lock_scope = f"tool-usage:{context.workflow_run_id}:{tool_name}"
        await self._connection.execute(
            sa.select(sa.func.pg_advisory_xact_lock(sa.func.hashtext(lock_scope)))
        )
        await self._connection.execute(
            pg_insert(tables.tool_usage_ledger)
            .values(
                invocation_key=context.invocation_key,
                tool_name=tool_name,
                workflow_run_id=context.workflow_run_id,
                task_id=context.task_id,
                created_at=datetime.now(UTC),
            )
            .on_conflict_do_nothing(index_elements=["invocation_key"])
        )
        call_count = int(
            await self._connection.scalar(
                sa.select(sa.func.count())
                .select_from(tables.tool_usage_ledger)
                .where(
                    tables.tool_usage_ledger.c.workflow_run_id == context.workflow_run_id,
                    tables.tool_usage_ledger.c.tool_name == tool_name,
                )
            )
            or 0
        )
        return call_count <= max_calls_per_run
