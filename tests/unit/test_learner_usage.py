from decimal import Decimal

import binnagent_api.learner_usage as learner_usage_module
import pytest
from binnagent_api.learner_usage import (
    LearnerUsageView,
    ensure_model_usage_available,
    learner_usage_scope,
    provider_token_usage,
)
from binnagent_domain.model_errors import LearnerBalanceInsufficientError


def test_provider_token_usage_prefers_reported_openai_counts() -> None:
    assert provider_token_usage(
        {"usage": {"prompt_tokens": 321, "completion_tokens": 79}},
        request_payload=[{"role": "user", "content": "ignored"}],
        output="ignored",
    ) == (321, 79, "provider")


def test_provider_token_usage_supports_ollama_and_estimated_fallback() -> None:
    assert provider_token_usage(
        {"prompt_eval_count": 12, "eval_count": 8},
        request_payload={},
        output="ignored",
    ) == (12, 8, "provider")
    input_tokens, output_tokens, method = provider_token_usage(
        {},
        request_payload=[{"role": "user", "content": "hello"}],
        output="world",
    )
    assert input_tokens > 0
    assert output_tokens > 0
    assert method == "estimated"


@pytest.mark.asyncio
async def test_exhausted_learner_is_rejected_before_next_model_call(monkeypatch) -> None:
    async def exhausted_usage(learner_id: str) -> LearnerUsageView:
        return LearnerUsageView(
            learner_id=learner_id,
            token_limit=100,
            input_tokens=80,
            output_tokens=20,
            used_tokens=100,
            remaining_tokens=0,
            remaining_percent=0,
            cost_cny=Decimal("0.10"),
            reset_at=None,
        )

    monkeypatch.setattr(learner_usage_module, "learner_usage", exhausted_usage)

    with (
        learner_usage_scope("learner_exhausted"),
        pytest.raises(LearnerBalanceInsufficientError),
    ):
        await ensure_model_usage_available()
