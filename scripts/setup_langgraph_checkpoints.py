"""Explicit deployment operation for LangGraph checkpoint tables."""

from __future__ import annotations

import asyncio

from binnagent_agent.workflows.langgraph_runtime import open_postgres_checkpointer
from binnagent_api.settings import get_settings


async def _setup() -> None:
    database_url = get_settings().database_url.get_secret_value()
    async with open_postgres_checkpointer(database_url, setup=True):
        return


if __name__ == "__main__":
    asyncio.run(_setup())
