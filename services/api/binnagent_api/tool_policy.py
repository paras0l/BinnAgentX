"""Database-backed Tool availability policy for multi-process execution."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.vertical_slice import tables

_PROJECT_KEY = "binnagentx"


class SqlAlchemyToolPolicyPort:
    def __init__(self, connection: AsyncConnection) -> None:
        self._connection = connection

    async def is_enabled(self, *, tool_name: str) -> bool:
        enabled = await self._connection.scalar(
            sa.select(tables.control_tool_policies.c.enabled).where(
                tables.control_tool_policies.c.project_key == _PROJECT_KEY,
                tables.control_tool_policies.c.tool_name == tool_name,
            )
        )
        return True if enabled is None else bool(enabled)
