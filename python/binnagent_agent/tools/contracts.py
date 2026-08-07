"""Typed contracts for the application-level Agent tool boundary.

Tools deliberately describe teaching use-cases, rather than exposing storage,
HTTP, shell, or raw model-provider capabilities to an agent.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated, Any, Literal

from jsonschema import Draft202012Validator
from pydantic import BaseModel, ConfigDict, Field, model_validator


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


class ToolAuditStrategy(StrEnum):
    NONE = "none"
    EXECUTOR = "executor"
    DOMAIN = "domain"


class ExpectedVersionScope(StrEnum):
    NONE = "none"
    RUN = "run"
    TASK = "task"


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


ReasonCode = Annotated[
    str,
    Field(min_length=1, max_length=64, pattern=r"^[a-z0-9][a-z0-9_.:-]*$"),
]


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
    reason_codes: list[ReasonCode] = Field(default_factory=list)
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

    @model_validator(mode="after")
    def validate_result_envelope(self) -> ToolResult[T]:
        if self.status is ToolStatus.SUCCEEDED and self.data is None:
            raise ValueError("tool_success_data_required")
        if self.status is not ToolStatus.SUCCEEDED:
            if self.data is not None:
                raise ValueError("tool_failure_data_forbidden")
            if not self.reason_codes:
                raise ValueError("tool_failure_reason_required")
        if self.retryable and self.status is not ToolStatus.RETRYABLE_ERROR:
            raise ValueError("tool_retryable_status_mismatch")
        return self


class ToolSpec(BaseModel):
    """Code-owned metadata used by the executor and the allowlist registry."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(
        max_length=59,
        pattern=r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+\.v[0-9]+$",
    )
    version: str = Field(pattern=r"^[0-9]+\.[0-9]+\.[0-9]+$")
    kind: ToolKind
    risk_level: ToolRiskLevel
    allowed_actor_types: frozenset[ToolActorType]
    allowed_run_stages: frozenset[str] = Field(default_factory=frozenset)
    allowed_task_types: frozenset[str] = Field(default_factory=frozenset)
    required_permission_scopes: frozenset[str] = Field(default_factory=frozenset)
    expected_version_scope: ExpectedVersionScope = ExpectedVersionScope.NONE
    requires_idempotency_key: bool = False
    requires_human_approval: bool = False
    requires_call_accounting: bool = False
    requires_audit: bool = False
    audit_strategy: ToolAuditStrategy = ToolAuditStrategy.NONE
    timeout_seconds: int = Field(ge=1, le=300)
    max_calls_per_run: int = Field(ge=1, le=100)
    fallback_policy: str = Field(min_length=1, max_length=80)
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]

    @property
    def requires_expected_version(self) -> bool:
        return self.expected_version_scope is not ExpectedVersionScope.NONE

    @model_validator(mode="after")
    def validate_definition(self) -> ToolSpec:
        if not self.allowed_actor_types:
            raise ValueError("tool_allowed_actor_types_required")
        if self.input_schema.get("type") != "object":
            raise ValueError("tool_input_schema_must_be_object")
        if self.output_schema.get("type") != "object":
            raise ValueError("tool_output_schema_must_be_object")
        Draft202012Validator.check_schema(self.input_schema)
        Draft202012Validator.check_schema(self.output_schema)
        if self.requires_audit != (self.audit_strategy is ToolAuditStrategy.EXECUTOR):
            raise ValueError("tool_executor_audit_strategy_mismatch")
        return self


ToolPayload = dict[str, Any]
