"""PostgreSQL governance adapter for idempotent, rate-limited model tools."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import sqlalchemy as sa
from binnagent_agent.tools import ToolContext
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.errors import DomainError
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.vertical_slice import tables


class SqlAlchemyModelToolRuntime:
    """Keep reservation, replay, and per-run call accounting in one transaction."""

    def __init__(self, connection: AsyncConnection) -> None:
        self._connection = connection

    async def reserve(
        self,
        *,
        context: ToolContext,
        tool_name: str,
        request_hash: str,
    ) -> dict[str, Any] | None:
        if context.task_id is None:
            raise ValueError("model_tool_requires_task_id")
        # admit_call() already holds this transaction-scoped lock. Reacquiring it
        # here is harmless and keeps reserve() safe for direct port callers.
        lock_scope = f"{context.workflow_run_id}:{tool_name}"
        await self._connection.execute(
            sa.select(sa.func.pg_advisory_xact_lock(sa.func.hashtext(lock_scope)))
        )
        now = datetime.now(UTC)
        inserted = await self._connection.execute(
            pg_insert(tables.model_invocation_ledger)
            .values(
                invocation_key=context.invocation_key,
                tool_name=tool_name,
                workflow_run_id=context.workflow_run_id,
                task_id=context.task_id,
                request_hash=request_hash,
                status="pending",
                response_payload=None,
                output_hash=None,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(index_elements=["invocation_key"])
        )
        if inserted.rowcount:
            return None
        row = (
            (
                await self._connection.execute(
                    sa.select(tables.model_invocation_ledger).where(
                        tables.model_invocation_ledger.c.invocation_key == context.invocation_key
                    )
                )
            )
            .mappings()
            .one()
        )
        if row["tool_name"] != tool_name or row["request_hash"] != request_hash:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "model_invocation_key_conflict",
            )
        if row["status"] == "completed" and row["response_payload"] is not None:
            return dict(row["response_payload"])
        raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "model_invocation_in_progress")

    async def admit_call(
        self,
        *,
        context: ToolContext,
        tool_name: str,
        max_calls_per_run: int,
    ) -> bool:
        lock_scope = f"{context.workflow_run_id}:{tool_name}"
        await self._connection.execute(
            sa.select(sa.func.pg_advisory_xact_lock(sa.func.hashtext(lock_scope)))
        )
        existing_invocation = await self._connection.scalar(
            sa.select(tables.model_invocation_ledger.c.invocation_key).where(
                tables.model_invocation_ledger.c.invocation_key == context.invocation_key,
                tables.model_invocation_ledger.c.tool_name == tool_name,
                tables.model_invocation_ledger.c.workflow_run_id == context.workflow_run_id,
            )
        )
        if existing_invocation is not None:
            return True
        call_count = int(
            await self._connection.scalar(
                sa.select(sa.func.count())
                .select_from(tables.model_invocation_ledger)
                .where(
                    tables.model_invocation_ledger.c.workflow_run_id == context.workflow_run_id,
                    tables.model_invocation_ledger.c.tool_name == tool_name,
                )
            )
            or 0
        )
        # The current invocation is inserted by reserve() inside the handler, so a
        # new call is admissible only while the persisted count is still below cap.
        return call_count < max_calls_per_run

    async def complete(
        self,
        *,
        context: ToolContext,
        response_payload: dict[str, object],
        output_hash: str,
    ) -> None:
        await self._connection.execute(
            tables.model_invocation_ledger.update()
            .where(tables.model_invocation_ledger.c.invocation_key == context.invocation_key)
            .values(
                status="completed",
                response_payload=response_payload,
                output_hash=output_hash,
                updated_at=datetime.now(UTC),
            )
        )
