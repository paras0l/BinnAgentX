"""Transactional SQLAlchemy adapter for final application-tool audit records."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from binnagent_agent.tools import ToolContext
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.vertical_slice import tables


class SqlAlchemyToolAuditPort:
    def __init__(self, connection: AsyncConnection) -> None:
        self._connection = connection

    async def record_tool_result(
        self,
        *,
        context: ToolContext,
        tool_name: str,
        status: str,
        reason_codes: tuple[str, ...],
        version_before: int | None,
        version_after: int | None,
    ) -> str:
        audit_event_id = f"audit_event_{uuid4().hex}"
        target_version = version_after or version_before
        if target_version is None:
            target_version = context.expected_run_version or context.expected_task_version or 1
        await self._connection.execute(
            tables.audit_events.insert().values(
                audit_event_id=audit_event_id,
                workflow_run_id=context.workflow_run_id,
                invocation_key=context.invocation_key,
                actor_type=context.actor_type.value,
                action=f"tool.{tool_name}",
                reason_code=reason_codes[0] if reason_codes else status,
                target_version=target_version,
                created_at=datetime.now(UTC),
            )
        )
        return audit_event_id
