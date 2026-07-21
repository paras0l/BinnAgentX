"""Shared authorization, deadline, and result-envelope enforcement for tools."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from time import perf_counter
from typing import TypeVar

from binnagent_agent.tools.contracts import ToolContext, ToolResult, ToolSpec, ToolStatus
from binnagent_agent.tools.errors import ToolExecutionError
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
        human_approved: bool = False,
    ) -> ToolResult[T]:
        spec = self._registry.get(tool_name)
        rejection = self._validate(spec, context, human_approved)
        if rejection is not None:
            return ToolResult(status=ToolStatus.REJECTED, reason_codes=[rejection])
        remaining = (context.deadline_at - datetime.now(UTC)).total_seconds()
        if remaining <= 0:
            return ToolResult(
                status=ToolStatus.RETRYABLE_ERROR,
                reason_codes=["tool_deadline_expired"],
                retryable=True,
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
        except Exception:
            return ToolResult(
                status=ToolStatus.TERMINAL_ERROR,
                reason_codes=["tool_execution_failed"],
                latency_ms=self._latency_ms(started),
            )
        return result.model_copy(update={"latency_ms": self._latency_ms(started)})

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
        if spec.requires_expected_version and (
            context.expected_run_version is None and context.expected_task_version is None
        ):
            return "tool_expected_version_required"
        if spec.requires_idempotency_key and context.idempotency_key is None:
            return "tool_idempotency_key_required"
        if spec.requires_human_approval and not human_approved:
            return "tool_human_approval_required"
        return None

    @staticmethod
    def _latency_ms(started: float) -> int:
        return max(0, round((perf_counter() - started) * 1000))
