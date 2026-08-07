from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_agent.tools import ToolActorType, ToolContext
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.model_tool_runtime import SqlAlchemyModelToolRuntime
from binnagent_api.vertical_slice import tables
from binnagent_domain.vertical_slice.errors import DomainError

pytestmark = pytest.mark.integration


@pytest_asyncio.fixture(autouse=True)
async def _release_database_pool() -> AsyncIterator[None]:
    yield
    await dispose_engine()


def _context(invocation_key: str) -> ToolContext:
    return ToolContext(
        trace_id="trace_model_tool_runtime_0001",
        workflow_run_id="run_model_tool_runtime_0001",
        task_id="task_model_tool_runtime_0001",
        learner_id="learner_model_tool_runtime_0001",
        actor_type=ToolActorType.LEARNER,
        expected_task_version=1,
        invocation_key=invocation_key,
        deadline_at=datetime.now(UTC) + timedelta(seconds=5),
    )


@pytest.mark.asyncio
async def test_model_tool_runtime_reserves_counts_completes_and_replays() -> None:
    context = _context("1" * 64)
    tool_name = "reading.analyze_selection.v1"
    request_hash = "2" * 64
    async with get_engine().begin() as connection:
        await connection.execute(
            sa.delete(tables.model_invocation_ledger).where(
                tables.model_invocation_ledger.c.workflow_run_id == context.workflow_run_id
            )
        )
        runtime = SqlAlchemyModelToolRuntime(connection)

        assert (
            await runtime.reserve(
                context=context,
                tool_name=tool_name,
                request_hash=request_hash,
            )
            is None
        )
        assert await runtime.admit_call(
            context=context,
            tool_name=tool_name,
            max_calls_per_run=1,
        )

        distinct_context = context.model_copy(
            update={"invocation_key": "invocation_model_runtime_0002"}
        )
        assert not await runtime.admit_call(
            context=distinct_context,
            tool_name=tool_name,
            max_calls_per_run=1,
        )

        payload: dict[str, object] = {
            "analysis_id": "analysis_1",
            "source": "model",
        }
        await runtime.complete(
            context=context,
            response_payload=payload,
            output_hash="3" * 64,
        )
        assert (
            await runtime.reserve(
                context=context,
                tool_name=tool_name,
                request_hash=request_hash,
            )
            == payload
        )
        assert await runtime.admit_call(
            context=context,
            tool_name=tool_name,
            max_calls_per_run=1,
        )


@pytest.mark.asyncio
async def test_model_tool_runtime_rejects_invocation_key_payload_conflict() -> None:
    context = _context("4" * 64)
    tool_name = "expression.review_draft.v1"
    async with get_engine().begin() as connection:
        await connection.execute(
            sa.delete(tables.model_invocation_ledger).where(
                tables.model_invocation_ledger.c.workflow_run_id == context.workflow_run_id
            )
        )
        runtime = SqlAlchemyModelToolRuntime(connection)
        await runtime.reserve(context=context, tool_name=tool_name, request_hash="5" * 64)
        await runtime.complete(
            context=context,
            response_payload={"review_id": "review_1"},
            output_hash="6" * 64,
        )

        with pytest.raises(DomainError, match="model_invocation_key_conflict"):
            await runtime.reserve(
                context=context,
                tool_name=tool_name,
                request_hash="7" * 64,
            )
