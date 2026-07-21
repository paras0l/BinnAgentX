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
    ToolSpec(
        name="obsidian.read_learning_context.v1",
        version="1.0.0",
        kind=ToolKind.QUERY,
        risk_level=ToolRiskLevel.MODERATE,
        allowed_actor_types=frozenset({ToolActorType.ORCHESTRATOR, ToolActorType.SYSTEM}),
        required_permission_scopes=frozenset({"obsidian:read"}),
        timeout_seconds=10,
        max_calls_per_run=12,
        fallback_policy="reject",
    ),
    ToolSpec(
        name="obsidian.write_learning_note.v1",
        version="1.0.0",
        kind=ToolKind.COMMAND,
        risk_level=ToolRiskLevel.HIGH,
        allowed_actor_types=frozenset({ToolActorType.ORCHESTRATOR, ToolActorType.SYSTEM}),
        required_permission_scopes=frozenset({"obsidian:write"}),
        requires_idempotency_key=True,
        timeout_seconds=30,
        max_calls_per_run=8,
        fallback_policy="queue_for_plugin_sync",
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
        self._disabled: set[str] = set()

    def get(self, name: str) -> ToolSpec:
        return self._specs[name]

    def list(self) -> tuple[ToolSpec, ...]:
        return tuple(sorted(self._specs.values(), key=lambda spec: spec.name))

    def set_enabled(self, name: str, enabled: bool) -> None:
        if name not in self._specs:
            raise KeyError(name)
        if enabled:
            self._disabled.discard(name)
        else:
            self._disabled.add(name)

    def is_enabled(self, name: str) -> bool:
        return name in self._specs and name not in self._disabled

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
            if spec.name not in self._disabled
            and actor_type in spec.allowed_actor_types
            and (not spec.allowed_run_stages or run_stage in spec.allowed_run_stages)
            and (not spec.allowed_task_types or task_type in spec.allowed_task_types)
            and spec.required_permission_scopes.issubset(permission_scopes)
        )


runtime_registry = ToolRegistry(_RUNTIME_SPECS)
content_ops_registry = ToolRegistry(_CONTENT_OPS_SPECS)
