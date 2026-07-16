from decimal import Decimal

import pytest
from binnagent_workflow.budget import BudgetDecision, ModelBudget, evaluate_model_budget


def test_budget_allows_a_call_within_both_limits() -> None:
    budget = ModelBudget(call_count=1, cost_usd=Decimal("0.04"))

    assert evaluate_model_budget(budget, Decimal("0.05")) is BudgetDecision.ALLOW


@pytest.mark.parametrize(
    ("budget", "estimate"),
    [
        (ModelBudget(call_count=3, cost_usd=Decimal("0.01")), Decimal("0.01")),
        (ModelBudget(call_count=1, cost_usd=Decimal("0.19")), Decimal("0.02")),
    ],
)
def test_budget_uses_deterministic_fallback_at_a_limit(
    budget: ModelBudget,
    estimate: Decimal,
) -> None:
    assert evaluate_model_budget(budget, estimate) is BudgetDecision.USE_DETERMINISTIC_FALLBACK


def test_budget_rejects_negative_values() -> None:
    with pytest.raises(ValueError, match="cannot be negative"):
        ModelBudget(call_count=-1, cost_usd=Decimal("0"))
