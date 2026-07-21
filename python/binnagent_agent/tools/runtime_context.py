"""The metadata-only runtime context query exposed to an orchestrator."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from binnagent_agent.tools.contracts import ToolContext, ToolResult, ToolStatus
from binnagent_agent.tools.ports import RuntimeContextPort


class RuntimeContextSnapshot(BaseModel):
    """No attempt body or prompt text crosses this default context boundary."""

    model_config = ConfigDict(extra="forbid")

    current_task_id: str | None = Field(default=None, max_length=128)
    current_task_type: str | None = Field(default=None, max_length=64)
    run_stage: str | None = Field(default=None, max_length=64)
    run_version: int | None = Field(default=None, ge=1)
    task_version: int | None = Field(default=None, ge=1)
    model_call_count: int = Field(ge=0)
    allowed_actions: tuple[str, ...] = ()


async def get_runtime_context(
    context: ToolContext, port: RuntimeContextPort
) -> ToolResult[RuntimeContextSnapshot]:
    snapshot = RuntimeContextSnapshot.model_validate(await port.get_runtime_context(context))
    return ToolResult(
        status=ToolStatus.SUCCEEDED,
        data=snapshot,
        version_before=snapshot.run_version,
        evidence_refs=[],
    )
