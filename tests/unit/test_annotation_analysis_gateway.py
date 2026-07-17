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
        selection_scope="sentence_or_paragraph",
        learner_question="我还没理清这个长句的主干和修饰关系。",
        fallback_focus="syntax",
        fallback_diagnosis="这个卡点更像是主干和修饰层级混在了一起。",
        fallback_breakdown=("先找谓语和主语。", "暂时拿掉修饰语。", "再逐层放回原句。"),
        fallback_next_check="去掉修饰后, 谁做了什么?",
        fallback_translation="理解句子结构所需要付出的努力",
        fallback_grammar_structure=("主干: effort 是中心名词。", "needed to... 是后置修饰。"),
    )


def vocabulary_request() -> AnnotationAnalysisRequest:
    return AnnotationAnalysisRequest(
        workflow_run_id="workflow_run_annotation",
        task_id="task_annotation",
        content_version_id="content_version_annotation",
        selected_text="capacity",
        paragraph_context="The new rule did not add capacity.",
        selection_scope="word_or_phrase",
        learner_question="这个词在这里是什么意思?",
        fallback_focus="vocabulary",
        fallback_diagnosis="这是词级卡点, 应先确认当前语境义。",
        fallback_breakdown=("先判断词性。", "再用前后搭配验证。"),
        fallback_next_check="把暂定词义放回原句后是否通顺?",
        fallback_vocabulary_note="这里需要结合 add 的宾语搭配判断语境义。",
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
        "schema_version": "1.1.0",
        "selection_scope": "sentence_or_paragraph",
        "focus": "syntax",
        "translation": "理解句子结构所需要付出的努力",
        "vocabulary_note": None,
        "grammar_structure": [
            "主干中心是 effort。",
            "needed to understand sentence structure 后置修饰 effort。",
        ],
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
    assert result.translation == "理解句子结构所需要付出的努力"
    assert len(result.grammar_structure) == 2
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
async def test_word_selection_requires_vocabulary_help_instead_of_sentence_translation() -> None:
    payload = {
        "schema_version": "1.1.0",
        "selection_scope": "word_or_phrase",
        "focus": "vocabulary",
        "translation": None,
        "vocabulary_note": "capacity 在这里是名词, 表示空间或设施可容纳的总量。",
        "grammar_structure": [],
        "diagnosis": "The learner needs the contextual noun meaning rather than a sentence parse.",
        "breakdown": ["Confirm the noun role.", "Check the collocation add capacity."],
        "next_check": "Does the meaning total room fit the contrast in the sentence?",
        "evidence_quote": "capacity",
        "answer_text": None,
    }
    result = await AnnotationAnalysisGateway(
        StubRemoteAnalysisAdapter(payload), timeout_seconds=1, allow_remote=True
    ).generate(vocabulary_request(), budget())

    assert result.outcome is GatewayOutcome.VALIDATED_MODEL
    assert result.selection_scope == "word_or_phrase"
    assert result.translation is None
    assert result.vocabulary_note is not None
    assert result.grammar_structure == ()


@pytest.mark.asyncio
async def test_sentence_analysis_without_translation_forces_safe_fallback() -> None:
    payload = valid_payload()
    payload["translation"] = None
    result = await AnnotationAnalysisGateway(
        StubRemoteAnalysisAdapter(payload), timeout_seconds=1, allow_remote=True
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.INVALID_OUTPUT_FALLBACK
    assert result.rejection_code == "model_selection_assistance_mismatch"
    assert result.translation == "理解句子结构所需要付出的努力"


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
