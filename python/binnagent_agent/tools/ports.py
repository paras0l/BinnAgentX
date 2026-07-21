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
    ) -> str: ...


class ModelInvocationLedgerPort(Protocol):
    async def reserve(self, *, invocation_key: str, tool_name: str) -> bool: ...

    async def complete(
        self, *, invocation_key: str, output_hash: str, actual_cost_usd: str
    ) -> None: ...
