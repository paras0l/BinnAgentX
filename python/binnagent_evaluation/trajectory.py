"""Framework-neutral trajectory checks for constrained Agent workflows."""

from __future__ import annotations

from dataclasses import dataclass
from itertools import pairwise


@dataclass(frozen=True, slots=True)
class TrajectoryEvaluation:
    passed: bool
    reason_codes: tuple[str, ...]


def evaluate_trajectory(
    steps: tuple[str, ...],
    *,
    allowed_steps: frozenset[str],
    required_order: tuple[str, ...],
    max_model_calls: int,
) -> TrajectoryEvaluation:
    reasons: list[str] = []
    if any(step not in allowed_steps for step in steps):
        reasons.append("trajectory_step_not_allowed")
    cursor = 0
    for step in steps:
        if cursor < len(required_order) and step == required_order[cursor]:
            cursor += 1
    if cursor != len(required_order):
        reasons.append("trajectory_required_order_missing")
    if sum(step.startswith("model.") for step in steps) > max_model_calls:
        reasons.append("trajectory_model_budget_exceeded")
    if any(left == right for left, right in pairwise(steps)):
        reasons.append("trajectory_duplicate_step")
    return TrajectoryEvaluation(not reasons, tuple(reasons))
