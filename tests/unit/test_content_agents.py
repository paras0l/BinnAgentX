import json
from decimal import Decimal

import httpx2
from binnagent_agent.agents.content_generator import (
    ContentGenerationRequest,
    RemoteContentGenerationAdapter,
)
from binnagent_agent.agents.content_reviewer import (
    ContentReviewRequest,
    RemoteContentReviewerAdapter,
)


def test_longcat_complex_generation_enables_thinking_and_reads_only_final_content() -> None:
    adapter = RemoteContentGenerationAdapter(
        provider="longcat",
        base_url="https://api.longcat.test/openai",
        model="LongCat-2.0",
        api_key="test-key",
        estimated_cost_usd=Decimal("0.02"),
        max_tokens=5000,
        timeout_seconds=90,
    )
    request = ContentGenerationRequest(
        content_type="matched_reading",
        source_item={"title": "source", "paragraphs": [], "difficulty": {}},
        target_content_version_id="matched_reading_test_v1",
    )

    payload = adapter._payload(request, {})

    assert payload["thinking"] == {"type": "enabled"}
    assert (
        adapter._content(
            {
                "choices": [
                    {
                        "message": {
                            "reasoning_content": "internal reasoning that is not JSON",
                            "content": '{"final":"structured"}',
                        }
                    }
                ]
            }
        )
        == '{"final":"structured"}'
    )


def test_longcat_review_agent_uses_reasoning_but_parses_final_judgment() -> None:
    captured: dict[str, object] = {}
    final_report = {
        "verdict": "approve",
        "scores": {
            "factual_coherence": 5,
            "answerability": 5,
            "evidence_grounding": 5,
            "difficulty_alignment": 4,
            "question_diversity": 5,
            "hint_progression": 4,
            "language_quality": 5,
        },
        "issues": [],
        "summary": "The candidate is coherent and meets the development quality gate.",
        "limitations": ["Human sampling remains required"],
    }

    def handle(request: httpx2.Request) -> httpx2.Response:
        captured.update(json.loads(request.content))
        return httpx2.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "reasoning_content": "a long private review analysis",
                            "content": json.dumps(final_report),
                        }
                    }
                ]
            },
        )

    adapter = RemoteContentReviewerAdapter(
        provider="longcat",
        base_url="https://api.longcat.test/openai",
        model="LongCat-2.0",
        api_key="test-key",
        estimated_cost_usd=Decimal("0.02"),
        max_tokens=4000,
        timeout_seconds=120,
        transport=httpx2.MockTransport(handle),
    )

    result = adapter.review(
        ContentReviewRequest(
            content_type="micro_expression",
            source_item={"title": "source"},
            candidate_item={"title": "candidate"},
        )
    )

    assert captured["thinking"] == {"type": "enabled"}
    assert result.verdict == "approve"


def test_review_agent_normalizes_overlong_explanation_without_discarding_verdict() -> None:
    final_report = {
        "verdict": "approve",
        "scores": {
            "factual_coherence": 5,
            "answerability": 5,
            "evidence_grounding": 5,
            "difficulty_alignment": 4,
            "question_diversity": 5,
            "hint_progression": 4,
            "language_quality": 5,
        },
        "issues": [],
        "summary": "x" * 1200,
        "limitations": ["Human sampling remains required"],
    }

    adapter = RemoteContentReviewerAdapter(
        provider="longcat",
        base_url="https://api.longcat.test/openai",
        model="LongCat-2.0",
        api_key="test-key",
        estimated_cost_usd=Decimal("0.02"),
        max_tokens=4000,
        timeout_seconds=120,
        transport=httpx2.MockTransport(
            lambda _request: httpx2.Response(
                200,
                json={"choices": [{"message": {"content": json.dumps(final_report)}}]},
            )
        ),
    )

    result = adapter.review(
        ContentReviewRequest(
            content_type="micro_expression",
            source_item={"title": "source"},
            candidate_item={"title": "candidate"},
        )
    )

    assert result.verdict == "approve"
    assert len(result.summary) == 800
