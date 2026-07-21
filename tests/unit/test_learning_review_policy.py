from datetime import UTC, datetime, timedelta

from binnagent_domain.learning import (
    EvidenceStatus,
    LearningEvidence,
    LearningEvidenceType,
    ReviewCandidate,
    project_learning_state,
    select_review_candidates,
)

NOW = datetime(2026, 7, 21, 12, tzinfo=UTC)


def test_projection_schedules_independent_output_for_delayed_validation() -> None:
    projected = project_learning_state(
        (
            LearningEvidence(
                evidence_id="evidence_1",
                evidence_type=LearningEvidenceType.INDEPENDENT_OUTPUT,
                observed_at=NOW,
            ),
        ),
        now=NOW,
    )

    assert projected.status is EvidenceStatus.AWAITING_DELAYED_VALIDATION
    assert projected.next_review_at == NOW + timedelta(days=7)


def test_conflicting_latest_evidence_is_due_immediately() -> None:
    projected = project_learning_state(
        (
            LearningEvidence(
                evidence_id="evidence_1",
                evidence_type=LearningEvidenceType.DELAYED_TRANSFER,
                observed_at=NOW - timedelta(days=1),
            ),
            LearningEvidence(
                evidence_id="evidence_2",
                evidence_type=LearningEvidenceType.CONFLICT,
                observed_at=NOW,
            ),
        ),
        now=NOW,
    )

    assert projected.status is EvidenceStatus.EVIDENCE_CONFLICT
    assert projected.next_review_at == NOW


def test_selector_combines_due_recent_and_goal_relevance() -> None:
    candidates = (
        _candidate("due", next_review_at=NOW - timedelta(hours=1)),
        _candidate("recent", created_at=NOW - timedelta(days=1)),
        _candidate("grammar", excerpt="although concession structure"),
        _candidate("used", next_review_at=NOW - timedelta(days=2), recently_used=True),
    )

    selected = select_review_candidates(candidates, now=NOW, goal="although grammar", limit=3)

    assert selected[0].asset_id == "grammar"
    assert {item.asset_id for item in selected} >= {"due", "grammar"}
    assert selected[-1].asset_id != "used"


def _candidate(
    asset_id: str,
    *,
    excerpt: str = "generic note",
    created_at: datetime = NOW - timedelta(days=30),
    next_review_at: datetime | None = None,
    recently_used: bool = False,
) -> ReviewCandidate:
    return ReviewCandidate(
        asset_id=asset_id,
        context_id=f"context_{asset_id}",
        title=asset_id,
        excerpt=excerpt,
        kind="grammar",
        tags=(),
        status=EvidenceStatus.DEVELOPING,
        created_at=created_at,
        updated_at=created_at,
        next_review_at=next_review_at,
        recently_used=recently_used,
    )
