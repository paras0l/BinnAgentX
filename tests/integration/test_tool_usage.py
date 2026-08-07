from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_agent.tools import ToolActorType, ToolContext
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.tool_usage import SqlAlchemyToolUsagePort
from binnagent_api.vertical_slice import tables

pytestmark = pytest.mark.integration


@pytest_asyncio.fixture(autouse=True)
async def _clean_usage() -> AsyncIterator[None]:
    async with get_engine().begin() as connection:
        await connection.execute(sa.delete(tables.tool_usage_ledger))
    yield
    async with get_engine().begin() as connection:
        await connection.execute(sa.delete(tables.tool_usage_ledger))
    await dispose_engine()


def _context(invocation_key: str) -> ToolContext:
    return ToolContext(
        trace_id=f"trace_{invocation_key}",
        workflow_run_id="run_tool_usage_0001",
        task_id=None,
        learner_id="control:binnagentx",
        actor_type=ToolActorType.DEVELOPER_REVIEWER,
        invocation_key=invocation_key,
        deadline_at=datetime.now(UTC) + timedelta(seconds=5),
    )


@pytest.mark.asyncio
async def test_generic_usage_is_idempotent_and_enforces_per_run_limit() -> None:
    async with get_engine().begin() as connection:
        usage = SqlAlchemyToolUsagePort(connection)
        first = _context("usage_invocation_0001")
        second = _context("usage_invocation_0002")

        assert await usage.admit_call(
            context=first,
            tool_name="content_ops.generate_candidate.v1",
            max_calls_per_run=1,
        )
        assert await usage.admit_call(
            context=first,
            tool_name="content_ops.generate_candidate.v1",
            max_calls_per_run=1,
        )
        assert not await usage.admit_call(
            context=second,
            tool_name="content_ops.generate_candidate.v1",
            max_calls_per_run=1,
        )
