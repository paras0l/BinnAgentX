"""Shared LangGraph runtime rules for business-owned durable runs."""

from __future__ import annotations

import re
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Literal

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

RuntimeKind = Literal["explicit_state_machine", "langgraph"]

GRAPH_VERSION = "agent-workflows-v1"
_RUN_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$")


class GraphVersionMismatchError(RuntimeError):
    """Refuse to resume a checkpoint with an undeclared graph-state version."""


def require_graph_version(
    state: object,
    *,
    graph_version: str,
    compatible_graph_versions: frozenset[str] = frozenset(),
) -> None:
    if not isinstance(state, dict):
        raise GraphVersionMismatchError("graph_state_must_be_mapping")
    checkpoint_version = state.get("graph_version")
    accepted = compatible_graph_versions | {graph_version}
    if checkpoint_version not in accepted:
        raise GraphVersionMismatchError(
            f"graph_version_mismatch:{checkpoint_version!s}:{graph_version}"
        )


def stable_thread_id(run_kind: str, run_id: str) -> str:
    """One graph thread per durable business run, never per learner."""

    if not _RUN_ID.fullmatch(run_kind):
        raise ValueError("invalid_graph_run_kind")
    if not _RUN_ID.fullmatch(run_id):
        raise ValueError("invalid_graph_run_id")
    return f"{run_kind}:{run_id}"


def psycopg_connection_string(database_url: str) -> str:
    """Convert the app's SQLAlchemy URL into the psycopg URL used by the saver."""

    converted = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if not converted.startswith(("postgresql://", "postgres://")):
        raise ValueError("langgraph_checkpointer_requires_postgres")
    return converted


@asynccontextmanager
async def open_postgres_checkpointer(
    database_url: str,
    *,
    setup: bool = False,
) -> AsyncIterator[AsyncPostgresSaver]:
    """Open the production saver.

    ``setup`` is deliberately opt-in so application startup never mutates the
    checkpoint schema. Deployment operations must run setup explicitly.
    """

    connection_string = psycopg_connection_string(database_url)
    async with AsyncPostgresSaver.from_conn_string(connection_string) as saver:
        if setup:
            await saver.setup()
        yield saver
