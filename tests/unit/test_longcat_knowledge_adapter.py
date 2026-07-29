import json

import httpx2
import pytest
from binnagent_agent.agents.knowledge_extractor import LongCatKnowledgeAdapter


@pytest.mark.asyncio
async def test_longcat_native_knowledge_agents_share_existing_contracts() -> None:
    responses = [
        {
            "items": [
                {
                    "kind": "grammar",
                    "source_title": "Although note",
                    "title": "Although concession",
                    "summary": "Although introduces a concession before the main claim.",
                    "review_cue": "Find the main claim after the concessive clause.",
                }
            ]
        },
        {
            "items": [
                {
                    "knowledge_kind": "grammar",
                    "canonical_key": "grammar:concession:although",
                    "title": "Although concession",
                    "claim": "Although introduces a concession before the main claim.",
                    "evidence_quotes": [
                        "Although introduces a concession before the main claim."
                    ],
                    "conditions": [],
                    "confidence": 0.96,
                }
            ]
        },
        {
            "decision": "KEEP",
            "retained_segment_ids": ["learner-rule"],
            "reason_codes": ["explicit_learner_rule"],
            "confidence": 0.95,
        },
    ]
    requests: list[dict[str, object]] = []

    async def handler(request: httpx2.Request) -> httpx2.Response:
        requests.append(json.loads(request.content))
        content = json.dumps(responses[len(requests) - 1])
        return httpx2.Response(200, json={"choices": [{"message": {"content": content}}]})

    adapter = LongCatKnowledgeAdapter(
        base_url="https://models.example/openai",
        model="LongCat-2.0",
        api_key="test-key",
        max_tokens=4000,
        timeout_seconds=2,
        transport=httpx2.MockTransport(handler),
    )

    extraction = await adapter.extract(
        "<note source_title='Although note'>Although introduces a concession.</note>"
    )
    atomic = await adapter.extract_atomic(
        "<authorized_note>Although introduces a concession before the main claim.</authorized_note>"
    )
    gate = await adapter.decide_write(
        '<asset_capture>{"segments":[{"segment_id":"learner-rule"}]}</asset_capture>'
    )

    assert extraction.items[0].source_title == "Although note"
    assert atomic.items[0].evidence_quotes
    assert gate.retained_segment_ids == ["learner-rule"]
    assert all(request["thinking"] == {"type": "disabled"} for request in requests)
