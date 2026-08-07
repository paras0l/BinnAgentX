import httpx2
import pytest
from binnagent_api.apps import _register_error_handlers
from binnagent_domain.model_errors import (
    LearnerBalanceInsufficientError,
    ProviderBalanceInsufficientError,
    provider_balance_error_from,
)
from fastapi import FastAPI


def test_nested_provider_payment_error_is_classified() -> None:
    request = httpx2.Request("POST", "https://models.example/chat/completions")
    response = httpx2.Response(402, request=request)
    cause = httpx2.HTTPStatusError("payment required", request=request, response=response)
    wrapper = RuntimeError("provider request failed")
    wrapper.__cause__ = cause

    error = provider_balance_error_from(wrapper, provider="deepseek")

    assert error is not None
    assert error.provider == "deepseek"


@pytest.mark.asyncio
async def test_public_balance_errors_keep_switch_model_semantics() -> None:
    app = FastAPI()
    _register_error_handlers(app)

    @app.get("/provider")
    async def provider() -> None:
        raise ProviderBalanceInsufficientError("deepseek")

    @app.get("/learner")
    async def learner() -> None:
        raise LearnerBalanceInsufficientError("learner_1", 100, 101)

    transport = httpx2.ASGITransport(app=app)
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        provider_response = await client.get("/provider")
        learner_response = await client.get("/learner")

    assert provider_response.status_code == 503
    assert provider_response.json() == {
        "code": "MODEL_PROVIDER_BALANCE_INSUFFICIENT",
        "reason": "provider_balance_insufficient",
        "provider": "deepseek",
        "can_switch_model": True,
    }
    assert learner_response.status_code == 402
    assert learner_response.json() == {
        "code": "LEARNER_MODEL_BALANCE_INSUFFICIENT",
        "reason": "learner_usage_limit_exhausted",
        "can_switch_model": False,
        "token_limit": 100,
        "used_tokens": 101,
    }
