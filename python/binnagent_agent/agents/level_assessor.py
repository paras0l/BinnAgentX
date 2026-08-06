"""Auditable multi-signal assessment for the learner's current adaptation level."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AdaptationLevel = Literal["foundation", "developing", "independent", "advanced"]
ConfidenceBand = Literal["low", "medium", "high"]


class LevelEvidenceSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    completed_tasks: int = Field(ge=0)
    independent_tasks: int = Field(ge=0)
    hinted_tasks: int = Field(ge=0)
    revision_count: int = Field(ge=0)
    annotation_count: int = Field(ge=0)
    grammar_attempts: int = Field(ge=0)
    grammar_resolved: int = Field(ge=0)
    grammar_constructs: int = Field(default=0, ge=0)
    grammar_stable_constructs: int = Field(default=0, ge=0)
    grammar_productive_constructs: int = Field(default=0, ge=0)
    expression_attempts: int = Field(ge=0)
    difficulty_too_easy: int = Field(ge=0)
    difficulty_matched: int = Field(ge=0)
    difficulty_too_hard: int = Field(ge=0)
    material_helpful: int = Field(default=0, ge=0)
    material_unhelpful: int = Field(default=0, ge=0)
    reading_responses: int = Field(default=0, ge=0)
    reading_correct: int = Field(default=0, ge=0)
    reading_foundation_responses: int = Field(default=0, ge=0)
    reading_standard_responses: int = Field(default=0, ge=0)
    reading_advanced_responses: int = Field(default=0, ge=0)
    reading_foundation_correct: int = Field(default=0, ge=0)
    reading_standard_correct: int = Field(default=0, ge=0)
    reading_advanced_correct: int = Field(default=0, ge=0)
    vocabulary_responses: int = Field(default=0, ge=0)
    vocabulary_correct: int = Field(default=0, ge=0)
    grammar_question_responses: int = Field(default=0, ge=0)
    grammar_question_correct: int = Field(default=0, ge=0)
    grammar_independent_correct: int = Field(default=0, ge=0)
    grammar_supported_correct: int = Field(default=0, ge=0)
    grammar_incorrect: int = Field(default=0, ge=0)
    grammar_delayed_transfer: int = Field(default=0, ge=0)


class LevelDimensions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reading_comprehension: AdaptationLevel
    vocabulary: AdaptationLevel
    grammar: AdaptationLevel
    written_expression: AdaptationLevel


class LevelAssessmentOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall_level: AdaptationLevel
    dimensions: LevelDimensions
    confidence_band: ConfidenceBand
    evidence_count: int = Field(ge=0)
    reason_codes: list[str] = Field(min_length=1, max_length=8)


class LevelAssessmentAgent:
    """Estimate adaptation from scored evidence without pretending to be an exam score."""

    def assess(self, evidence: LevelEvidenceSummary) -> LevelAssessmentOutput:
        grammar_breadth = min(evidence.grammar_constructs / 4, 1.0)
        grammar_stability = (
            evidence.grammar_stable_constructs / evidence.grammar_constructs
            if evidence.grammar_constructs
            else 0.0
        )
        grammar_productive = (
            evidence.grammar_productive_constructs / evidence.grammar_constructs
            if evidence.grammar_constructs
            else 0.0
        )
        feedback_total = (
            evidence.difficulty_too_easy
            + evidence.difficulty_matched
            + evidence.difficulty_too_hard
        )
        material_feedback_total = evidence.material_helpful + evidence.material_unhelpful
        load_adjustment = 0.0
        if feedback_total:
            load_adjustment = (
                evidence.difficulty_too_easy - evidence.difficulty_too_hard
            ) / feedback_total

        reading_score = _anchored_reading_score(evidence)
        vocabulary_score = (
            _accuracy_score(evidence.vocabulary_correct, evidence.vocabulary_responses)
            if evidence.vocabulary_responses
            else min(reading_score, 1.35)
            if evidence.reading_responses
            else 1.0
        )
        direct_grammar_total = (
            evidence.grammar_independent_correct
            + evidence.grammar_supported_correct
            + evidence.grammar_incorrect
        )
        if direct_grammar_total or evidence.grammar_question_responses:
            correct = (
                evidence.grammar_independent_correct
                + 0.55 * evidence.grammar_supported_correct
                + evidence.grammar_question_correct
            )
            total = direct_grammar_total + evidence.grammar_question_responses
            independent_share = evidence.grammar_independent_correct / max(direct_grammar_total, 1)
            grammar_score = (
                0.35
                + 1.45 * (correct / max(total, 1))
                + 0.45 * independent_share
                + min(evidence.grammar_delayed_transfer, 2) * 0.2
            )
        elif evidence.grammar_constructs:
            # The projection only reaches these states after verified independent evidence.
            grammar_score = (
                0.55
                + 0.75 * grammar_breadth
                + 0.55 * grammar_stability
                + 0.4 * grammar_productive
            )
        else:
            grammar_score = 1.0

        # Completing or revising an expression is valuable learning behavior, but without a
        # rubric-scored outcome it is not evidence that written English is more advanced.
        expression_score = 1.0
        dimensions = LevelDimensions(
            reading_comprehension=_level(reading_score),
            vocabulary=_level(vocabulary_score),
            grammar=_level(grammar_score),
            written_expression=_level(expression_score),
        )
        measured_scores: list[float] = []
        if evidence.reading_responses:
            measured_scores.append(reading_score)
        if evidence.vocabulary_responses:
            measured_scores.append(vocabulary_score)
        if (
            direct_grammar_total
            or evidence.grammar_question_responses
            or evidence.grammar_constructs
        ):
            measured_scores.append(grammar_score)
        overall_score = (
            sum(measured_scores) / len(measured_scores) if measured_scores else 1.0
        ) + 0.2 * load_adjustment
        evidence_count = evidence.reading_responses + direct_grammar_total
        difficulty_tier_count = sum(
            count > 0
            for count in (
                evidence.reading_foundation_responses,
                evidence.reading_standard_responses,
                evidence.reading_advanced_responses,
            )
        )
        confidence: ConfidenceBand = (
            "high"
            if evidence_count >= 12 and difficulty_tier_count >= 2 and len(measured_scores) >= 2
            else "medium"
            if evidence_count >= 5 and len(measured_scores) >= 1
            else "low"
        )
        reasons = [
            f"scored_evidence:{evidence_count}",
            f"reading_accuracy:{evidence.reading_correct}/{evidence.reading_responses}",
            "reading_tiers:"
            f"{evidence.reading_foundation_responses}/"
            f"{evidence.reading_standard_responses}/"
            f"{evidence.reading_advanced_responses}",
            "grammar_state:"
            f"{evidence.grammar_constructs}/"
            f"{evidence.grammar_stable_constructs}/"
            f"{evidence.grammar_productive_constructs}",
            f"subjective_load:{load_adjustment:.2f}",
        ]
        if not evidence.vocabulary_responses:
            reasons.append("vocabulary:not_directly_measured")
        reasons.append("writing:not_rubric_scored")
        if material_feedback_total:
            reasons.append(
                f"material_feedback:{evidence.material_helpful}/{evidence.material_unhelpful}"
            )
        return LevelAssessmentOutput(
            overall_level=_level(overall_score),
            dimensions=dimensions,
            confidence_band=confidence,
            evidence_count=evidence_count,
            reason_codes=reasons,
        )


def _level(score: float) -> AdaptationLevel:
    if score >= 2.55:
        return "advanced"
    if score >= 1.75:
        return "independent"
    if score >= 1.0:
        return "developing"
    return "foundation"


def _anchored_reading_score(evidence: LevelEvidenceSummary) -> float:
    if not evidence.reading_responses:
        return 1.0
    weighted_difficulty = (
        0.65 * evidence.reading_foundation_responses
        + 1.45 * evidence.reading_standard_responses
        + 2.25 * evidence.reading_advanced_responses
    ) / evidence.reading_responses
    accuracy = evidence.reading_correct / evidence.reading_responses
    return max(0.0, min(3.0, weighted_difficulty + 1.6 * (accuracy - 0.5)))


def _accuracy_score(correct: int, total: int) -> float:
    if not total:
        return 1.0
    return max(0.0, min(3.0, 0.45 + 2.1 * (correct / total)))
