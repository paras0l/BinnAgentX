"""Typed contracts for the application-level Agent tool boundary.

Tools deliberately describe teaching use-cases, rather than exposing storage,
HTTP, shell, or raw model-provider capabilities to an agent.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ToolKind(StrEnum):
    QUERY = "query"
    DECISION = "decision"
    COMMAND = "command"
    MODEL = "model"


class ToolRiskLevel(StrEnum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CONTROL = "control"


class ToolActorType(StrEnum):
    ORCHESTRATOR = "orchestrator"
    LEARNER = "learner"
    SYSTEM = "system"
    DEVELOPER_REVIEWER = "developer_reviewer"


class ToolStatus(StrEnum):
    SUCCEEDED = "succeeded"
    REJECTED = "rejected"
    REVIEW_REQUIRED = "review_required"
    RETRYABLE_ERROR = "retryable_error"
    TERMINAL_ERROR = "terminal_error"


class EvidenceRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence_type: str = Field(min_length=1, max_length=64)
    entity_id: str = Field(min_length=1, max_length=128)
    version: int | None = Field(default=None, ge=1)
    content_hash: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")


class ToolContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trace_id: str = Field(min_length=8, max_length=128)
    workflow_run_id: str = Field(min_length=1, max_length=128)
    task_id: str | None = Field(default=None, min_length=1, max_length=128)
    learner_id: str = Field(min_length=1, max_length=128)
    actor_type: ToolActorType
    permission_scopes: frozenset[str] = Field(default_factory=frozenset)
    run_stage: str | None = Field(default=None, max_length=64)
    task_type: str | None = Field(default=None, max_length=64)
    expected_run_version: int | None = Field(default=None, ge=1)
    expected_task_version: int | None = Field(default=None, ge=1)
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=128)
    invocation_key: str = Field(min_length=16, max_length=128)
    deadline_at: datetime


class ToolResult[T](BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0.0"] = "1.0.0"
    status: ToolStatus
    data: T | None = None
    reason_codes: list[str] = Field(default_factory=list)
    evidence_refs: list[EvidenceRef] = Field(default_factory=list)
    version_before: int | None = None
    version_after: int | None = None
    side_effect_ids: list[str] = Field(default_factory=list)
    used_fallback: bool = False
    estimated_cost_usd: Decimal = Decimal("0")
    actual_cost_usd: Decimal = Decimal("0")
    latency_ms: int = 0
    audit_event_id: str | None = None
    retryable: bool = False


class ToolSpec(BaseModel):
    """Code-owned metadata used by the executor and the allowlist registry."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(pattern=r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+\.v[0-9]+$")
    version: str = Field(pattern=r"^[0-9]+\.[0-9]+\.[0-9]+$")
    kind: ToolKind
    risk_level: ToolRiskLevel
    allowed_actor_types: frozenset[ToolActorType]
    allowed_run_stages: frozenset[str] = Field(default_factory=frozenset)
    allowed_task_types: frozenset[str] = Field(default_factory=frozenset)
    required_permission_scopes: frozenset[str] = Field(default_factory=frozenset)
    requires_expected_version: bool = False
    requires_idempotency_key: bool = False
    requires_human_approval: bool = False
    timeout_seconds: int = Field(ge=1, le=300)
    max_calls_per_run: int = Field(ge=1, le=100)
    fallback_policy: str = Field(min_length=1, max_length=80)


ToolPayload = dict[str, Any]
