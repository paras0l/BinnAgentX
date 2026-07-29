from datetime import UTC, datetime, timedelta

import pytest
from binnagent_domain.learning.grammar_evidence import (
    GrammarEvidence,
    GrammarEvidenceKind,
    GrammarStateStatus,
    project_grammar_state,
)
from binnagent_domain.learning.grammar_ontology import (
    GrammarFacet,
    GrammarModality,
    load_grammar_catalog,
    resolve_construction_from_text,
    resolve_construction_id,
)


def _evidence(
    kind: GrammarEvidenceKind,
    *,
    modality: GrammarModality = GrammarModality.RECEPTIVE,
    facet: GrammarFacet = GrammarFacet.MEANING,
    day: int = 0,
    context: str = "context_1",
) -> GrammarEvidence:
    return GrammarEvidence(
        evidence_id=f"evidence_{kind.value}_{day}_{context}",
        learner_id="learner_1",
        construction_id="clause.adverbial.concession.although.v1",
        construction_version=1,
        facet=facet,
        modality=modality,
        evidence_kind=kind,
        observed_at=datetime(2026, 7, 1, tzinfo=UTC) + timedelta(days=day),
        context_key=context,
    )


def test_catalog_has_valid_relations_and_reviewed_legacy_aliases() -> None:
    catalog = load_grammar_catalog()

    assert len(catalog.constructions) >= 15
    assert resolve_construction_id("concession_clause") == (
        "clause.adverbial.concession.although.v1"
    )
    assert resolve_construction_id("让步连接词与主从句逻辑") == (
        "clause.adverbial.concession.although.v1"
    )
    assert (
        resolve_construction_from_text(
            "grammar:concession:although",
            "Although introduces a concession and the main clause carries the claim.",
        )
        == "clause.adverbial.concession.although.v1"
    )
    with pytest.raises(ValueError, match="grammar_construction_unknown"):
        resolve_construction_id("model_created_free_label")


def test_answer_reveal_and_supported_work_do_not_become_independent() -> None:
    now = datetime(2026, 7, 5, tzinfo=UTC)
    exposed = project_grammar_state(
        (_evidence(GrammarEvidenceKind.EXPOSURE),),
        now=now,
    )
    supported = project_grammar_state(
        (
            _evidence(GrammarEvidenceKind.EXPOSURE),
            _evidence(GrammarEvidenceKind.SUPPORTED_RECOGNITION, day=1),
        ),
        now=now,
    )

    assert exposed.status is GrammarStateStatus.EXPOSED
    assert exposed.independent_context_count == 0
    assert supported.status is GrammarStateStatus.SUPPORTED
    assert supported.independent_context_count == 0


def test_independent_and_delayed_contexts_promote_only_the_same_facet() -> None:
    evidence = (
        _evidence(GrammarEvidenceKind.INDEPENDENT_RECOGNITION),
        _evidence(
            GrammarEvidenceKind.DELAYED_TRANSFER,
            day=8,
            context="context_2",
        ),
    )
    projection = project_grammar_state(
        evidence,
        now=datetime(2026, 7, 9, tzinfo=UTC),
    )

    assert projection.status is GrammarStateStatus.DELAYED_STABLE
    assert projection.facet is GrammarFacet.MEANING
    assert projection.modality is GrammarModality.RECEPTIVE
    assert projection.independent_context_count == 2


def test_unverified_expression_attempt_does_not_claim_productive_mastery() -> None:
    projection = project_grammar_state(
        (
            _evidence(
                GrammarEvidenceKind.PRODUCTION_ATTEMPT_UNVERIFIED,
                modality=GrammarModality.PRODUCTIVE,
                facet=GrammarFacet.USE,
            ),
        ),
        now=datetime(2026, 7, 2, tzinfo=UTC),
    )

    assert projection.status is GrammarStateStatus.PRODUCTION_UNVERIFIED
    assert projection.independent_context_count == 0
