"""Shared authorization, deadline, and result-envelope enforcement for tools."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from time import perf_counter
from typing import Any, TypeVar

from binnagent_domain.model_errors import ModelBalanceError
from jsonschema import ValidationError as JsonSchemaValidationError
from jsonschema import validate as validate_json_schema
from pydantic_core import to_jsonable_python

from binnagent_agent.tools.contracts import (
    ExpectedVersionScope,
    ToolContext,
    ToolResult,
    ToolSpec,
    ToolStatus,
)
from binnagent_agent.tools.errors import ToolExecutionError
from binnagent_agent.tools.ports import ToolAuditPort, ToolPolicyPort, ToolUsagePort
from binnagent_agent.tools.registry import ToolRegistry

T = TypeVar("T")
ToolHandler = Callable[[ToolContext], Awaitable[ToolResult[T]]]


class ToolExecutor:
    """Apply code-owned guardrails before a business-use-case tool runs.

    Database idempotency locks, audit records, and outbox messages belong in
    adapters, keeping this package independent from HTTP and SQLAlchemy.
    """

    def __init__(self, registry: ToolRegistry) -> None:
        self._registry = registry

    async def execute(
        self,
        tool_name: str,
        context: ToolContext,
        handler: ToolHandler[T],
        *,
        payload: object | None = None,
        human_approved: bool = False,
        usage_port: ToolUsagePort | None = None,
        audit_port: ToolAuditPort | None = None,
        policy_port: ToolPolicyPort | None = None,
    ) -> ToolResult[T]:
        try:
            spec = self._registry.get(tool_name)
        except KeyError:
            return ToolResult(
                status=ToolStatus.REJECTED,
                reason_codes=["tool_not_registered"],
            )
        try:
            enabled = (
                await policy_port.is_enabled(tool_name=tool_name)
                if policy_port is not None
                else self._registry.is_enabled(tool_name)
            )
        except Exception:
            return ToolResult(
                status=ToolStatus.TERMINAL_ERROR,
                reason_codes=["tool_policy_unavailable"],
            )
        if not enabled:
            return ToolResult(status=ToolStatus.REJECTED, reason_codes=["tool_disabled"])
        rejection = self._validate(spec, context, human_approved)
        if rejection is not None:
            return ToolResult(status=ToolStatus.REJECTED, reason_codes=[rejection])
        if spec.requires_audit and audit_port is None:
            return ToolResult(
                status=ToolStatus.TERMINAL_ERROR,
                reason_codes=["tool_audit_unavailable"],
            )
        try:
            validate_json_schema(
                instance={} if payload is None else payload, schema=spec.input_schema
            )
        except (JsonSchemaValidationError, TypeError, ValueError):
            return ToolResult(
                status=ToolStatus.REJECTED,
                reason_codes=["tool_input_invalid"],
            )
        remaining = (context.deadline_at - datetime.now(UTC)).total_seconds()
        if remaining <= 0:
            return ToolResult(
                status=ToolStatus.RETRYABLE_ERROR,
                reason_codes=["tool_deadline_expired"],
                retryable=True,
            )
        if spec.requires_call_accounting:
            if usage_port is None:
                return ToolResult(
                    status=ToolStatus.TERMINAL_ERROR,
                    reason_codes=["tool_usage_accounting_unavailable"],
                )
            try:
                admitted = await usage_port.admit_call(
                    context=context,
                    tool_name=tool_name,
                    max_calls_per_run=spec.max_calls_per_run,
                )
            except Exception:
                return ToolResult(
                    status=ToolStatus.TERMINAL_ERROR,
                    reason_codes=["tool_usage_accounting_failed"],
                )
            if not admitted:
                return ToolResult(
                    status=ToolStatus.REJECTED,
                    reason_codes=["tool_call_limit_exceeded"],
                )
        started = perf_counter()
        try:
            result = await asyncio.wait_for(
                handler(context), timeout=min(remaining, spec.timeout_seconds)
            )
        except TimeoutError:
            return ToolResult(
                status=ToolStatus.RETRYABLE_ERROR,
                reason_codes=["tool_timeout"],
                latency_ms=self._latency_ms(started),
                retryable=True,
            )
        except ToolExecutionError as exc:
            return ToolResult(
                status=ToolStatus.RETRYABLE_ERROR if exc.retryable else ToolStatus.REJECTED,
                reason_codes=[exc.reason_code],
                latency_ms=self._latency_ms(started),
                retryable=exc.retryable,
            )
        except ModelBalanceError:
            raise
        except Exception:
            return ToolResult(
                status=ToolStatus.TERMINAL_ERROR,
                reason_codes=["tool_execution_failed"],
                latency_ms=self._latency_ms(started),
            )
        result = result.model_copy(update={"latency_ms": self._latency_ms(started)})
        if result.used_fallback and spec.fallback_policy == "reject":
            result = ToolResult(
                status=ToolStatus.REJECTED,
                reason_codes=["tool_fallback_not_allowed"],
                latency_ms=result.latency_ms,
                estimated_cost_usd=result.estimated_cost_usd,
                actual_cost_usd=result.actual_cost_usd,
            )
        if result.data is not None:
            try:
                output: Any = to_jsonable_python(result.data)
                validate_json_schema(instance=output, schema=spec.output_schema)
            except (JsonSchemaValidationError, TypeError, ValueError):
                return ToolResult(
                    status=ToolStatus.TERMINAL_ERROR,
                    reason_codes=["tool_output_invalid"],
                    latency_ms=result.latency_ms,
                    estimated_cost_usd=result.estimated_cost_usd,
                    actual_cost_usd=result.actual_cost_usd,
                )
        if audit_port is None:
            return result
        try:
            audit_event_id = await audit_port.record_tool_result(
                context=context,
                tool_name=tool_name,
                status=result.status.value,
                reason_codes=tuple(result.reason_codes),
                version_before=result.version_before,
                version_after=result.version_after,
            )
        except Exception:
            return ToolResult(
                status=ToolStatus.TERMINAL_ERROR,
                reason_codes=["tool_audit_failed"],
                latency_ms=result.latency_ms,
            )
        return result.model_copy(update={"audit_event_id": audit_event_id})

    @staticmethod
    def _validate(spec: ToolSpec, context: ToolContext, human_approved: bool) -> str | None:
        if context.actor_type not in spec.allowed_actor_types:
            return "tool_actor_not_allowed"
        if spec.allowed_run_stages and context.run_stage not in spec.allowed_run_stages:
            return "tool_stage_not_allowed"
        if spec.allowed_task_types and context.task_type not in spec.allowed_task_types:
            return "tool_task_type_not_allowed"
        if not spec.required_permission_scopes.issubset(context.permission_scopes):
            return "tool_permission_scope_missing"
        if (
            spec.expected_version_scope is ExpectedVersionScope.RUN
            and context.expected_run_version is None
        ):
            return "tool_expected_run_version_required"
        if (
            spec.expected_version_scope is ExpectedVersionScope.TASK
            and context.expected_task_version is None
        ):
            return "tool_expected_task_version_required"
        if spec.requires_idempotency_key and context.idempotency_key is None:
            return "tool_idempotency_key_required"
        if spec.requires_human_approval and not human_approved:
            return "tool_human_approval_required"
        return None

    @staticmethod
    def _latency_ms(started: float) -> int:
        return max(0, round((perf_counter() - started) * 1000))
