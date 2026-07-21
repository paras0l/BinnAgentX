"""BinnAgentX-owned short-term memory with expiry and bounded compaction."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.database import get_engine
from binnagent_api.vertical_slice import tables


class AgentWorkingMemory:
    """Small mutable state for an Agent run family; never exported to Obsidian."""

    async def load(
        self,
        *,
        learner_id: str,
        agent_name: str,
        scope: str,
        memory_key: str = "state",
    ) -> dict[str, Any] | None:
        now = datetime.now(UTC)
        async with get_engine().begin() as connection:
            await self._prune(connection, learner_id=learner_id, agent_name=agent_name, now=now)
            payload = await connection.scalar(
                sa.select(tables.agent_working_memory.c.payload).where(
                    tables.agent_working_memory.c.learner_id == learner_id,
                    tables.agent_working_memory.c.agent_name == agent_name,
                    tables.agent_working_memory.c.scope == scope,
                    tables.agent_working_memory.c.memory_key == memory_key,
                    tables.agent_working_memory.c.expires_at > now,
                )
            )
        return dict(payload) if isinstance(payload, dict) else None

    async def remember(
        self,
        *,
        learner_id: str,
        agent_name: str,
        scope: str,
        payload: dict[str, Any],
        memory_key: str = "state",
        ttl: timedelta = timedelta(days=30),
    ) -> None:
        now = datetime.now(UTC)
        async with get_engine().begin() as connection:
            statement = pg_insert(tables.agent_working_memory).values(
                learner_id=learner_id,
                agent_name=agent_name,
                scope=scope,
                memory_key=memory_key,
                payload=payload,
                expires_at=now + ttl,
                version=1,
                created_at=now,
                updated_at=now,
            )
            await connection.execute(
                statement.on_conflict_do_update(
                    index_elements=["learner_id", "agent_name", "scope", "memory_key"],
                    set_={
                        "payload": payload,
                        "expires_at": now + ttl,
                        "version": tables.agent_working_memory.c.version + 1,
                        "updated_at": now,
                    },
                )
            )
            await self._prune(connection, learner_id=learner_id, agent_name=agent_name, now=now)
            stale_ids = (
                sa.select(
                    tables.agent_working_memory.c.scope,
                    tables.agent_working_memory.c.memory_key,
                )
                .where(
                    tables.agent_working_memory.c.learner_id == learner_id,
                    tables.agent_working_memory.c.agent_name == agent_name,
                )
                .order_by(tables.agent_working_memory.c.updated_at.desc())
                .offset(32)
            )
            await connection.execute(
                tables.agent_working_memory.delete().where(
                    sa.tuple_(
                        tables.agent_working_memory.c.scope,
                        tables.agent_working_memory.c.memory_key,
                    ).in_(stale_ids)
                )
            )

    @staticmethod
    async def _prune(
        connection: AsyncConnection,
        *,
        learner_id: str,
        agent_name: str,
        now: datetime,
    ) -> None:
        await connection.execute(
            tables.agent_working_memory.delete().where(
                tables.agent_working_memory.c.learner_id == learner_id,
                tables.agent_working_memory.c.agent_name == agent_name,
                tables.agent_working_memory.c.expires_at <= now,
            )
        )


working_memory = AgentWorkingMemory()
