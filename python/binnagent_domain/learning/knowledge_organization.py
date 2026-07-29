"""Auditable contracts for extracting and proposing knowledge changes."""

from __future__ import annotations

import hashlib
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import Field, model_validator

from binnagent_domain.learning.content_quality import SourceSpan, StrictModel
from binnagent_domain.learning.grammar_ontology import resolve_construction_from_text


class KnowledgeKind(StrEnum):
    WORD_SENSE = "word_sense"
    COLLOCATION = "collocation"
    GRAMMAR = "grammar"
    READING_SKILL = "reading_skill"
    EXPRESSION_SKILL = "expression_skill"
    ERROR_HYPOTHESIS = "error_hypothesis"
    EXAMPLE = "example"


class CandidateValidationStatus(StrEnum):
    CANDIDATE = "candidate"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"


class KnowledgeChangeAction(StrEnum):
    CREATE = "CREATE"
    MERGE = "MERGE"
    LINK = "LINK"
    SUPERSEDE = "SUPERSEDE"
    MARK_CONFLICT = "MARK_CONFLICT"
    DISCARD = "DISCARD"
    DEFER = "DEFER"


class KnowledgeRelationType(StrEnum):
    SENSE_OF = "SENSE_OF"
    COLLOCATES_WITH = "COLLOCATES_WITH"
    REALIZES_GRAMMAR = "REALIZES_GRAMMAR"
    SUPPORTS_READING_SKILL = "SUPPORTS_READING_SKILL"
    SUPPORTS_EXPRESSION_SKILL = "SUPPORTS_EXPRESSION_SKILL"
    CONTRADICTS = "CONTRADICTS"
    EXAMPLE_OF = "EXAMPLE_OF"
    DERIVED_FROM = "DERIVED_FROM"
    REQUIRES = "REQUIRES"
    VALIDATED_BY = "VALIDATED_BY"


class KnowledgeSourceRecord(StrictModel):
    source_record_id: str = Field(min_length=1, max_length=128)
    learner_id: str = Field(min_length=1, max_length=128)
    provider: str = Field(min_length=1, max_length=80)
    connection_id: str = Field(min_length=1, max_length=128)
    source_key: str = Field(min_length=1, max_length=500)
    content_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    source_modified_at: datetime
    authorized_scope: tuple[str, ...] = Field(min_length=1)
    captured_content_ref: str = Field(min_length=1, max_length=500)
    supersedes_source_record_id: str | None = Field(default=None, max_length=128)
    captured_at: datetime


class KnowledgeExample(StrictModel):
    text: str = Field(min_length=1, max_length=2000)
    source_span: SourceSpan


class AtomicKnowledgeCandidate(StrictModel):
    candidate_id: str = Field(min_length=1, max_length=128)
    source_record_id: str = Field(min_length=1, max_length=128)
    knowledge_kind: KnowledgeKind
    canonical_key: str = Field(min_length=1, max_length=300)
    title: str = Field(min_length=1, max_length=240)
    claim: str = Field(min_length=1, max_length=2000)
    source_spans: tuple[SourceSpan, ...] = Field(min_length=1)
    examples: tuple[KnowledgeExample, ...] = ()
    conditions: tuple[str, ...] = ()
    confidence: Annotated[float, Field(ge=0, le=1)]
    validation_status: CandidateValidationStatus
    extractor_version: str = Field(min_length=1, max_length=80)

    @model_validator(mode="before")
    @classmethod
    def bind_grammar_candidate_to_catalog(cls, value: Any) -> Any:
        if not isinstance(value, dict) or value.get("knowledge_kind") != KnowledgeKind.GRAMMAR:
            return value
        migrated = dict(value)
        construction_id = resolve_construction_from_text(
            str(migrated.get("canonical_key", "")),
            str(migrated.get("title", "")),
            str(migrated.get("claim", "")),
        )
        if construction_id is not None:
            migrated["canonical_key"] = construction_id
        elif migrated.get("validation_status") != CandidateValidationStatus.REJECTED:
            migrated["validation_status"] = CandidateValidationStatus.NEEDS_REVIEW
        return migrated


class ExistingAssetMatch(StrictModel):
    asset_id: str = Field(min_length=1, max_length=128)
    asset_version: Annotated[int, Field(ge=1)]
    canonical_key_match: bool
    lexical_score: Annotated[float, Field(ge=0, le=1)]
    vector_score: Annotated[float, Field(ge=0, le=1)] | None = None
    evidence: str = Field(min_length=1, max_length=1000)


class FieldChange(StrictModel):
    field_name: str = Field(min_length=1, max_length=128)
    before: object | None = None
    after: object | None = None


class KnowledgeChangeProposal(StrictModel):
    proposal_id: str = Field(min_length=1, max_length=128)
    candidate_id: str = Field(min_length=1, max_length=128)
    action: KnowledgeChangeAction
    existing_asset_matches: tuple[ExistingAssetMatch, ...] = ()
    field_changes: tuple[FieldChange, ...] = ()
    source_spans: tuple[SourceSpan, ...] = Field(min_length=1)
    conflicts: tuple[str, ...] = ()
    confidence: Annotated[float, Field(ge=0, le=1)]
    requires_human_review: bool
    destination: Literal["reading", "expression", "review_validation", "none"]
    idempotency_key: str = Field(min_length=1, max_length=180)
    expected_asset_version: Annotated[int, Field(ge=1)] | None = None

    @model_validator(mode="after")
    def destructive_actions_require_review_and_version(self) -> KnowledgeChangeProposal:
        if self.action in {
            KnowledgeChangeAction.MERGE,
            KnowledgeChangeAction.SUPERSEDE,
            KnowledgeChangeAction.MARK_CONFLICT,
        }:
            if not self.requires_human_review:
                raise ValueError("knowledge_destructive_action_requires_review")
            if self.expected_asset_version is None:
                raise ValueError("knowledge_destructive_action_requires_expected_version")
        return self


class KnowledgeRelation(StrictModel):
    relation_id: str = Field(min_length=1, max_length=128)
    relation_type: KnowledgeRelationType
    from_entity_id: str = Field(min_length=1, max_length=128)
    from_version: Annotated[int, Field(ge=1)]
    to_entity_id: str = Field(min_length=1, max_length=128)
    to_version: Annotated[int, Field(ge=1)]
    source_spans: tuple[SourceSpan, ...] = Field(min_length=1)
    created_at: datetime
    supersedes_relation_id: str | None = Field(default=None, max_length=128)


def candidate_idempotency_key(
    source_record: KnowledgeSourceRecord,
    *,
    canonical_key: str,
    extractor_version: str,
) -> str:
    """Stable key prevents duplicate candidates for one immutable source version."""

    raw = "\x1f".join(
        (
            source_record.source_record_id,
            source_record.content_hash,
            canonical_key.casefold().strip(),
            extractor_version,
        )
    )
    return hashlib.sha256(raw.encode()).hexdigest()
