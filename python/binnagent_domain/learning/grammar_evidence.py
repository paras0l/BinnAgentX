"""Deterministic learner-state projection for one grammar construction facet."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum

from binnagent_domain.learning.grammar_ontology import GrammarFacet, GrammarModality


class GrammarEvidenceKind(StrEnum):
    EXPOSURE = "exposure"
    ATTEMPT_FAILED = "attempt_failed"
    SUPPORTED_RECOGNITION = "supported_recognition"
    INDEPENDENT_RECOGNITION = "independent_recognition"
    PRODUCTION_ATTEMPT_UNVERIFIED = "production_attempt_unverified"
    SUPPORTED_PRODUCTION = "supported_production"
    INDEPENDENT_PRODUCTION = "independent_production"
    DELAYED_TRANSFER = "delayed_transfer"
    CONFLICT = "conflict"


class GrammarStateStatus(StrEnum):
    PENDING = "pending"
    EXPOSED = "exposed"
    DEVELOPING = "developing"
    SUPPORTED = "supported"
    PRODUCTION_UNVERIFIED = "production_unverified"
    AWAITING_DELAYED_VALIDATION = "awaiting_delayed_validation"
    DELAYED_STABLE = "delayed_stable"
    EVIDENCE_CONFLICT = "evidence_conflict"


@dataclass(frozen=True, slots=True)
class GrammarEvidence:
    evidence_id: str
    learner_id: str
    construction_id: str
    construction_version: int
    facet: GrammarFacet
    modality: GrammarModality
    evidence_kind: GrammarEvidenceKind
    observed_at: datetime
    context_key: str
    workflow_run_id: str | None = None
    task_id: str | None = None


@dataclass(frozen=True, slots=True)
class GrammarStateProjection:
    learner_id: str
    construction_id: str
    construction_version: int
    facet: GrammarFacet
    modality: GrammarModality
    status: GrammarStateStatus
    evidence_count: int
    independent_context_count: int
    last_verified_at: datetime | None
    next_review_at: datetime


_REVIEW_DELAY = {
    GrammarStateStatus.PENDING: timedelta(0),
    GrammarStateStatus.EXPOSED: timedelta(days=1),
    GrammarStateStatus.DEVELOPING: timedelta(days=1),
    GrammarStateStatus.SUPPORTED: timedelta(days=2),
    GrammarStateStatus.PRODUCTION_UNVERIFIED: timedelta(days=1),
    GrammarStateStatus.AWAITING_DELAYED_VALIDATION: timedelta(days=7),
    GrammarStateStatus.DELAYED_STABLE: timedelta(days=30),
    GrammarStateStatus.EVIDENCE_CONFLICT: timedelta(0),
}


def project_grammar_state(
    evidence: tuple[GrammarEvidence, ...],
    *,
    now: datetime,
) -> GrammarStateProjection:
    """Project one construction/facet/modality state from immutable events."""

    if now.tzinfo is None:
        raise ValueError("now_must_be_timezone_aware")
    if not evidence:
        raise ValueError("grammar_projection_requires_identity_evidence")
    identity = {
        (
            item.learner_id,
            item.construction_id,
            item.construction_version,
            item.facet,
            item.modality,
        )
        for item in evidence
    }
    if len(identity) != 1:
        raise ValueError("grammar_projection_identity_mismatch")
    ordered = tuple(sorted(evidence, key=lambda item: (item.observed_at, item.evidence_id)))
    learner_id, construction_id, version, facet, modality = next(iter(identity))
    status = _status(ordered)
    last_verified = next(
        (
            item.observed_at
            for item in reversed(ordered)
            if item.evidence_kind
            in {
                GrammarEvidenceKind.INDEPENDENT_RECOGNITION,
                GrammarEvidenceKind.INDEPENDENT_PRODUCTION,
                GrammarEvidenceKind.DELAYED_TRANSFER,
            }
        ),
        None,
    )
    anchor = last_verified or ordered[-1].observed_at or now.astimezone(UTC)
    independent_contexts = {
        item.context_key
        for item in ordered
        if item.evidence_kind
        in {
            GrammarEvidenceKind.INDEPENDENT_RECOGNITION,
            GrammarEvidenceKind.INDEPENDENT_PRODUCTION,
            GrammarEvidenceKind.DELAYED_TRANSFER,
        }
    }
    return GrammarStateProjection(
        learner_id=learner_id,
        construction_id=construction_id,
        construction_version=version,
        facet=facet,
        modality=modality,
        status=status,
        evidence_count=len(ordered),
        independent_context_count=len(independent_contexts),
        last_verified_at=last_verified,
        next_review_at=anchor + _REVIEW_DELAY[status],
    )


def _status(evidence: tuple[GrammarEvidence, ...]) -> GrammarStateStatus:
    latest = evidence[-1].evidence_kind
    if latest is GrammarEvidenceKind.CONFLICT:
        return GrammarStateStatus.EVIDENCE_CONFLICT
    if latest is GrammarEvidenceKind.DELAYED_TRANSFER:
        return GrammarStateStatus.DELAYED_STABLE
    if latest in {
        GrammarEvidenceKind.INDEPENDENT_RECOGNITION,
        GrammarEvidenceKind.INDEPENDENT_PRODUCTION,
    }:
        return GrammarStateStatus.AWAITING_DELAYED_VALIDATION
    if latest is GrammarEvidenceKind.PRODUCTION_ATTEMPT_UNVERIFIED:
        return GrammarStateStatus.PRODUCTION_UNVERIFIED
    if latest in {
        GrammarEvidenceKind.SUPPORTED_RECOGNITION,
        GrammarEvidenceKind.SUPPORTED_PRODUCTION,
    }:
        return GrammarStateStatus.SUPPORTED
    if latest is GrammarEvidenceKind.ATTEMPT_FAILED:
        return GrammarStateStatus.DEVELOPING
    if latest is GrammarEvidenceKind.EXPOSURE:
        return GrammarStateStatus.EXPOSED
    return GrammarStateStatus.PENDING
