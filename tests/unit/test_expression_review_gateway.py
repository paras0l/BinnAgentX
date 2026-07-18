from decimal import Decimal

import pytest
from binnagent_agent import (
    DeterministicExpressionReviewAdapter,
    ExpressionReviewGateway,
    ExpressionReviewRequest,
    GatewayOutcome,
    ModelAdapterResponse,
    ModelBudget,
)


def request() -> ExpressionReviewRequest:
    return ExpressionReviewRequest(
        workflow_run_id="workflow_run_expression_review",
        task_id="task_expression_review",
        content_version_id="micro_expression_01_v1",
        draft="Digital tools can support learning, but students should reason before using them.",
        recent_assets=(("让步结构", "can support ..., but ..."),),
    )


def budget() -> ModelBudget:
    return ModelBudget(
        call_count=0,
        cost_usd=Decimal("0"),
        max_calls=3,
        max_cost_usd=Decimal("0.20"),
    )


class StubExpressionReviewAdapter:
    name = "stub_remote"
    is_remote = True
    estimated_cost_usd = Decimal("0.02")

    def __init__(self, payload: object) -> None:
        self.payload = payload

    async def generate(self, _: ExpressionReviewRequest) -> ModelAdapterResponse:
        return ModelAdapterResponse(payload=self.payload, actual_cost_usd=Decimal("0.02"))


def valid_payload() -> dict[str, object]:
    return {
        "schema_version": "1.0.0",
        "original_quote": "Digital tools can support learning",
        "thinking_difference": (
            "The original leads with the tool, while the revisions lead with the learner's action."
        ),
        "versions": [
            {
                "style": "logic_mirror",
                "label": "中式思路镜像",
                "text": (
                    "Digital tools can support learning, but students should reason before "
                    "using them."
                ),
                "explanation": ["It preserves the original information order."],
            },
            {
                "style": "academic",
                "label": "地道学术版",
                "text": (
                    "Although digital tools may support learning, their use should follow "
                    "independent reasoning."
                ),
                "explanation": ["The concession narrows the claim."],
            },
            {
                "style": "news",
                "label": "极简新闻版",
                "text": "Students should reason before turning to digital tools.",
                "explanation": ["The main action appears first."],
            },
        ],
    }


@pytest.mark.asyncio
async def test_review_fixture_always_returns_three_explicit_styles() -> None:
    result = await ExpressionReviewGateway(
        DeterministicExpressionReviewAdapter(), timeout_seconds=1
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.VALIDATED_FIXTURE
    assert {version.style for version in result.versions} == {
        "logic_mirror",
        "academic",
        "news",
    }
    assert result.used_remote_call is False
    assert result.versions[1].text != request().draft
    assert result.versions[2].text != request().draft


@pytest.mark.asyncio
async def test_review_rejects_missing_style_and_falls_back_without_losing_draft() -> None:
    payload = valid_payload()
    payload["versions"] = payload["versions"][:2]  # type: ignore[index]
    result = await ExpressionReviewGateway(
        StubExpressionReviewAdapter(payload), timeout_seconds=1, allow_remote=True
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.INVALID_OUTPUT_FALLBACK
    assert result.rejection_code == "model_output_schema_invalid"
    assert result.versions[0].text == request().draft


@pytest.mark.asyncio
async def test_review_accepts_valid_remote_output_with_exact_original_evidence() -> None:
    result = await ExpressionReviewGateway(
        StubExpressionReviewAdapter(valid_payload()), timeout_seconds=1, allow_remote=True
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.VALIDATED_MODEL
    assert result.evidence_hash is not None
    assert result.reason_code == "expression_review_model_validated"
