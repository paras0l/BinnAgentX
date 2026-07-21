"""Conservative selection of recent and due knowledge for the next learning run."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime

from binnagent_domain.learning.evidence import EvidenceStatus


@dataclass(frozen=True, slots=True)
class ReviewCandidate:
    asset_id: str
    context_id: str
    title: str
    excerpt: str
    kind: str
    tags: tuple[str, ...]
    status: EvidenceStatus
    created_at: datetime
    updated_at: datetime
    next_review_at: datetime | None
    recently_used: bool = False


def select_review_candidates(
    candidates: tuple[ReviewCandidate, ...],
    *,
    now: datetime,
    goal: str = "",
    limit: int = 6,
) -> tuple[ReviewCandidate, ...]:
    if limit < 1:
        raise ValueError("limit_must_be_positive")
    tokens = {
        token.lower() for token in re.findall(r"[A-Za-z][A-Za-z'-]{2,}|[\u4e00-\u9fff]{2,}", goal)
    }

    def score(candidate: ReviewCandidate) -> tuple[int, float, float, str]:
        due = candidate.next_review_at is not None and candidate.next_review_at <= now
        recent = (now - candidate.created_at).days <= 7
        urgent = candidate.status in {
            EvidenceStatus.EVIDENCE_CONFLICT,
            EvidenceStatus.PENDING_VALIDATION,
        }
        haystack = " ".join((candidate.title, candidate.excerpt, *candidate.tags)).lower()
        relevance = sum(token in haystack for token in tokens)
        priority = relevance * 20 + int(urgent) * 16 + int(due) * 12 + int(recent) * 7
        if candidate.recently_used:
            priority -= 10
        due_timestamp = (
            -candidate.next_review_at.timestamp() if candidate.next_review_at is not None else 0
        )
        return (priority, due_timestamp, candidate.updated_at.timestamp(), candidate.asset_id)

    return tuple(sorted(candidates, key=score, reverse=True)[:limit])
