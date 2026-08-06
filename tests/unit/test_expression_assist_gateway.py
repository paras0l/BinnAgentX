from decimal import Decimal

import pytest
from binnagent_agent import (
    DeterministicExpressionAssistAdapter,
    ExpressionAssistGateway,
    ExpressionAssistRequest,
    GatewayOutcome,
    ModelAdapterResponse,
    ModelBudget,
)


def request(*, generation_index: int = 1) -> ExpressionAssistRequest:
    return ExpressionAssistRequest(
        workflow_run_id="workflow_run_expression_assist",
        task_id="task_expression_assist",
        input_attempt_version_id="attempt_expression_v1",
        content_version_id="micro_expression_01_v1",
        chinese_intent="我想表达工具可以帮助核对细节, 但不能替代独立思考。",
        learner_draft="Tools can help students check details.",
        situation="A short academic response about learning tools.",
        audience="An educated general reader.",
        purpose="State a balanced position.",
        target_argument_move="Concede a benefit before setting a boundary.",
        generation_index=generation_index,
        previous_candidate=(
            "Tools can help with details, but they should not replace independent thought."
            if generation_index > 1
            else None
        ),
        recent_assets=(("让步结构", "can help ..., but should not replace ..."),),
    )


def budget() -> ModelBudget:
    return ModelBudget(
        call_count=0,
        cost_usd=Decimal("0"),
        max_calls=3,
        max_cost_usd=Decimal("0.20"),
    )


class StubRemoteAdapter:
    name = "stub_remote"
    is_remote = True
    estimated_cost_usd = Decimal("0.02")

    def __init__(self, payload: object) -> None:
        self.payload = payload

    async def generate(self, _: ExpressionAssistRequest) -> ModelAdapterResponse:
        return ModelAdapterResponse(payload=self.payload, actual_cost_usd=Decimal("0.02"))


@pytest.mark.asyncio
async def test_fixture_returns_contextual_recommendation_and_usage_notes() -> None:
    result = await ExpressionAssistGateway(
        DeterministicExpressionAssistAdapter(), timeout_seconds=1
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.VALIDATED_FIXTURE
    assert result.recommended_expression
    assert result.context_fit
    assert len(result.usage_notes) >= 1
    assert result.used_remote_call is False


@pytest.mark.asyncio
async def test_regeneration_returns_a_different_candidate_strategy() -> None:
    gateway = ExpressionAssistGateway(DeterministicExpressionAssistAdapter(), timeout_seconds=1)

    first = await gateway.generate(request(), budget())
    second = await gateway.generate(request(generation_index=2), budget())

    assert first.recommended_expression != second.recommended_expression


@pytest.mark.asyncio
async def test_remote_disabled_is_explicitly_unavailable_without_fake_translation() -> None:
    result = await ExpressionAssistGateway(
        StubRemoteAdapter(
            {
                "schema_version": "1.0.0",
                "recommended_expression": "A recommendation that must not be used.",
                "context_fit": "This would otherwise satisfy the contract.",
                "usage_notes": ["Use it only in this context."],
            }
        ),
        timeout_seconds=1,
        allow_remote=False,
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.REMOTE_DISABLED_FALLBACK
    assert result.recommended_expression is None
    assert result.context_fit is None
    assert result.usage_notes == ()
    assert result.rejection_code == "remote_model_calls_disabled"


@pytest.mark.asyncio
async def test_invalid_model_output_is_unavailable_instead_of_literal_fallback() -> None:
    result = await ExpressionAssistGateway(
        StubRemoteAdapter(
            {
                "schema_version": "1.0.0",
                "recommended_expression": "A valid-looking sentence.",
                "context_fit": "Too short",
                "usage_notes": [],
            }
        ),
        timeout_seconds=1,
        allow_remote=True,
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.INVALID_OUTPUT_FALLBACK
    assert result.recommended_expression is None
    assert result.rejection_code == "model_output_schema_invalid"
