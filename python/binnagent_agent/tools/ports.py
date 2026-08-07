"""Application ports required by tools; implementations live in services/api."""

from __future__ import annotations

from typing import Protocol

from binnagent_agent.tools.contracts import ToolContext


class RuntimeContextPort(Protocol):
    async def get_runtime_context(self, context: ToolContext) -> dict[str, object]: ...


class ToolAuditPort(Protocol):
    async def record_tool_result(
        self,
        *,
        context: ToolContext,
        tool_name: str,
        status: str,
        reason_codes: tuple[str, ...],
        version_before: int | None,
        version_after: int | None,
    ) -> str: ...


class ToolUsagePort(Protocol):
    async def admit_call(
        self,
        *,
        context: ToolContext,
        tool_name: str,
        max_calls_per_run: int,
    ) -> bool: ...


class ToolPolicyPort(Protocol):
    async def is_enabled(self, *, tool_name: str) -> bool: ...


class ModelInvocationLedgerPort(Protocol):
    async def reserve(
        self,
        *,
        context: ToolContext,
        tool_name: str,
        request_hash: str,
    ) -> dict[str, object] | None: ...

    async def complete(
        self,
        *,
        context: ToolContext,
        response_payload: dict[str, object],
        output_hash: str,
    ) -> None: ...
