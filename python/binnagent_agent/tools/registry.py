"""Deterministic allowlists for learner-runtime and control-plane tools."""

from __future__ import annotations

from binnagent_agent.tools.contracts import ToolActorType, ToolKind, ToolRiskLevel, ToolSpec

_RUNTIME_SPECS = (
    ToolSpec(
        name="runtime.get_context.v1",
        version="1.0.0",
        kind=ToolKind.QUERY,
        risk_level=ToolRiskLevel.LOW,
        allowed_actor_types=frozenset({ToolActorType.ORCHESTRATOR, ToolActorType.SYSTEM}),
        timeout_seconds=5,
        max_calls_per_run=20,
        fallback_policy="reject",
    ),
    ToolSpec(
        name="reading.analyze_selection.v1",
        version="1.0.0",
        kind=ToolKind.MODEL,
        risk_level=ToolRiskLevel.MODERATE,
        allowed_actor_types=frozenset({ToolActorType.LEARNER, ToolActorType.ORCHESTRATOR}),
        allowed_task_types=frozenset({"calibration_reading", "matched_reading"}),
        requires_expected_version=True,
        timeout_seconds=30,
        max_calls_per_run=8,
        fallback_policy="deterministic_selection_explanation",
    ),
    ToolSpec(
        name="expression.deliver_priority_feedback.v1",
        version="1.0.0",
        kind=ToolKind.MODEL,
        risk_level=ToolRiskLevel.MODERATE,
        allowed_actor_types=frozenset({ToolActorType.LEARNER, ToolActorType.ORCHESTRATOR}),
        allowed_task_types=frozenset({"micro_expression"}),
        requires_expected_version=True,
        requires_idempotency_key=True,
        timeout_seconds=30,
        max_calls_per_run=3,
        fallback_policy="deterministic_priority_feedback",
    ),
    ToolSpec(
        name="expression.review_draft.v1",
        version="1.0.0",
        kind=ToolKind.MODEL,
        risk_level=ToolRiskLevel.MODERATE,
        allowed_actor_types=frozenset({ToolActorType.LEARNER, ToolActorType.ORCHESTRATOR}),
        allowed_task_types=frozenset({"micro_expression"}),
        requires_expected_version=True,
        timeout_seconds=30,
        max_calls_per_run=3,
        fallback_policy="deterministic_style_review",
    ),
    ToolSpec(
        name="workflow.advance.v1",
        version="1.0.0",
        kind=ToolKind.COMMAND,
        risk_level=ToolRiskLevel.HIGH,
        allowed_actor_types=frozenset({ToolActorType.ORCHESTRATOR, ToolActorType.SYSTEM}),
        requires_expected_version=True,
        requires_idempotency_key=True,
        timeout_seconds=20,
        max_calls_per_run=8,
        fallback_policy="reject",
    ),
)

_CONTENT_OPS_SPECS = (
    ToolSpec(
        name="content_ops.generate_candidate.v1",
        version="1.0.0",
        kind=ToolKind.MODEL,
        risk_level=ToolRiskLevel.HIGH,
        allowed_actor_types=frozenset({ToolActorType.DEVELOPER_REVIEWER}),
        required_permission_scopes=frozenset({"content:generate"}),
        timeout_seconds=300,
        max_calls_per_run=10,
        fallback_policy="reject",
    ),
    ToolSpec(
        name="content_ops.publish_version.v1",
        version="1.0.0",
        kind=ToolKind.COMMAND,
        risk_level=ToolRiskLevel.CONTROL,
        allowed_actor_types=frozenset({ToolActorType.DEVELOPER_REVIEWER}),
        required_permission_scopes=frozenset({"content:publish"}),
        requires_human_approval=True,
        requires_idempotency_key=True,
        timeout_seconds=30,
        max_calls_per_run=10,
        fallback_policy="reject",
    ),
)


class ToolRegistry:
    def __init__(self, specs: tuple[ToolSpec, ...]) -> None:
        self._specs = {spec.name: spec for spec in specs}

    def get(self, name: str) -> ToolSpec:
        return self._specs[name]

    def allowed_for(
        self,
        *,
        actor_type: ToolActorType,
        run_stage: str | None,
        task_type: str | None,
        permission_scopes: frozenset[str],
    ) -> tuple[ToolSpec, ...]:
        return tuple(
            spec
            for spec in self._specs.values()
            if actor_type in spec.allowed_actor_types
            and (not spec.allowed_run_stages or run_stage in spec.allowed_run_stages)
            and (not spec.allowed_task_types or task_type in spec.allowed_task_types)
            and spec.required_permission_scopes.issubset(permission_scopes)
        )


runtime_registry = ToolRegistry(_RUNTIME_SPECS)
content_ops_registry = ToolRegistry(_CONTENT_OPS_SPECS)
