"""Governed Tool adapters over the native BinnAgentX learner memory module."""

from __future__ import annotations

from datetime import datetime

from binnagent_agent.memory import MemoryAccessContext, MemoryCandidate, MemoryQuery
from binnagent_agent.tools import (
    ToolContext,
    ToolExecutor,
    ToolResult,
    ToolStatus,
    runtime_registry,
)
from pydantic import BaseModel, ConfigDict, Field

from binnagent_api.agent_memory import obsidian_memory

_executor = ToolExecutor(runtime_registry)


def _memory_context(context: ToolContext, agent_name: str) -> MemoryAccessContext:
    return MemoryAccessContext(
        learner_id=context.learner_id,
        agent_name=agent_name,
        invocation_key=context.invocation_key,
        workflow_run_id=context.workflow_run_id,
        task_id=context.task_id,
    )


class ObsidianReadInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(default="", max_length=160)
    limit: int = Field(default=6, ge=1, le=20)


class ObsidianContextItem(BaseModel):
    source_key: str
    title: str
    kind: str
    tags: list[str]
    excerpt: str
    modified_at: datetime


class ObsidianReadOutput(BaseModel):
    entries: list[ObsidianContextItem]


class ObsidianWriteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: str
    title: str = Field(min_length=1, max_length=240)
    content: str = Field(min_length=1, max_length=8000)
    tags: list[str] = Field(default_factory=list, max_length=24)
    source_title: str | None = Field(default=None, max_length=240)


class ObsidianWriteOutput(BaseModel):
    asset_id: str
    sync_status: str
    document_uri: str | None


async def read_obsidian_learning_context(
    context: ToolContext, payload: ObsidianReadInput
) -> ToolResult[ObsidianReadOutput]:
    tool_name = "obsidian.read_learning_context.v1"
    runtime_registry.set_enabled(tool_name, await obsidian_memory.operation_enabled(tool_name))

    async def handler(_: ToolContext) -> ToolResult[ObsidianReadOutput]:
        records = await obsidian_memory.recall(
            _memory_context(context, tool_name),
            MemoryQuery(text=payload.query, limit=payload.limit),
        )
        return ToolResult(
            status=ToolStatus.SUCCEEDED,
            data=ObsidianReadOutput(
                entries=[
                    ObsidianContextItem(
                        source_key=record.source_key or record.memory_id,
                        title=record.title,
                        kind=record.kind,
                        tags=list(record.tags),
                        excerpt=record.content,
                        modified_at=record.updated_at,
                    )
                    for record in records
                ]
            ),
        )

    return await _executor.execute(tool_name, context, handler)


async def write_obsidian_learning_note(
    context: ToolContext, payload: ObsidianWriteInput
) -> ToolResult[ObsidianWriteOutput]:
    tool_name = "obsidian.write_learning_note.v1"
    runtime_registry.set_enabled(tool_name, await obsidian_memory.operation_enabled(tool_name))

    async def handler(_: ToolContext) -> ToolResult[ObsidianWriteOutput]:
        try:
            receipt = await obsidian_memory.remember(
                _memory_context(context, tool_name),
                MemoryCandidate(
                    kind=payload.kind,
                    title=payload.title,
                    content=payload.content,
                    tags=tuple(payload.tags),
                    source_title=payload.source_title,
                ),
            )
        except (PermissionError, ValueError) as exc:
            return ToolResult(status=ToolStatus.REJECTED, reason_codes=[str(exc)])
        return ToolResult(
            status=ToolStatus.SUCCEEDED,
            data=ObsidianWriteOutput(
                asset_id=receipt.memory_id,
                sync_status=receipt.sync_status,
                document_uri=receipt.document_uri,
            ),
            side_effect_ids=[receipt.memory_id],
        )

    return await _executor.execute(tool_name, context, handler)
