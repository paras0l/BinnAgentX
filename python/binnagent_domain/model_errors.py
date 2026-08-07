"""Model billing failures that must remain visible across adapter boundaries."""

from __future__ import annotations

from dataclasses import dataclass


class ModelBalanceError(RuntimeError):
    """Base class for balance failures that must not become model fallbacks."""


@dataclass(eq=False, slots=True)
class ProviderBalanceInsufficientError(ModelBalanceError):
    provider: str

    def __str__(self) -> str:
        return f"model_provider_balance_insufficient:{self.provider}"


@dataclass(eq=False, slots=True)
class LearnerBalanceInsufficientError(ModelBalanceError):
    learner_id: str
    token_limit: int
    used_tokens: int

    def __str__(self) -> str:
        return "learner_model_balance_insufficient"


def provider_balance_error_from(
    error: BaseException,
    *,
    provider: str,
) -> ProviderBalanceInsufficientError | None:
    """Recognize provider billing failures without coupling the domain to an HTTP client."""

    pending: list[BaseException] = [error]
    seen: set[int] = set()
    messages: list[str] = []
    while pending:
        current = pending.pop()
        if id(current) in seen:
            continue
        seen.add(id(current))
        response = getattr(current, "response", None)
        status_code = getattr(response, "status_code", None)
        if status_code == 402:
            return ProviderBalanceInsufficientError(provider)
        messages.append(str(current).lower())
        for linked in (current.__cause__, current.__context__):
            if linked is not None:
                pending.append(linked)

    combined = " ".join(messages)
    markers = (
        "insufficient balance",
        "insufficient_balance",
        "balance not enough",
        "account balance",
        "payment required",
        "余额不足",
        "账户余额",
        "请充值",
    )
    if any(marker in combined for marker in markers):
        return ProviderBalanceInsufficientError(provider)
    return None
