import json
from decimal import Decimal

import httpx2
import pytest
from binnagent_agent import AnnotationAnalysisRequest, PriorityFeedbackRequest
from binnagent_api.model_adapters import (
    RemoteAnnotationAnalysisAdapter,
    RemotePriorityFeedbackAdapter,
)


def _request() -> PriorityFeedbackRequest:
    return PriorityFeedbackRequest(
        workflow_run_id="workflow_run_model_0001",
        task_id="task_model_0001",
        input_attempt_version_id="attempt_model_0001",
        content_version_id="micro_expression_01_v1",
        attempt_text="The evidence is useful, but the conclusion is too broad.",
        fallback_reason_code="approved_fallback",
        fallback_feedback="Check whether your conclusion stays within the evidence in the passage.",
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("provider", "expected_path", "response_body"),
    [
        (
            "ollama",
            "/api/chat",
            lambda content: {"message": {"content": content}},
        ),
        (
            "deepseek",
            "/chat/completions",
            lambda content: {"choices": [{"message": {"content": content}}]},
        ),
        (
            "longcat",
            "/v1/chat/completions",
            lambda content: {"choices": [{"message": {"content": content}}]},
        ),
    ],
)
async def test_remote_priority_feedback_adapters_use_compatible_provider_protocols(
    provider: str,
    expected_path: str,
    response_body: object,
) -> None:
    seen: dict[str, object] = {}
    content = json.dumps(
        {
            "schema_version": "1.0.0",
            "focus": "logic",
            "feedback": "Keep the conclusion within the evidence stated in the passage.",
            "evidence_quote": "the conclusion is too broad",
            "replacement_text": None,
        }
    )

    async def handler(request: httpx2.Request) -> httpx2.Response:
        seen["path"] = request.url.path
        seen["authorization"] = request.headers.get("authorization")
        seen["body"] = json.loads(request.content)
        return httpx2.Response(200, json=response_body(content))  # type: ignore[operator]

    adapter = RemotePriorityFeedbackAdapter(
        provider=provider,  # type: ignore[arg-type]
        base_url="https://models.example",
        model="test-model",
        api_key=None if provider == "ollama" else "test-key",
        estimated_cost_usd=Decimal("0.02"),
        max_tokens=400,
        timeout_seconds=2,
        transport=httpx2.MockTransport(handler),
    )
    result = await adapter.generate(_request())

    assert seen["path"] == expected_path
    assert seen["authorization"] == (None if provider == "ollama" else "Bearer test-key")
    assert result.payload == json.loads(content)
    body = seen["body"]
    assert isinstance(body, dict)
    assert body["model"] == "test-model"
    if provider == "ollama":
        assert body["format"]["properties"]["evidence_quote"]
    elif provider == "deepseek":
        assert body["response_format"] == {"type": "json_object"}


@pytest.mark.asyncio
async def test_remote_provider_requires_its_api_key_before_network_access() -> None:
    adapter = RemotePriorityFeedbackAdapter(
        provider="longcat",
        base_url="https://models.example",
        model="test-model",
        api_key=None,
        estimated_cost_usd=Decimal("0.02"),
        max_tokens=400,
        timeout_seconds=2,
    )

    with pytest.raises(RuntimeError, match="longcat_api_key_not_configured"):
        await adapter.generate(_request())


@pytest.mark.asyncio
async def test_annotation_adapter_routes_sentence_selection_to_translation_and_grammar() -> None:
    seen: dict[str, object] = {}
    content = json.dumps(
        {
            "schema_version": "1.1.0",
            "selection_scope": "sentence_or_paragraph",
            "focus": "syntax",
            "translation": "这项改变帮助更多学生使用现有空间。",
            "vocabulary_note": None,
            "grammar_structure": ["主干: The change helped more students。"],
            "diagnosis": "The learner needs the sentence core before attaching the modifier.",
            "breakdown": ["Find the subject and verb."],
            "next_check": "Can you state who did what?",
            "evidence_quote": "The change helped more students",
            "answer_text": None,
        }
    )

    async def handler(request: httpx2.Request) -> httpx2.Response:
        seen["body"] = json.loads(request.content)
        return httpx2.Response(200, json={"choices": [{"message": {"content": content}}]})

    adapter = RemoteAnnotationAnalysisAdapter(
        provider="deepseek",
        base_url="https://models.example",
        model="test-model",
        api_key="test-key",
        estimated_cost_usd=Decimal("0.02"),
        max_tokens=600,
        timeout_seconds=2,
        transport=httpx2.MockTransport(handler),
    )
    result = await adapter.generate(
        AnnotationAnalysisRequest(
            workflow_run_id="workflow_run_model_0001",
            task_id="task_model_0001",
            content_version_id="reading_v1",
            selected_text="The change helped more students use existing space.",
            paragraph_context="The change helped more students use existing space.",
            selection_scope="sentence_or_paragraph",
            learner_question="请翻译并拆解结构。",
            fallback_focus="syntax",
            fallback_diagnosis="先找主干。",
            fallback_breakdown=("找主语和谓语。",),
            fallback_next_check="谁做了什么?",
        )
    )

    assert result.payload == json.loads(content)
    body = seen["body"]
    assert isinstance(body, dict)
    messages = body["messages"]
    assert isinstance(messages, list)
    assert "selection_scope: sentence_or_paragraph" in messages[1]["content"]
    assert "translation 必须" in messages[0]["content"]
