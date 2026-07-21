"""Deterministic evidence projection for one learner-owned knowledge asset."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum


class LearningEvidenceType(StrEnum):
    SUPPORTED_COMPREHENSION = "supported_comprehension"
    INDEPENDENT_COMPREHENSION = "independent_comprehension"
    SUPPORTED_OUTPUT = "supported_output"
    INDEPENDENT_OUTPUT = "independent_output"
    REVISION_SUCCESS = "revision_success"
    DELAYED_TRANSFER = "delayed_transfer"
    CONFLICT = "conflict"


class EvidenceStatus(StrEnum):
    PENDING_VALIDATION = "pending_validation"
    DEVELOPING = "developing"
    HINTED_USABLE = "hinted_usable"
    INDEPENDENTLY_USABLE = "independently_usable"
    AWAITING_DELAYED_VALIDATION = "awaiting_delayed_validation"
    DELAYED_STABLE = "delayed_stable"
    EVIDENCE_CONFLICT = "evidence_conflict"


@dataclass(frozen=True, slots=True)
class LearningEvidence:
    evidence_id: str
    evidence_type: LearningEvidenceType
    observed_at: datetime
    workflow_run_id: str | None = None
    task_id: str | None = None
    source_version: int | None = None


@dataclass(frozen=True, slots=True)
class LearningStateProjection:
    status: EvidenceStatus
    evidence_count: int
    last_verified_at: datetime | None
    next_review_at: datetime


_REVIEW_DELAY = {
    EvidenceStatus.PENDING_VALIDATION: timedelta(0),
    EvidenceStatus.DEVELOPING: timedelta(days=1),
    EvidenceStatus.HINTED_USABLE: timedelta(days=2),
    EvidenceStatus.INDEPENDENTLY_USABLE: timedelta(days=5),
    EvidenceStatus.AWAITING_DELAYED_VALIDATION: timedelta(days=7),
    EvidenceStatus.DELAYED_STABLE: timedelta(days=30),
    EvidenceStatus.EVIDENCE_CONFLICT: timedelta(0),
}


def project_learning_state(
    evidence: tuple[LearningEvidence, ...],
    *,
    now: datetime,
) -> LearningStateProjection:
    """Project display state and the next validation time from immutable evidence."""

    if now.tzinfo is None:
        raise ValueError("now_must_be_timezone_aware")
    ordered = tuple(sorted(evidence, key=lambda item: item.observed_at))
    status = _status(ordered)
    last_verified = ordered[-1].observed_at if ordered else None
    anchor = last_verified or now.astimezone(UTC)
    return LearningStateProjection(
        status=status,
        evidence_count=len(ordered),
        last_verified_at=last_verified,
        next_review_at=anchor + _REVIEW_DELAY[status],
    )


def _status(evidence: tuple[LearningEvidence, ...]) -> EvidenceStatus:
    if not evidence:
        return EvidenceStatus.PENDING_VALIDATION
    latest = evidence[-1].evidence_type
    if latest is LearningEvidenceType.CONFLICT:
        return EvidenceStatus.EVIDENCE_CONFLICT
    if latest is LearningEvidenceType.DELAYED_TRANSFER:
        return EvidenceStatus.DELAYED_STABLE
    if latest in {
        LearningEvidenceType.INDEPENDENT_OUTPUT,
        LearningEvidenceType.REVISION_SUCCESS,
    }:
        return EvidenceStatus.AWAITING_DELAYED_VALIDATION
    if latest is LearningEvidenceType.INDEPENDENT_COMPREHENSION:
        return EvidenceStatus.INDEPENDENTLY_USABLE
    if latest in {
        LearningEvidenceType.SUPPORTED_COMPREHENSION,
        LearningEvidenceType.SUPPORTED_OUTPUT,
    }:
        return EvidenceStatus.HINTED_USABLE
    return EvidenceStatus.DEVELOPING
