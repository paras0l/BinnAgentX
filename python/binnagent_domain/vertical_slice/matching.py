from dataclasses import dataclass
from datetime import datetime

from binnagent_domain.vertical_slice.models import (
    AttemptIndependence,
    ExamTrack,
    LearnerProfileSnapshot,
    SelfReportedLevel,
)


@dataclass(frozen=True, slots=True)
class MaterialCandidate:
    content_id: str
    content_version_id: str
    exam_tracks: tuple[ExamTrack, ...]
    topic_familiarity: str
    word_count: int
    vocabulary_load: str
    syntax_load: str
    evidence_distance: str
    estimated_minutes: int


@dataclass(frozen=True, slots=True)
class ExpressionMaterialCandidate:
    content_id: str
    content_version_id: str
    source_reading_content_ids: tuple[str, ...]
    exam_tracks: tuple[ExamTrack, ...]
    vocabulary_load: str
    syntax_load: str
    estimated_minutes: int


@dataclass(frozen=True, slots=True)
class CalibrationObservation:
    task_id: str
    content_version_id: str
    highest_hint_level: int
    latest_independence: AttemptIndependence


@dataclass(frozen=True, slots=True)
class MatchDecision:
    decision_id: str
    learner_snapshot_id: str
    candidate_version_ids: tuple[str, ...]
    selected_content_version_id: str
    policy_version: str
    conservative: bool
    reason_codes: tuple[str, ...]
    created_at: datetime


class ConservativeMaterialMatcher:
    """Deterministic Spike heuristic; it does not estimate ability or exam score."""

    policy_version = "conservative_match_v1"

    def select(
        self,
        *,
        decision_id: str,
        profile: LearnerProfileSnapshot,
        observations: tuple[CalibrationObservation, ...],
        candidates: tuple[MaterialCandidate, ...],
        now: datetime,
    ) -> MatchDecision:
        eligible = tuple(item for item in candidates if profile.exam_track in item.exam_tracks)
        if not eligible:
            raise ValueError("no candidate supports the learner exam track")

        high_support = any(item.highest_hint_level >= 3 for item in observations)
        low_confidence_profile = (
            profile.self_reported_level in {SelfReportedLevel.WEAK, SelfReportedLevel.UNKNOWN}
            or profile.evidence_count < 2
        )
        conservative = high_support or low_confidence_profile or len(observations) < 2
        independently_steady = (
            profile.self_reported_level is SelfReportedLevel.STEADY
            and len(observations) >= 2
            and all(
                item.highest_hint_level == 0
                and item.latest_independence is AttemptIndependence.INDEPENDENT
                for item in observations
            )
        )

        ranked = sorted(
            eligible,
            key=lambda item: self._rank(
                item,
                session_minutes=profile.session_minutes,
                conservative=conservative,
                independently_steady=independently_steady,
            ),
        )
        selected = ranked[0]
        reasons = ["exam_track_compatible", "session_time_compatible"]
        if high_support:
            reasons.append("high_hint_dependency_observed")
        if low_confidence_profile:
            reasons.append("profile_evidence_still_low")
        if conservative:
            reasons.append("familiar_topic_preferred")
        elif independently_steady:
            reasons.append("moderate_topic_novelty_allowed")
        else:
            reasons.append("moderate_load_preserved")
        return MatchDecision(
            decision_id=decision_id,
            learner_snapshot_id=profile.learner_snapshot_id,
            candidate_version_ids=tuple(item.content_version_id for item in eligible),
            selected_content_version_id=selected.content_version_id,
            policy_version=self.policy_version,
            conservative=conservative,
            reason_codes=tuple(reasons),
            created_at=now,
        )

    @staticmethod
    def _rank(
        candidate: MaterialCandidate,
        *,
        session_minutes: int,
        conservative: bool,
        independently_steady: bool,
    ) -> tuple[int, int, int, str]:
        familiarity_rank = {"high": 0, "medium": 1, "low": 2}
        novelty = familiarity_rank.get(candidate.topic_familiarity, 3)
        topic_penalty = abs(novelty - 1) if independently_steady and not conservative else novelty
        time_penalty = max(0, candidate.estimated_minutes - session_minutes)
        load_rank = {"light": 1, "moderate": 2, "heavy": 3}
        complexity = (
            load_rank.get(candidate.vocabulary_load, 4)
            + load_rank.get(candidate.syntax_load, 4)
            + {"same_sentence": 0, "same_paragraph": 1, "cross_paragraph": 2}.get(
                candidate.evidence_distance, 3
            )
        )
        target = 4 if conservative else 6
        complexity_distance = abs(complexity - target)
        return (
            time_penalty,
            topic_penalty,
            complexity_distance,
            candidate.content_version_id,
        )


class ExpressionMaterialMatcher:
    """Choose a transfer task linked to the reading while respecting current support load."""

    policy_version = "expression_transfer_match_v1"

    def select(
        self,
        *,
        decision_id: str,
        profile: LearnerProfileSnapshot,
        reading_content_id: str,
        reading_highest_hint_level: int,
        candidates: tuple[ExpressionMaterialCandidate, ...],
        now: datetime,
    ) -> MatchDecision:
        eligible = tuple(item for item in candidates if profile.exam_track in item.exam_tracks)
        if not eligible:
            raise ValueError("no expression candidate supports the learner exam track")
        lineage_id = reading_content_id.split("_ai_", maxsplit=1)[0]
        linked = tuple(item for item in eligible if lineage_id in item.source_reading_content_ids)
        pool = linked or eligible
        high_support = reading_highest_hint_level >= 3
        selected = sorted(
            pool,
            key=lambda item: self._rank(
                item,
                session_minutes=profile.session_minutes,
                high_support=high_support,
            ),
        )[0]
        reasons = ["exam_track_compatible", "expression_transfer_selected"]
        reasons.append("source_reading_linked" if linked else "source_link_unavailable_fallback")
        reasons.append(
            "lighter_expression_load_after_high_support"
            if high_support
            else "moderate_expression_transfer_preserved"
        )
        return MatchDecision(
            decision_id=decision_id,
            learner_snapshot_id=profile.learner_snapshot_id,
            candidate_version_ids=tuple(item.content_version_id for item in eligible),
            selected_content_version_id=selected.content_version_id,
            policy_version=self.policy_version,
            conservative=high_support,
            reason_codes=tuple(reasons),
            created_at=now,
        )

    @staticmethod
    def _rank(
        candidate: ExpressionMaterialCandidate,
        *,
        session_minutes: int,
        high_support: bool,
    ) -> tuple[int, int, str]:
        time_penalty = max(0, candidate.estimated_minutes - session_minutes)
        load_rank = {"light": 1, "moderate": 2, "heavy": 3}
        complexity = load_rank.get(candidate.vocabulary_load, 4) + load_rank.get(
            candidate.syntax_load, 4
        )
        target = 2 if high_support else 4
        return time_penalty, abs(complexity - target), candidate.content_version_id
