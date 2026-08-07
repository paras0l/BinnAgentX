from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

import pytest
from binnagent_agent.tools import (
    ExpectedVersionScope,
    ToolActorType,
    ToolAuditStrategy,
    ToolContext,
    ToolExecutor,
    ToolKind,
    ToolRegistry,
    ToolResult,
    ToolRiskLevel,
    ToolSpec,
    ToolStatus,
    runtime_registry,
)
from binnagent_domain.model_errors import LearnerBalanceInsufficientError
from pydantic import ValidationError


def _context(**updates: object) -> ToolContext:
    values: dict[str, object] = {
        "trace_id": "trace_tool_contract_0001",
        "workflow_run_id": "run_tool_contract_0001",
        "task_id": "task_tool_contract_0001",
        "learner_id": "learner_tool_contract_0001",
        "actor_type": ToolActorType.LEARNER,
        "task_type": "micro_expression",
        "expected_task_version": 1,
        "invocation_key": "invocation_tool_contract_0001",
        "deadline_at": datetime.now(UTC) + timedelta(seconds=5),
    }
    values.update(updates)
    return ToolContext.model_validate(values)


def _spec(**updates: object) -> ToolSpec:
    values: dict[str, object] = {
        "name": "test.execute.v1",
        "version": "1.0.0",
        "kind": ToolKind.QUERY,
        "risk_level": ToolRiskLevel.LOW,
        "allowed_actor_types": frozenset({ToolActorType.LEARNER}),
        "timeout_seconds": 1,
        "max_calls_per_run": 1,
        "fallback_policy": "reject",
        "input_schema": {"type": "object"},
        "output_schema": {"type": "object"},
    }
    values.update(updates)
    if values.get("requires_audit") and "audit_strategy" not in updates:
        values["audit_strategy"] = ToolAuditStrategy.EXECUTOR
    return ToolSpec.model_validate(values)


def test_registered_tools_own_their_input_and_output_schemas() -> None:
    specs = runtime_registry.list()

    assert specs
    assert all(spec.input_schema["type"] == "object" for spec in specs)
    assert all(spec.output_schema["type"] == "object" for spec in specs)
    assert runtime_registry.get("workflow.advance.v1").expected_version_scope is (
        ExpectedVersionScope.RUN
    )
    assert runtime_registry.get("reading.analyze_selection.v1").expected_version_scope is (
        ExpectedVersionScope.TASK
    )


def test_tool_definition_rejects_invalid_schema_and_duplicate_names() -> None:
    with pytest.raises(ValidationError, match="tool_input_schema_must_be_object"):
        _spec(input_schema={"type": "string"})

    spec = _spec()
    with pytest.raises(ValueError, match="duplicate_tool_name"):
        ToolRegistry((spec, spec))

    with pytest.raises(ValidationError, match="tool_executor_audit_strategy_mismatch"):
        _spec(audit_strategy=ToolAuditStrategy.EXECUTOR)

    with pytest.raises(ValidationError, match="String should have at most 59 characters"):
        _spec(name=f"test.{'x' * 50}.execute.v1")


def test_tool_result_envelope_rejects_inconsistent_states() -> None:
    with pytest.raises(ValidationError, match="tool_success_data_required"):
        ToolResult[dict[str, bool]](status=ToolStatus.SUCCEEDED)
    with pytest.raises(ValidationError, match="tool_failure_data_forbidden"):
        ToolResult(
            status=ToolStatus.REJECTED,
            data={"executed": False},
            reason_codes=["rejected"],
        )
    with pytest.raises(ValidationError, match="tool_failure_reason_required"):
        ToolResult(status=ToolStatus.TERMINAL_ERROR)
    with pytest.raises(ValidationError, match="String should match pattern"):
        ToolResult(status=ToolStatus.REJECTED, reason_codes=["not a stable code"])


@pytest.mark.asyncio
async def test_executor_requires_the_declared_version_scope() -> None:
    spec = _spec(expected_version_scope=ExpectedVersionScope.RUN)
    executor = ToolExecutor(ToolRegistry((spec,)))

    async def handler(_: ToolContext) -> ToolResult[dict[str, bool]]:
        return ToolResult(status=ToolStatus.SUCCEEDED, data={"executed": True})

    rejected = await executor.execute(
        spec.name,
        _context(expected_task_version=1, expected_run_version=None),
        handler,
    )
    accepted = await executor.execute(
        spec.name,
        _context(expected_task_version=None, expected_run_version=1),
        handler,
    )

    assert rejected.status is ToolStatus.REJECTED
    assert rejected.reason_codes == ["tool_expected_run_version_required"]
    assert accepted.status is ToolStatus.SUCCEEDED


@pytest.mark.asyncio
async def test_executor_does_not_hide_learner_balance_failure() -> None:
    spec = _spec()
    executor = ToolExecutor(ToolRegistry((spec,)))

    async def handler(_: ToolContext) -> ToolResult[dict[str, bool]]:
        raise LearnerBalanceInsufficientError("learner_tool_contract_0001", 100, 100)

    with pytest.raises(LearnerBalanceInsufficientError):
        await executor.execute(spec.name, _context(), handler)


@pytest.mark.asyncio
async def test_executor_enforces_approval_permissions_and_timeout() -> None:
    spec = _spec(
        required_permission_scopes=frozenset({"content:publish"}),
        requires_human_approval=True,
    )
    executor = ToolExecutor(ToolRegistry((spec,)))

    async def handler(_: ToolContext) -> ToolResult[dict[str, bool]]:
        await asyncio.sleep(0.02)
        return ToolResult(status=ToolStatus.SUCCEEDED, data={"executed": True})

    missing_scope = await executor.execute(spec.name, _context(), handler)
    missing_approval = await executor.execute(
        spec.name,
        _context(permission_scopes=frozenset({"content:publish"})),
        handler,
    )
    expired = await executor.execute(
        spec.name,
        _context(
            permission_scopes=frozenset({"content:publish"}),
            deadline_at=datetime.now(UTC) - timedelta(seconds=1),
        ),
        handler,
        human_approved=True,
    )

    assert missing_scope.reason_codes == ["tool_permission_scope_missing"]
    assert missing_approval.reason_codes == ["tool_human_approval_required"]
    assert expired.status is ToolStatus.RETRYABLE_ERROR
    assert expired.reason_codes == ["tool_deadline_expired"]
    assert expired.retryable is True


@pytest.mark.asyncio
async def test_executor_requires_persistent_usage_and_enforces_call_limit() -> None:
    spec = _spec(requires_call_accounting=True, max_calls_per_run=1)
    executor = ToolExecutor(ToolRegistry((spec,)))

    async def handler(_: ToolContext) -> ToolResult[dict[str, bool]]:
        return ToolResult(status=ToolStatus.SUCCEEDED, data={"executed": True})

    class UsagePort:
        def __init__(self, count: int) -> None:
            self.count = count

        async def admit_call(
            self,
            *,
            context: ToolContext,
            tool_name: str,
            max_calls_per_run: int,
        ) -> bool:
            assert context.workflow_run_id == "run_tool_contract_0001"
            assert tool_name == spec.name
            return self.count <= max_calls_per_run

    unavailable = await executor.execute(spec.name, _context(), handler)
    allowed = await executor.execute(spec.name, _context(), handler, usage_port=UsagePort(1))
    rejected = await executor.execute(spec.name, _context(), handler, usage_port=UsagePort(2))

    assert unavailable.status is ToolStatus.TERMINAL_ERROR
    assert unavailable.reason_codes == ["tool_usage_accounting_unavailable"]
    assert allowed.status is ToolStatus.SUCCEEDED
    assert rejected.status is ToolStatus.REJECTED
    assert rejected.reason_codes == ["tool_call_limit_exceeded"]


@pytest.mark.asyncio
async def test_executor_attaches_transactional_audit_result() -> None:
    spec = _spec()
    executor = ToolExecutor(ToolRegistry((spec,)))

    async def handler(_: ToolContext) -> ToolResult[dict[str, bool]]:
        return ToolResult(
            status=ToolStatus.SUCCEEDED,
            data={"executed": True},
            version_before=1,
            version_after=2,
        )

    class AuditPort:
        async def record_tool_result(
            self,
            *,
            context: ToolContext,
            tool_name: str,
            status: str,
            reason_codes: tuple[str, ...],
            version_before: int | None,
            version_after: int | None,
        ) -> str:
            assert context.workflow_run_id == "run_tool_contract_0001"
            assert tool_name == spec.name
            assert status == "succeeded"
            assert reason_codes == ()
            assert (version_before, version_after) == (1, 2)
            return "audit_event_tool_contract_0001"

    result = await executor.execute(spec.name, _context(), handler, audit_port=AuditPort())

    assert result.status is ToolStatus.SUCCEEDED
    assert result.audit_event_id == "audit_event_tool_contract_0001"


@pytest.mark.asyncio
async def test_executor_requires_declared_audit_and_rejects_forbidden_fallback() -> None:
    audit_spec = _spec(requires_audit=True)
    fallback_spec = _spec(name="test.no_fallback.v1", fallback_policy="reject")

    async def success_handler(_: ToolContext) -> ToolResult[dict[str, bool]]:
        return ToolResult(status=ToolStatus.SUCCEEDED, data={"executed": True})

    async def fallback_handler(_: ToolContext) -> ToolResult[dict[str, bool]]:
        return ToolResult(
            status=ToolStatus.SUCCEEDED,
            data={"executed": True},
            used_fallback=True,
        )

    missing_audit = await ToolExecutor(ToolRegistry((audit_spec,))).execute(
        audit_spec.name,
        _context(),
        success_handler,
    )
    rejected_fallback = await ToolExecutor(ToolRegistry((fallback_spec,))).execute(
        fallback_spec.name,
        _context(),
        fallback_handler,
    )

    assert missing_audit.status is ToolStatus.TERMINAL_ERROR
    assert missing_audit.reason_codes == ["tool_audit_unavailable"]
    assert rejected_fallback.status is ToolStatus.REJECTED
    assert rejected_fallback.reason_codes == ["tool_fallback_not_allowed"]
    assert rejected_fallback.data is None


@pytest.mark.asyncio
async def test_executor_validates_input_and_output_schema() -> None:
    spec = _spec(
        input_schema={"type": "object", "required": ["value"]},
        output_schema={
            "type": "object",
            "required": ["accepted"],
            "properties": {"accepted": {"type": "boolean"}},
        },
    )
    executor = ToolExecutor(ToolRegistry((spec,)))

    async def invalid_output(_: ToolContext) -> ToolResult[dict[str, str]]:
        return ToolResult(status=ToolStatus.SUCCEEDED, data={"accepted": "yes"})

    invalid_input = await executor.execute(spec.name, _context(), invalid_output, payload={})
    invalid_result = await executor.execute(
        spec.name,
        _context(),
        invalid_output,
        payload={"value": 1},
    )

    assert invalid_input.status is ToolStatus.REJECTED
    assert invalid_input.reason_codes == ["tool_input_invalid"]
    assert invalid_result.status is ToolStatus.TERMINAL_ERROR
    assert invalid_result.reason_codes == ["tool_output_invalid"]


@pytest.mark.asyncio
async def test_executor_honors_external_policy_without_process_local_refresh() -> None:
    spec = _spec()

    class DisabledPolicy:
        async def is_enabled(self, *, tool_name: str) -> bool:
            assert tool_name == spec.name
            return False

    async def handler(_: ToolContext) -> ToolResult[dict[str, bool]]:
        raise AssertionError("disabled tool handler must not run")

    result = await ToolExecutor(ToolRegistry((spec,))).execute(
        spec.name,
        _context(),
        handler,
        policy_port=DisabledPolicy(),
    )

    assert result.status is ToolStatus.REJECTED
    assert result.reason_codes == ["tool_disabled"]

    class EnabledPolicy:
        async def is_enabled(self, *, tool_name: str) -> bool:
            return True

    registry = ToolRegistry((spec,))
    registry.set_enabled(spec.name, False)

    async def success_handler(_: ToolContext) -> ToolResult[dict[str, bool]]:
        return ToolResult(status=ToolStatus.SUCCEEDED, data={"executed": True})

    reenabled = await ToolExecutor(registry).execute(
        spec.name,
        _context(),
        success_handler,
        policy_port=EnabledPolicy(),
    )
    assert reenabled.status is ToolStatus.SUCCEEDED


@pytest.mark.asyncio
async def test_executor_stabilizes_unknown_tool_and_port_failures() -> None:
    spec = _spec(requires_call_accounting=True)
    executor = ToolExecutor(ToolRegistry((spec,)))

    async def handler(_: ToolContext) -> ToolResult[dict[str, bool]]:
        return ToolResult(status=ToolStatus.SUCCEEDED, data={"executed": True})

    class BrokenPolicy:
        async def is_enabled(self, *, tool_name: str) -> bool:
            raise RuntimeError(tool_name)

    class BrokenUsage:
        async def admit_call(
            self,
            *,
            context: ToolContext,
            tool_name: str,
            max_calls_per_run: int,
        ) -> bool:
            raise RuntimeError(tool_name)

    unknown = await executor.execute("test.unknown.v1", _context(), handler)
    policy_failure = await executor.execute(
        spec.name, _context(), handler, policy_port=BrokenPolicy()
    )
    usage_failure = await executor.execute(spec.name, _context(), handler, usage_port=BrokenUsage())

    assert unknown.reason_codes == ["tool_not_registered"]
    assert policy_failure.reason_codes == ["tool_policy_unavailable"]
    assert usage_failure.reason_codes == ["tool_usage_accounting_failed"]
