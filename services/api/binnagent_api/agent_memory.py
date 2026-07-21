"""Obsidian-backed implementation of the BinnAgentX learner memory boundary."""

from __future__ import annotations

import re
from collections.abc import Sequence
from datetime import UTC, datetime
from hashlib import sha256
from uuid import uuid4

import sqlalchemy as sa
from binnagent_agent.memory import (
    MemoryAccessContext,
    MemoryCandidate,
    MemoryQuery,
    MemoryReceipt,
    MemoryRecord,
)
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.database import get_engine
from binnagent_api.learning_asset_routes import _export_asset
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

_PROJECT_KEY = "binnagentx"
_PROVIDER = "obsidian"
_READ_TOOL = "obsidian.read_learning_context.v1"
_WRITE_TOOL = "obsidian.write_learning_note.v1"
_ASSET_KINDS = {
    "vocabulary",
    "grammar",
    "writing_expression",
    "reading_skill",
    "exam_skill",
    "writing_skill",
}


class ObsidianLearnerMemory:
    """Learner-scoped memory over approved excerpts and the plugin export queue."""

    async def operation_enabled(self, tool_name: str) -> bool:
        async with get_engine().connect() as connection:
            return await self._enabled(connection, tool_name)

    async def recall(
        self, context: MemoryAccessContext, query: MemoryQuery
    ) -> tuple[MemoryRecord, ...]:
        async with get_engine().connect() as connection:
            if not await self._enabled(connection, _READ_TOOL):
                return ()
            filters = [tables.obsidian_learning_context.c.learner_id == context.learner_id]
            if query.kinds:
                filters.append(tables.obsidian_learning_context.c.asset_kind.in_(query.kinds))
            rows = (
                (
                    await connection.execute(
                        sa.select(tables.obsidian_learning_context)
                        .where(*filters)
                        .order_by(tables.obsidian_learning_context.c.received_at.desc())
                        .limit(40)
                    )
                )
                .mappings()
                .all()
            )
        selected = self._rank(rows, query.text)[: query.limit]
        records = tuple(
            MemoryRecord(
                memory_id=str(row["context_id"]),
                provider=_PROVIDER,
                kind=str(row["asset_kind"]),
                title=str(row["title"]),
                content=str(row["excerpt"])[:900],
                tags=tuple(str(item) for item in row["tags"]),
                source_key=str(row["source_key"]),
                updated_at=row["source_modified_at"],
            )
            for row in selected
        )
        await self._audit(
            context,
            operation="recall",
            memory_ids=[record.memory_id for record in records],
            query_hash=sha256(query.text.encode("utf-8")).hexdigest(),
        )
        return records

    async def remember(
        self, context: MemoryAccessContext, candidate: MemoryCandidate
    ) -> MemoryReceipt:
        if candidate.kind not in _ASSET_KINDS:
            raise ValueError("asset_kind_invalid")
        now = datetime.now(UTC)
        asset_id = f"asset_{uuid4().hex}"
        async with get_engine().begin() as connection:
            if not await self._enabled(connection, _WRITE_TOOL):
                raise PermissionError("agent_memory_write_disabled")
            replay = await connection.scalar(
                sa.select(tables.outbox_messages.c.aggregate_id)
                .join(
                    tables.learning_asset_index,
                    tables.learning_asset_index.c.asset_id == tables.outbox_messages.c.aggregate_id,
                )
                .where(
                    tables.outbox_messages.c.topic == "asset_export_requested",
                    tables.outbox_messages.c.payload["agent_invocation_key"].astext
                    == context.invocation_key,
                    tables.learning_asset_index.c.learner_id == context.learner_id,
                )
            )
            if replay is not None:
                row = (
                    (
                        await connection.execute(
                            sa.select(tables.learning_asset_index).where(
                                tables.learning_asset_index.c.asset_id == replay,
                                tables.learning_asset_index.c.learner_id == context.learner_id,
                            )
                        )
                    )
                    .mappings()
                    .one()
                )
                receipt = MemoryReceipt(
                    memory_id=str(row["asset_id"]),
                    provider=_PROVIDER,
                    sync_status=str(row["sync_status"]),
                    document_uri=row["document_uri"],
                )
                await self._audit(
                    context,
                    operation="remember",
                    memory_ids=[receipt.memory_id],
                    query_hash=None,
                )
                return receipt
            await connection.execute(
                tables.learning_asset_index.insert().values(
                    asset_id=asset_id,
                    learner_id=context.learner_id,
                    asset_kind=candidate.kind,
                    display_title=candidate.title,
                    tag_index=list(candidate.tags),
                    source_type="agent_memory",
                    source_title=candidate.source_title,
                    source_task_id=context.task_id,
                    source_annotation_id=None,
                    source_intervention_id=None,
                    vault_provider=_PROVIDER,
                    vault_id=get_settings().obsidian_vault_name,
                    document_id=None,
                    relative_path=None,
                    document_uri=None,
                    content_hash=None,
                    document_updated_at=None,
                    evidence_status="pending_validation",
                    evidence_count=0,
                    last_verified_at=None,
                    next_review_at=None,
                    starred=False,
                    sync_status="pending_export",
                    sync_error_code=None,
                    indexed_at=None,
                    created_at=now,
                    updated_at=now,
                    version=1,
                )
            )
            await connection.execute(
                tables.outbox_messages.insert().values(
                    message_id=uuid4(),
                    topic="asset_export_requested",
                    aggregate_id=asset_id,
                    payload={
                        "asset_id": asset_id,
                        "export_schema_version": "asset/v1",
                        "initial_content": candidate.content,
                        "agent_invocation_key": context.invocation_key,
                        "memory_provider": _PROVIDER,
                    },
                    status="pending",
                    attempt_count=0,
                    occurred_at=now,
                    available_at=now,
                    processed_at=None,
                )
            )
        exported = await _export_asset(
            context.learner_id,
            asset_id,
            initial_content=candidate.content,
        )
        await self._audit(
            context,
            operation="remember",
            memory_ids=[asset_id],
            query_hash=None,
        )
        return MemoryReceipt(
            memory_id=asset_id,
            provider=_PROVIDER,
            sync_status=exported.sync_status,
            document_uri=exported.document_uri,
        )

    @staticmethod
    async def _enabled(connection: AsyncConnection, tool_name: str) -> bool:
        enabled = await connection.scalar(
            sa.select(tables.control_tool_policies.c.enabled).where(
                tables.control_tool_policies.c.project_key == _PROJECT_KEY,
                tables.control_tool_policies.c.tool_name == tool_name,
            )
        )
        return True if enabled is None else bool(enabled)

    @staticmethod
    def _rank(rows: Sequence[sa.RowMapping], query: str) -> list[sa.RowMapping]:
        tokens = {
            token.lower()
            for token in re.findall(r"[A-Za-z][A-Za-z'-]{2,}|[\u4e00-\u9fff]{2,}", query)
        }
        if not tokens:
            return list(rows)

        def score(row: sa.RowMapping) -> int:
            haystack = " ".join(
                (
                    str(row["title"]),
                    str(row["excerpt"]),
                    " ".join(str(item) for item in row["tags"]),
                )
            ).lower()
            return sum(1 for token in tokens if token in haystack)

        scored = [(score(row), index, row) for index, row in enumerate(rows)]
        relevant = [item for item in scored if item[0] > 0]
        pool = relevant if relevant else scored
        pool.sort(key=lambda item: (-item[0], item[1]))
        return [item[2] for item in pool]

    @staticmethod
    async def _audit(
        context: MemoryAccessContext,
        *,
        operation: str,
        memory_ids: list[str],
        query_hash: str | None,
    ) -> None:
        async with get_engine().begin() as connection:
            await connection.execute(
                pg_insert(tables.agent_memory_events)
                .values(
                    event_id=uuid4(),
                    project_key=_PROJECT_KEY,
                    learner_id=context.learner_id,
                    agent_name=context.agent_name,
                    operation=operation,
                    provider=_PROVIDER,
                    invocation_key=context.invocation_key,
                    workflow_run_id=context.workflow_run_id,
                    task_id=context.task_id,
                    query_hash=query_hash,
                    memory_ids=memory_ids,
                    created_at=datetime.now(UTC),
                )
                .on_conflict_do_nothing(
                    index_elements=["project_key", "invocation_key", "operation"]
                )
            )


obsidian_memory = ObsidianLearnerMemory()
