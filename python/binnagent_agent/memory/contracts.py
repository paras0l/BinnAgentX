"""Provider-neutral learner memory contracts for every BinnAgentX Agent."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field


class MemoryAccessContext(BaseModel):
    """Trusted runtime identity attached by the orchestrator, never by model output."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    learner_id: str = Field(min_length=1, max_length=128)
    agent_name: str = Field(min_length=1, max_length=128)
    invocation_key: str = Field(min_length=16, max_length=128)
    workflow_run_id: str | None = Field(default=None, max_length=128)
    task_id: str | None = Field(default=None, max_length=128)


class MemoryQuery(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    text: str = Field(default="", max_length=1000)
    kinds: frozenset[str] = Field(default_factory=frozenset)
    recently_used_memory_ids: frozenset[str] = Field(default_factory=frozenset)
    limit: int = Field(default=6, ge=1, le=20)


class MemoryRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    memory_id: str
    asset_id: str | None = None
    provider: str
    kind: str
    title: str
    content: str
    tags: tuple[str, ...] = ()
    source_key: str | None = None
    updated_at: datetime


class MemoryCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    kind: str
    title: str = Field(min_length=1, max_length=240)
    content: str = Field(min_length=1, max_length=8000)
    tags: tuple[str, ...] = Field(default_factory=tuple, max_length=24)
    source_title: str | None = Field(default=None, max_length=240)


class MemoryReceipt(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    memory_id: str
    provider: str
    sync_status: str
    document_uri: str | None = None


class LearnerMemoryPort(Protocol):
    async def recall(
        self, context: MemoryAccessContext, query: MemoryQuery
    ) -> tuple[MemoryRecord, ...]: ...

    async def remember(
        self, context: MemoryAccessContext, candidate: MemoryCandidate
    ) -> MemoryReceipt: ...
