from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum


class BudgetDecision(StrEnum):
    ALLOW = "allow"
    USE_DETERMINISTIC_FALLBACK = "use_deterministic_fallback"


@dataclass(frozen=True, slots=True)
class ModelBudget:
    call_count: int
    cost_usd: Decimal
    max_calls: int = 3
    max_cost_usd: Decimal = Decimal("0.20")

    def __post_init__(self) -> None:
        if self.call_count < 0 or self.max_calls < 0:
            raise ValueError("model call counts cannot be negative")
        if self.cost_usd < 0 or self.max_cost_usd < 0:
            raise ValueError("model costs cannot be negative")


def evaluate_model_budget(current: ModelBudget, next_call_estimate_usd: Decimal) -> BudgetDecision:
    if next_call_estimate_usd < 0:
        raise ValueError("next call estimate cannot be negative")
    if current.call_count >= current.max_calls:
        return BudgetDecision.USE_DETERMINISTIC_FALLBACK
    if current.cost_usd + next_call_estimate_usd > current.max_cost_usd:
        return BudgetDecision.USE_DETERMINISTIC_FALLBACK
    return BudgetDecision.ALLOW
