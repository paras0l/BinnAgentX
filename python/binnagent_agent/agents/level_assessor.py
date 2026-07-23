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
    expression_attempts: int = Field(ge=0)
    difficulty_too_easy: int = Field(ge=0)
    difficulty_matched: int = Field(ge=0)
    difficulty_too_hard: int = Field(ge=0)
    material_helpful: int = Field(default=0, ge=0)
    material_unhelpful: int = Field(default=0, ge=0)


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
    """Combines behavior and subjective load without pretending to be an exam score."""

    def assess(self, evidence: LevelEvidenceSummary) -> LevelAssessmentOutput:
        completed = evidence.completed_tasks
        independence = evidence.independent_tasks / completed if completed else 0.0
        grammar_rate = (
            evidence.grammar_resolved / evidence.grammar_attempts
            if evidence.grammar_attempts
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

        reading_score = 0.75 + 1.55 * independence + 0.35 * load_adjustment
        vocabulary_score = reading_score + min(evidence.annotation_count, 6) * 0.04
        grammar_score = 0.65 + 1.35 * grammar_rate + 0.45 * independence
        expression_score = (
            0.65
            + min(evidence.expression_attempts, 6) * 0.12
            + min(evidence.revision_count, 6) * 0.08
            + 0.75 * independence
        )
        dimensions = LevelDimensions(
            reading_comprehension=_level(reading_score),
            vocabulary=_level(vocabulary_score),
            grammar=_level(grammar_score),
            written_expression=_level(expression_score),
        )
        dimension_scores = [
            _level_score(dimensions.reading_comprehension),
            _level_score(dimensions.vocabulary),
            _level_score(dimensions.grammar),
            _level_score(dimensions.written_expression),
        ]
        overall_score = sum(dimension_scores) / len(dimension_scores) + 0.25 * load_adjustment
        evidence_count = completed + feedback_total + evidence.grammar_attempts
        confidence: ConfidenceBand = (
            "high"
            if completed >= 12 and feedback_total >= 3
            else "medium"
            if completed >= 4
            else "low"
        )
        reasons = [
            f"completed_tasks:{completed}",
            f"independence:{independence:.2f}",
            f"grammar_resolution:{grammar_rate:.2f}",
            f"subjective_load:{load_adjustment:.2f}",
        ]
        if evidence.revision_count:
            reasons.append(f"revisions:{evidence.revision_count}")
        if evidence.annotation_count:
            reasons.append(f"annotations:{evidence.annotation_count}")
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


def _level_score(level: AdaptationLevel) -> int:
    return {
        "foundation": 0,
        "developing": 1,
        "independent": 2,
        "advanced": 3,
    }[level]
