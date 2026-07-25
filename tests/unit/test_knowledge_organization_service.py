from datetime import UTC, datetime
from hashlib import sha256

import pytest
from binnagent_api.knowledge_organization_service import (
    _deterministic_atomic_extraction,
    _select_change_action,
    _validated_candidates,
)
from binnagent_domain.learning.knowledge_organization import (
    KnowledgeChangeAction,
    KnowledgeSourceRecord,
)


@pytest.mark.parametrize(
    ("inputs", "expected"),
    [
        (
            {
                "confidence": 0.9,
                "duplicate_in_run": True,
                "existing_claim": None,
                "canonical_match": False,
                "supersedes_source": False,
                "incoming_claim": "A supported claim.",
            },
            KnowledgeChangeAction.DISCARD,
        ),
        (
            {
                "confidence": 0.4,
                "duplicate_in_run": False,
                "existing_claim": None,
                "canonical_match": False,
                "supersedes_source": False,
                "incoming_claim": "A supported claim.",
            },
            KnowledgeChangeAction.DEFER,
        ),
        (
            {
                "confidence": 0.9,
                "duplicate_in_run": False,
                "existing_claim": None,
                "canonical_match": False,
                "supersedes_source": False,
                "incoming_claim": "A supported claim.",
            },
            KnowledgeChangeAction.CREATE,
        ),
        (
            {
                "confidence": 0.9,
                "duplicate_in_run": False,
                "existing_claim": "Although marks concession.",
                "canonical_match": True,
                "supersedes_source": False,
                "incoming_claim": "Although marks concession.",
            },
            KnowledgeChangeAction.LINK,
        ),
        (
            {
                "confidence": 0.9,
                "duplicate_in_run": False,
                "existing_claim": "Although marks concession.",
                "canonical_match": True,
                "supersedes_source": False,
                "incoming_claim": "Although adds a contrasting concession.",
            },
            KnowledgeChangeAction.MERGE,
        ),
        (
            {
                "confidence": 0.9,
                "duplicate_in_run": False,
                "existing_claim": "Although marks concession.",
                "canonical_match": True,
                "supersedes_source": True,
                "incoming_claim": "A corrected concession rule.",
            },
            KnowledgeChangeAction.SUPERSEDE,
        ),
        (
            {
                "confidence": 0.9,
                "duplicate_in_run": False,
                "existing_claim": "Although marks concession.",
                "canonical_match": True,
                "supersedes_source": False,
                "incoming_claim": "Although does not mark concession.",
            },
            KnowledgeChangeAction.MARK_CONFLICT,
        ),
    ],
)
def test_all_knowledge_change_actions_are_explicit(
    inputs: dict[str, object],
    expected: KnowledgeChangeAction,
) -> None:
    assert _select_change_action(**inputs) is expected  # type: ignore[arg-type]


def test_deterministic_extractor_splits_mixed_note_and_preserves_exact_evidence() -> None:
    content = (
        "Although introduces a concession. The writer's main claim appears in the main clause."
    )
    digest = sha256(content.encode()).hexdigest()
    source = KnowledgeSourceRecord(
        source_record_id="source_1",
        learner_id="learner_1",
        provider="obsidian",
        connection_id="connection_1",
        source_key="BinnAgentX/00-Inbox/mixed.md",
        content_hash=digest,
        source_modified_at=datetime.now(UTC),
        authorized_scope=("BinnAgentX/00-Inbox/",),
        captured_content_ref="captured://source_1",
        captured_at=datetime.now(UTC),
    )

    candidates = _validated_candidates(
        source,
        content,
        _deterministic_atomic_extraction(content),
    )

    assert [item.knowledge_kind.value for item in candidates] == [
        "grammar",
        "reading_skill",
    ]
    assert len({item.candidate_id for item in candidates}) == 2
    for candidate in candidates:
        for span in candidate.source_spans:
            assert content[span.start : span.end] == span.text_quote
            assert span.source_version == digest
