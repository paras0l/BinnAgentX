"""Versioned contracts and deterministic gates for personalized learning content."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from binnagent_domain.learning.grammar_ontology import (
    GrammarFacet,
    load_grammar_catalog,
    resolve_construction_id,
)


class StrictModel(BaseModel):
    """Forbid silent contract drift at workflow and persistence boundaries."""

    model_config = ConfigDict(extra="forbid", frozen=True)


class QualityStatus(StrEnum):
    NOT_EVALUATED = "not_evaluated"
    STRUCTURALLY_VALIDATED = "structurally_validated"
    SEMANTIC_REVIEW_REQUIRED = "semantic_review_required"
    SEMANTIC_REVIEWED = "semantic_reviewed"
    REJECTED = "rejected"
    UNVERIFIED_LEGACY = "unverified_legacy"


class QualityResult(StrEnum):
    PASS = "pass"
    REVISE = "revise"
    REJECT = "reject"
    REVIEW_REQUIRED = "review_required"


class QualitySeverity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    BLOCKER = "blocker"


class QualityIssueCode(StrEnum):
    ARTICLE_COHERENCE_FAILED = "ARTICLE_COHERENCE_FAILED"
    ARTICLE_TARGET_COVERAGE_FAILED = "ARTICLE_TARGET_COVERAGE_FAILED"
    QUESTION_NOT_ANSWERABLE = "QUESTION_NOT_ANSWERABLE"
    MULTIPLE_VALID_OPTIONS = "MULTIPLE_VALID_OPTIONS"
    ANSWER_EVIDENCE_MISMATCH = "ANSWER_EVIDENCE_MISMATCH"
    DISTRACTOR_NOT_PLAUSIBLE = "DISTRACTOR_NOT_PLAUSIBLE"
    HINT_LEAKS_ANSWER = "HINT_LEAKS_ANSWER"
    GRAMMAR_SPAN_INVALID = "GRAMMAR_SPAN_INVALID"
    GRAMMAR_PARSE_LOW_CONFIDENCE = "GRAMMAR_PARSE_LOW_CONFIDENCE"
    WORD_SENSE_UNRESOLVED = "WORD_SENSE_UNRESOLVED"
    TRANSLATION_ALIGNMENT_FAILED = "TRANSLATION_ALIGNMENT_FAILED"
    TRANSFER_TASK_UNRELATED = "TRANSFER_TASK_UNRELATED"
    SOURCE_LINEAGE_MISSING = "SOURCE_LINEAGE_MISSING"
    RIGHTS_STATUS_BLOCKED = "RIGHTS_STATUS_BLOCKED"
    SEMANTIC_REVIEW_NOT_RUN = "SEMANTIC_REVIEW_NOT_RUN"


class SourceSpan(StrictModel):
    """Half-open character span in a versioned source."""

    source_id: str = Field(min_length=1, max_length=180)
    source_version: str = Field(min_length=1, max_length=80)
    start: Annotated[int, Field(ge=0)]
    end: Annotated[int, Field(gt=0)]
    text_quote: str = Field(min_length=1)

    @model_validator(mode="after")
    def valid_range(self) -> SourceSpan:
        if self.end <= self.start:
            raise ValueError("source_span_end_must_follow_start")
        return self


class TargetWordSense(StrictModel):
    target_id: str = Field(min_length=1, max_length=128)
    lemma: str = Field(min_length=1, max_length=120)
    part_of_speech: str = Field(min_length=1, max_length=48)
    sense_id: str = Field(min_length=1, max_length=160)
    gloss: str = Field(min_length=1, max_length=500)
    collocations: tuple[str, ...] = ()
    evidence: tuple[SourceSpan, ...] = Field(min_length=1)


class TargetGrammarStructure(StrictModel):
    target_id: str = Field(min_length=1, max_length=128)
    construction_id: str = Field(pattern=r"^[a-z][a-z0-9_.]+\.v[1-9][0-9]*$")
    construction_version: Annotated[int, Field(ge=1)]
    target_facets: tuple[GrammarFacet, ...] = Field(min_length=1)
    learner_gap: str = Field(min_length=1, max_length=500)
    evidence: tuple[SourceSpan, ...] = Field(min_length=1)

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_structure_key(cls, value: Any) -> Any:
        migrated = _migrate_construction_reference(value)
        if isinstance(migrated, dict):
            migrated.setdefault("target_facets", [GrammarFacet.FORM, GrammarFacet.MEANING])
        return migrated

    @model_validator(mode="after")
    def construction_exists(self) -> TargetGrammarStructure:
        construction = load_grammar_catalog().by_id(self.construction_id)
        if construction.version != self.construction_version:
            raise ValueError("target_grammar_construction_version_mismatch")
        return self


class DifficultyConstraints(StrictModel):
    lexical_band: str = Field(min_length=1, max_length=80)
    syntax_band: str = Field(min_length=1, max_length=80)
    discourse_band: str = Field(min_length=1, max_length=80)
    estimated_minutes: Annotated[int, Field(ge=1, le=180)]


class RequiredEvidence(StrictModel):
    target_id: str = Field(min_length=1, max_length=128)
    evidence_kind: Literal["word_sense", "grammar", "discourse", "reading_skill"]
    minimum_occurrences: Annotated[int, Field(ge=1, le=20)] = 1


class ObjectiveUncertainty(StrictModel):
    statement: str = Field(min_length=1, max_length=500)
    confidence: Annotated[float, Field(ge=0, le=1)]
    forbidden_inference: str | None = Field(default=None, max_length=500)


class LearningObjectiveBundle(StrictModel):
    objective_bundle_id: str = Field(min_length=1, max_length=128)
    learner_id: str = Field(min_length=1, max_length=128)
    source_asset_ids: tuple[str, ...] = Field(min_length=1)
    target_word_senses: tuple[TargetWordSense, ...] = ()
    target_grammar_structures: tuple[TargetGrammarStructure, ...] = ()
    target_discourse_moves: tuple[str, ...] = ()
    reading_skill_targets: tuple[str, ...] = ()
    difficulty_constraints: DifficultyConstraints
    required_evidence: tuple[RequiredEvidence, ...] = Field(min_length=1)
    uncertainty: tuple[ObjectiveUncertainty, ...] = ()
    version: Annotated[int, Field(ge=1)]

    @model_validator(mode="after")
    def evidence_targets_exist(self) -> LearningObjectiveBundle:
        target_ids = {
            *(target.target_id for target in self.target_word_senses),
            *(target.target_id for target in self.target_grammar_structures),
            *self.target_discourse_moves,
            *self.reading_skill_targets,
        }
        missing = {
            evidence.target_id
            for evidence in self.required_evidence
            if evidence.target_id not in target_ids
        }
        if missing:
            raise ValueError(f"required_evidence_target_missing:{','.join(sorted(missing))}")
        return self


class ContentArtifact(StrictModel):
    artifact_id: str = Field(min_length=1, max_length=128)
    version: Annotated[int, Field(ge=1)]
    objective_bundle_id: str = Field(min_length=1, max_length=128)
    artifact_type: Literal["article", "question", "hint", "grammar_annotation", "expression_task"]
    generation_inputs_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    content_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    source_spans: tuple[SourceSpan, ...] = ()
    quality_status: QualityStatus = QualityStatus.NOT_EVALUATED
    quality_report_ids: tuple[str, ...] = ()
    producer_version: str = Field(min_length=1, max_length=80)
    supersedes_artifact_id: str | None = Field(default=None, max_length=128)


class QualityReport(StrictModel):
    report_id: str = Field(min_length=1, max_length=128)
    artifact_id: str = Field(min_length=1, max_length=128)
    validator_id: str = Field(min_length=1, max_length=128)
    validator_version: str = Field(min_length=1, max_length=80)
    result: QualityResult
    issue_code: QualityIssueCode | None = None
    severity: QualitySeverity
    evidence_refs: tuple[SourceSpan, ...] = ()
    repair_scope: tuple[str, ...] = ()
    confidence: Annotated[float, Field(ge=0, le=1)]

    @model_validator(mode="after")
    def failure_has_issue(self) -> QualityReport:
        if self.result is not QualityResult.PASS and self.issue_code is None:
            raise ValueError("quality_failure_requires_issue_code")
        if self.result is QualityResult.PASS and self.issue_code is not None:
            raise ValueError("quality_pass_cannot_have_issue_code")
        return self


class ReadingAnswerEvent(StrictModel):
    question_artifact_id: str = Field(min_length=1, max_length=128)
    selected_option_id: str = Field(min_length=1, max_length=80)
    is_final: bool
    occurred_at: datetime


class ReadingEvidenceSnapshot(StrictModel):
    snapshot_id: str = Field(min_length=1, max_length=128)
    learner_id: str = Field(min_length=1, max_length=128)
    objective_bundle_id: str = Field(min_length=1, max_length=128)
    reading_artifact_id: str = Field(min_length=1, max_length=128)
    reading_artifact_version: Annotated[int, Field(ge=1)]
    answer_events: tuple[ReadingAnswerEvent, ...] = ()
    used_hint_ids: tuple[str, ...] = ()
    selected_spans: tuple[SourceSpan, ...] = ()
    analysis_request_ids: tuple[str, ...] = ()
    analysis_feedback: tuple[str, ...] = ()
    difficulty_target_ids: tuple[str, ...] = ()
    difficulty_confidence: Annotated[float, Field(ge=0, le=1)] | None = None
    completed_independently: bool
    captured_at: datetime


class QuestionOption(StrictModel):
    option_id: str = Field(min_length=1, max_length=80)
    text: str = Field(min_length=1, max_length=1000)
    error_mechanism: str | None = Field(default=None, max_length=500)


class ReadingQuestionArtifact(StrictModel):
    artifact: ContentArtifact
    question_type: Literal[
        "main_idea",
        "detail_comprehension",
        "inference",
        "evidence_reasoning",
    ]
    stem: str = Field(min_length=1, max_length=1000)
    options: tuple[QuestionOption, ...] = Field(min_length=2, max_length=6)
    answer_option_id: str = Field(min_length=1, max_length=80)
    answer_evidence: tuple[SourceSpan, ...] = Field(min_length=1)
    solver_trace_ref: str = Field(min_length=1, max_length=180)
    hint_texts: tuple[str, ...] = ()

    @model_validator(mode="after")
    def answer_and_distractors_are_explicit(self) -> ReadingQuestionArtifact:
        option_ids = [option.option_id for option in self.options]
        if len(option_ids) != len(set(option_ids)):
            raise ValueError("question_option_ids_must_be_unique")
        if self.answer_option_id not in option_ids:
            raise ValueError("question_answer_option_missing")
        for option in self.options:
            if option.option_id != self.answer_option_id and not option.error_mechanism:
                raise ValueError("question_distractor_requires_error_mechanism")
        answer_text = next(
            option.text for option in self.options if option.option_id == self.answer_option_id
        )
        normalized_answer = _normalized(answer_text)
        if normalized_answer and any(
            normalized_answer in _normalized(hint) for hint in self.hint_texts
        ):
            raise ValueError("question_hint_leaks_answer")
        return self


class GrammarRoleSpan(StrictModel):
    role: str = Field(min_length=1, max_length=120)
    span: SourceSpan


class GrammarAnalysisArtifact(StrictModel):
    artifact: ContentArtifact
    construction_id: str = Field(pattern=r"^[a-z][a-z0-9_.]+\.v[1-9][0-9]*$")
    construction_version: Annotated[int, Field(ge=1)]
    target_facets: tuple[GrammarFacet, ...] = Field(min_length=1)
    span: SourceSpan
    role_spans: tuple[GrammarRoleSpan, ...] = ()
    form: str = Field(min_length=3, max_length=1000)
    meaning: str = Field(min_length=3, max_length=1000)
    use: str = Field(min_length=3, max_length=1000)
    explanation: str = Field(min_length=1, max_length=2000)
    parser_id: str = Field(min_length=1, max_length=128)
    parser_version: str = Field(min_length=1, max_length=80)
    parser_evidence: tuple[str, ...] = ()
    confidence: Annotated[float, Field(ge=0, le=1)]
    status: Literal["resolved", "abstained", "review_required"]
    alternatives: tuple[str, ...] = ()

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_structure_key(cls, value: Any) -> Any:
        migrated = _migrate_construction_reference(value)
        if not isinstance(migrated, dict):
            return migrated
        construction_id = migrated.get("construction_id")
        if not isinstance(construction_id, str):
            return migrated
        construction = load_grammar_catalog().by_id(construction_id)
        migrated.setdefault("target_facets", [GrammarFacet.FORM, GrammarFacet.MEANING])
        migrated.setdefault("form", construction.form)
        migrated.setdefault("meaning", construction.meaning)
        migrated.setdefault("use", construction.use)
        migrated.setdefault("role_spans", [])
        migrated.setdefault("parser_evidence", [])
        return migrated

    @model_validator(mode="after")
    def valid_resolution_and_construction(self) -> GrammarAnalysisArtifact:
        construction = load_grammar_catalog().by_id(self.construction_id)
        if construction.version != self.construction_version:
            raise ValueError("grammar_analysis_construction_version_mismatch")
        if self.confidence < 0.7 and self.status == "resolved":
            raise ValueError("grammar_low_confidence_must_abstain")
        return self


class TransferContract(StrictModel):
    transfer_contract_id: str = Field(min_length=1, max_length=128)
    objective_bundle_id: str = Field(min_length=1, max_length=128)
    source_reading_artifact_id: str = Field(min_length=1, max_length=128)
    required_transfer_targets: tuple[str, ...] = Field(min_length=1)
    reading_evidence_refs: tuple[str, ...] = Field(min_length=1)
    novel_context_constraints: tuple[str, ...] = Field(min_length=1)
    success_criteria: tuple[str, ...] = Field(min_length=1)
    delayed_validation_plan: str = Field(min_length=1, max_length=1000)
    version: Annotated[int, Field(ge=1)] = 1


class ExpressionTaskArtifact(StrictModel):
    artifact: ContentArtifact
    transfer_contract_id: str = Field(min_length=1, max_length=128)
    prompt: str = Field(min_length=1, max_length=2000)
    required_target_ids: tuple[str, ...] = Field(min_length=1)
    reading_evidence_refs: tuple[str, ...] = Field(min_length=1)


class PersonalizedLearningPackage(StrictModel):
    objective_bundle: LearningObjectiveBundle
    article: ContentArtifact
    questions: tuple[ReadingQuestionArtifact, ...] = Field(min_length=1)
    grammar_annotations: tuple[GrammarAnalysisArtifact, ...] = ()
    transfer_contract: TransferContract
    expression_task: ExpressionTaskArtifact
    quality_reports: tuple[QualityReport, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def shared_lineage_and_transfer(self) -> PersonalizedLearningPackage:
        bundle_id = self.objective_bundle.objective_bundle_id
        artifacts = [
            self.article,
            *(question.artifact for question in self.questions),
            *(annotation.artifact for annotation in self.grammar_annotations),
            self.expression_task.artifact,
        ]
        if any(artifact.objective_bundle_id != bundle_id for artifact in artifacts):
            raise ValueError("package_objective_bundle_mismatch")
        if self.transfer_contract.objective_bundle_id != bundle_id:
            raise ValueError("transfer_objective_bundle_mismatch")
        if self.transfer_contract.source_reading_artifact_id != self.article.artifact_id:
            raise ValueError("transfer_reading_artifact_mismatch")
        if self.expression_task.transfer_contract_id != self.transfer_contract.transfer_contract_id:
            raise ValueError("expression_transfer_contract_mismatch")
        required = set(self.transfer_contract.required_transfer_targets)
        if not required.intersection(self.expression_task.required_target_ids):
            raise ValueError("expression_task_has_no_required_transfer_target")
        grammar_targets = {
            target.construction_id for target in self.objective_bundle.target_grammar_structures
        }
        annotation_targets = {annotation.construction_id for annotation in self.grammar_annotations}
        if not annotation_targets.issubset(grammar_targets):
            raise ValueError("grammar_annotation_outside_objective")
        if not grammar_targets.issubset(required):
            raise ValueError("grammar_target_missing_from_transfer")
        if not grammar_targets.issubset(set(self.expression_task.required_target_ids)):
            raise ValueError("grammar_target_missing_from_expression")
        return self


def stable_content_hash(value: object) -> str:
    """Hash canonical JSON so retries and caches share one stable key."""

    if isinstance(value, BaseModel):
        value = value.model_dump(mode="json")
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def validate_source_span(span: SourceSpan, source_text: str) -> bool:
    """Verify both offsets and quoted evidence against the exact source version."""

    return span.end <= len(source_text) and source_text[span.start : span.end] == span.text_quote


def _normalized(value: str) -> str:
    return re.sub(r"\W+", "", value, flags=re.UNICODE).casefold()


def _migrate_construction_reference(value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    migrated = dict(value)
    legacy = migrated.pop("structure_key", None)
    construction_value = migrated.get("construction_id", legacy)
    if not isinstance(construction_value, str):
        return migrated
    construction_id = resolve_construction_id(construction_value)
    construction = load_grammar_catalog().by_id(construction_id)
    migrated["construction_id"] = construction_id
    migrated.setdefault("construction_version", construction.version)
    return migrated
