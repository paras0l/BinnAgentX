"""Pure planning boundary for expression-lab model reviews."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ExpressionReviewPlan:
    draft: str
    recent_assets: tuple[tuple[str, str], ...]


class ExpressionLabWorkflow:
    def plan_review(
        self,
        *,
        draft: str,
        explicit_assets: tuple[tuple[str, str], ...],
        recalled_memories: tuple[tuple[str, str], ...],
    ) -> ExpressionReviewPlan:
        normalized = draft.strip()
        if not normalized:
            raise ValueError("expression_review_draft_required")
        combined = tuple(dict.fromkeys((*explicit_assets, *recalled_memories)))[:12]
        return ExpressionReviewPlan(draft=normalized, recent_assets=combined)
