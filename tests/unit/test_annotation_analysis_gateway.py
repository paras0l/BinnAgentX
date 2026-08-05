from dataclasses import replace
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
        self.calls = 0

    async def generate(self, _: AnnotationAnalysisRequest) -> ModelAdapterResponse:
        self.calls += 1
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
async def test_intensive_analysis_keeps_only_relevant_sentence_anchored_items() -> None:
    payload = valid_payload()
    payload.update(
        {
            "schema_version": "1.2.0",
            "grammar_structure": [],
            "sentence_components": [
                {
                    "role": "subject",
                    "start": 4,
                    "end": 10,
                    "text_quote": "effort",
                    "explanation": "The head noun of the selected phrase.",
                },
                {
                    "role": "object",
                    "start": 0,
                    "end": 3,
                    "text_quote": "not",
                    "explanation": "This quote does not match the selected sentence.",
                },
            ],
            "grammar_points": [
                {
                    "text_quote": "needed to understand sentence structure",
                    "explanation": "A reduced relative clause modifying effort.",
                }
            ],
            "collocations": [
                {
                    "text_quote": "invented collocation",
                    "explanation": "This is not anchored in the sentence.",
                }
            ],
            "familiar_word_senses": [],
            "translation_review": {
                "summary": (
                    "The learner found the head noun and now needs to retain the modifier scope."
                ),
                "strengths": ["The semantic center is present in the translation."],
                "issues": [],
            },
        }
    )
    intensive_request = replace(
        request(),
        analysis_mode="intensive_reading",
        learner_translation="理解句子结构所需要付出的努力",
        learner_component_marks=(("subject", 4, 10, "effort"),),
    )

    result = await AnnotationAnalysisGateway(
        StubRemoteAnalysisAdapter(payload), timeout_seconds=1, allow_remote=True
    ).generate(intensive_request, budget())

    assert result.outcome is GatewayOutcome.VALIDATED_MODEL
    assert result.grammar_structure == ()
    assert result.sentence_components == (
        (
            "subject",
            4,
            10,
            "effort",
            "The head noun of the selected phrase.",
        ),
    )
    assert result.grammar_points == (
        (
            "needed to understand sentence structure",
            "A reduced relative clause modifying effort.",
        ),
    )
    assert result.collocations == ()
    assert result.familiar_word_senses == ()


@pytest.mark.asyncio
async def test_intensive_agent_validates_translation_review_cards_and_follow_up_evidence() -> None:
    payload = valid_payload()
    payload.update(
        {
            "schema_version": "1.3.0",
            "grammar_structure": [],
            "translation_review": {
                "summary": (
                    "The translation gets the head noun right but should retain the modifier scope."
                ),
                "strengths": ["The learner identified effort as the semantic center."],
                "issues": [
                    {
                        "kind": "scope",
                        "source_quote": "needed to understand sentence structure",
                        "learner_excerpt": "理解句子结构",
                        "explanation": (
                            "The reduced clause modifies effort rather than the whole sentence."
                        ),
                        "suggestion": "Keep the needed-to modifier attached to effort.",
                    },
                    {
                        "kind": "logic",
                        "source_quote": "not in sentence",
                        "learner_excerpt": None,
                        "explanation": (
                            "This item must be filtered because its quote is not anchored."
                        ),
                        "suggestion": "Do not show it.",
                    },
                ],
            },
            "knowledge_cards": [
                {
                    "category": "grammar",
                    "title": "Reduced relative clause",
                    "source_quote": "needed to understand sentence structure",
                    "rule": "A past participle phrase can postmodify a noun.",
                    "explanation": "Here needed... narrows the kind of effort.",
                    "check_question": "Which noun does needed modify here?",
                },
                {
                    "category": "collocation",
                    "title": "Invalid card",
                    "source_quote": "invented collocation",
                    "rule": "This card is not grounded.",
                    "explanation": "It must not reach the learner.",
                    "check_question": "Can this quote be found in the sentence?",
                },
            ],
            "follow_up_answer": {
                "answer": (
                    "The boundary ends after structure because the whole phrase modifies effort."
                ),
                "evidence_quotes": [
                    "needed to understand sentence structure",
                    "invented evidence",
                ],
                "next_questions": ["What is the shortest noun phrase here?"],
            },
        }
    )
    intensive_request = replace(
        request(),
        analysis_mode="intensive_reading",
        learner_translation="理解句子结构所需要付出的努力",
        learner_component_marks=(("subject", 4, 10, "effort"),),
        follow_up_target_kind="component_comparison",
        follow_up_target_label="边界不同",
        follow_up_target_content="effort / needed to understand sentence structure",
        follow_up_question="为什么候选边界到这里结束?",
    )

    result = await AnnotationAnalysisGateway(
        StubRemoteAnalysisAdapter(payload), timeout_seconds=1, allow_remote=True
    ).generate(intensive_request, budget())

    assert result.outcome is GatewayOutcome.VALIDATED_MODEL
    assert result.translation_review is not None
    assert len(result.translation_review.issues) == 1
    assert [card.title for card in result.knowledge_cards] == ["Reduced relative clause"]
    assert result.follow_up_answer is not None
    assert result.follow_up_answer.evidence_quotes == ["needed to understand sentence structure"]


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
async def test_dictionary_hit_skips_remote_adapter_and_model_budget() -> None:
    adapter = StubRemoteAnalysisAdapter(valid_payload())
    result = await AnnotationAnalysisGateway(
        adapter,
        timeout_seconds=1,
        allow_remote=True,
    ).generate(
        replace(
            vocabulary_request(),
            dictionary_vocabulary_note="发音: capacity; 核心义: 容量; 搭配: add capacity。",
            dictionary_provider_ref="netem-5530-v1:1040",
        ),
        ModelBudget(
            call_count=3,
            cost_usd=Decimal("0.20"),
            max_calls=3,
            max_cost_usd=Decimal("0.20"),
        ),
    )

    assert result.outcome is GatewayOutcome.VALIDATED_LOCAL_RESOURCE
    assert result.reason_code == "annotation_analysis_dictionary_hit"
    assert result.adapter == "netem_5530_dictionary"
    assert result.used_remote_call is False
    assert result.actual_cost_usd == 0
    assert adapter.calls == 0


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
