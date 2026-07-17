from decimal import Decimal

import pytest
from binnagent_agent import (
    AnnotationAnalysisGateway,
    AnnotationAnalysisRequest,
    DeterministicAnnotationAnalysisAdapter,
    GatewayOutcome,
    ModelAdapterResponse,
    ModelBudget,
)


def request() -> AnnotationAnalysisRequest:
    return AnnotationAnalysisRequest(
        workflow_run_id="workflow_run_annotation",
        task_id="task_annotation",
        content_version_id="content_version_annotation",
        selected_text="the effort needed to understand sentence structure",
        paragraph_context=(
            "Complete translations can replace the effort needed to understand sentence "
            "structure, so learners should reason before relying on them."
        ),
        learner_question="我还没理清这个长句的主干和修饰关系。",
        fallback_focus="syntax",
        fallback_diagnosis="这个卡点更像是主干和修饰层级混在了一起。",
        fallback_breakdown=("先找谓语和主语。", "暂时拿掉修饰语。", "再逐层放回原句。"),
        fallback_next_check="去掉修饰后, 谁做了什么?",
    )


def budget() -> ModelBudget:
    return ModelBudget(
        call_count=0,
        cost_usd=Decimal("0"),
        max_calls=3,
        max_cost_usd=Decimal("0.20"),
    )


class StubRemoteAnalysisAdapter:
    name = "stub_remote"
    is_remote = True
    estimated_cost_usd = Decimal("0.05")

    def __init__(self, payload: object) -> None:
        self.payload = payload

    async def generate(self, _: AnnotationAnalysisRequest) -> ModelAdapterResponse:
        return ModelAdapterResponse(payload=self.payload, actual_cost_usd=Decimal("0.04"))


def valid_payload() -> dict[str, object]:
    return {
        "schema_version": "1.0.0",
        "focus": "syntax",
        "diagnosis": "The learner is mixing the sentence core with its modifying phrase.",
        "breakdown": [
            "Locate the finite verb and its subject.",
            "Temporarily remove the modifying phrase.",
        ],
        "next_check": "Can you state who does what after removing the modifier?",
        "evidence_quote": "effort needed to understand sentence structure",
        "answer_text": None,
    }


@pytest.mark.asyncio
async def test_deterministic_analysis_is_structured_and_answer_free() -> None:
    result = await AnnotationAnalysisGateway(
        DeterministicAnnotationAnalysisAdapter(), timeout_seconds=1
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.VALIDATED_FIXTURE
    assert result.focus == "syntax"
    assert len(result.breakdown) == 3
    assert not hasattr(result, "answer_text")


@pytest.mark.asyncio
async def test_valid_remote_analysis_requires_evidence_from_paragraph() -> None:
    result = await AnnotationAnalysisGateway(
        StubRemoteAnalysisAdapter(valid_payload()), timeout_seconds=1, allow_remote=True
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.VALIDATED_MODEL
    assert result.evidence_hash is not None
    assert result.reason_code == "annotation_analysis_model_validated"


@pytest.mark.asyncio
async def test_answer_or_unverifiable_evidence_forces_safe_fallback() -> None:
    payload = valid_payload()
    payload["answer_text"] = "Option B"
    payload["evidence_quote"] = "text that is not in the paragraph"
    result = await AnnotationAnalysisGateway(
        StubRemoteAnalysisAdapter(payload), timeout_seconds=1, allow_remote=True
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.INVALID_OUTPUT_FALLBACK
    assert result.focus == "syntax"
    assert result.rejection_code == "model_output_schema_invalid"
