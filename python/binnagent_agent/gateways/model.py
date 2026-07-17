import asyncio
from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum
from hashlib import sha256
from time import perf_counter
from typing import Annotated, Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, ValidationError

from binnagent_agent.policies.budget import BudgetDecision, ModelBudget, evaluate_model_budget


class PriorityFeedbackOutput(BaseModel):
    """The only model-authored payload accepted by the priority-feedback gateway."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0.0"]
    focus: Literal["claim", "logic", "expression"]
    feedback: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=20, max_length=500),
    ]
    evidence_quote: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=240),
    ]
    replacement_text: None = None


class AnnotationAnalysisOutput(BaseModel):
    """Validated model payload for a learner-requested reading-span analysis."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.1.0"]
    selection_scope: Literal["word_or_phrase", "sentence_or_paragraph"]
    focus: Literal["vocabulary", "syntax", "reference", "logic", "context", "mixed"]
    translation: (
        Annotated[
            str,
            StringConstraints(strip_whitespace=True, min_length=1, max_length=2000),
        ]
        | None
    )
    vocabulary_note: (
        Annotated[
            str,
            StringConstraints(strip_whitespace=True, min_length=8, max_length=800),
        ]
        | None
    )
    grammar_structure: Annotated[
        list[
            Annotated[
                str,
                StringConstraints(strip_whitespace=True, min_length=4, max_length=320),
            ]
        ],
        Field(max_length=5),
    ]
    diagnosis: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=12, max_length=400),
    ]
    breakdown: Annotated[
        list[
            Annotated[
                str,
                StringConstraints(strip_whitespace=True, min_length=4, max_length=220),
            ]
        ],
        Field(min_length=1, max_length=4),
    ]
    next_check: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=8, max_length=300),
    ]
    evidence_quote: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=240),
    ]
    answer_text: None = None


@dataclass(frozen=True, slots=True)
class PriorityFeedbackRequest:
    workflow_run_id: str
    task_id: str
    input_attempt_version_id: str
    content_version_id: str
    attempt_text: str
    fallback_reason_code: str
    fallback_feedback: str


@dataclass(frozen=True, slots=True)
class AnnotationAnalysisRequest:
    workflow_run_id: str
    task_id: str
    content_version_id: str
    selected_text: str
    paragraph_context: str
    selection_scope: Literal["word_or_phrase", "sentence_or_paragraph"]
    learner_question: str
    fallback_focus: str
    fallback_diagnosis: str
    fallback_breakdown: tuple[str, ...]
    fallback_next_check: str
    fallback_translation: str | None = None
    fallback_vocabulary_note: str | None = None
    fallback_grammar_structure: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class ModelAdapterResponse:
    payload: object
    actual_cost_usd: Decimal


class PriorityFeedbackAdapter(Protocol):
    name: str
    is_remote: bool
    estimated_cost_usd: Decimal

    async def generate(self, request: PriorityFeedbackRequest) -> ModelAdapterResponse: ...


class AnnotationAnalysisAdapter(Protocol):
    name: str
    is_remote: bool
    estimated_cost_usd: Decimal

    async def generate(self, request: AnnotationAnalysisRequest) -> ModelAdapterResponse: ...


class GatewayOutcome(StrEnum):
    VALIDATED_FIXTURE = "validated_fixture"
    VALIDATED_MODEL = "validated_model"
    REMOTE_DISABLED_FALLBACK = "remote_disabled_fallback"
    BUDGET_FALLBACK = "budget_fallback"
    TIMEOUT_FALLBACK = "timeout_fallback"
    ADAPTER_ERROR_FALLBACK = "adapter_error_fallback"
    INVALID_OUTPUT_FALLBACK = "invalid_output_fallback"
    EVIDENCE_MISMATCH_FALLBACK = "evidence_mismatch_fallback"


@dataclass(frozen=True, slots=True)
class GatewayResult:
    adapter: str
    prompt_version: str
    outcome: GatewayOutcome
    reason_code: str
    delivered_content: str
    output_hash: str
    used_remote_call: bool
    estimated_cost_usd: Decimal
    actual_cost_usd: Decimal
    latency_ms: int
    focus: str | None
    evidence_start: int | None
    evidence_end: int | None
    evidence_hash: str | None
    rejection_code: str | None

    @property
    def used_fallback(self) -> bool:
        return self.outcome not in {
            GatewayOutcome.VALIDATED_FIXTURE,
            GatewayOutcome.VALIDATED_MODEL,
        }


class DeterministicPriorityFeedbackAdapter:
    name = "deterministic_fixture"
    is_remote = False
    estimated_cost_usd = Decimal("0")

    async def generate(self, request: PriorityFeedbackRequest) -> ModelAdapterResponse:
        evidence_quote = request.attempt_text.strip()[:160]
        return ModelAdapterResponse(
            payload={
                "schema_version": "1.0.0",
                "focus": "logic",
                "feedback": request.fallback_feedback,
                "evidence_quote": evidence_quote,
                "replacement_text": None,
            },
            actual_cost_usd=Decimal("0"),
        )


class DeterministicAnnotationAnalysisAdapter:
    name = "deterministic_fixture"
    is_remote = False
    estimated_cost_usd = Decimal("0")

    async def generate(self, request: AnnotationAnalysisRequest) -> ModelAdapterResponse:
        return ModelAdapterResponse(
            payload={
                "schema_version": "1.1.0",
                "selection_scope": request.selection_scope,
                "focus": request.fallback_focus,
                "translation": request.fallback_translation,
                "vocabulary_note": request.fallback_vocabulary_note,
                "grammar_structure": list(request.fallback_grammar_structure),
                "diagnosis": request.fallback_diagnosis,
                "breakdown": list(request.fallback_breakdown),
                "next_check": request.fallback_next_check,
                "evidence_quote": request.selected_text.strip()[:240],
                "answer_text": None,
            },
            actual_cost_usd=Decimal("0"),
        )


class PriorityFeedbackGateway:
    prompt_version = "prompt_expression_priority_feedback_v2"

    def __init__(
        self,
        adapter: PriorityFeedbackAdapter,
        *,
        timeout_seconds: float,
        allow_remote: bool = False,
    ) -> None:
        if timeout_seconds <= 0:
            raise ValueError("model timeout must be positive")
        if not adapter.estimated_cost_usd.is_finite() or adapter.estimated_cost_usd < 0:
            raise ValueError("model cost estimate must be finite and non-negative")
        self._adapter = adapter
        self._timeout_seconds = timeout_seconds
        self._allow_remote = allow_remote

    async def generate(
        self,
        request: PriorityFeedbackRequest,
        budget: ModelBudget,
    ) -> GatewayResult:
        if self._adapter.is_remote and not self._allow_remote:
            return self._fallback(
                request,
                GatewayOutcome.REMOTE_DISABLED_FALLBACK,
                "remote_model_calls_disabled",
            )
        if self._adapter.is_remote and (
            evaluate_model_budget(budget, self._adapter.estimated_cost_usd)
            is BudgetDecision.USE_DETERMINISTIC_FALLBACK
        ):
            return self._fallback(
                request,
                GatewayOutcome.BUDGET_FALLBACK,
                "model_budget_exhausted",
            )

        started = perf_counter()
        try:
            response = await asyncio.wait_for(
                self._adapter.generate(request),
                timeout=self._timeout_seconds,
            )
        except TimeoutError:
            return self._fallback(
                request,
                GatewayOutcome.TIMEOUT_FALLBACK,
                "model_timeout",
                latency_ms=self._latency_ms(started),
                remote_attempted=self._adapter.is_remote,
            )
        except Exception:
            return self._fallback(
                request,
                GatewayOutcome.ADAPTER_ERROR_FALLBACK,
                "model_adapter_error",
                latency_ms=self._latency_ms(started),
                remote_attempted=self._adapter.is_remote,
            )

        latency_ms = self._latency_ms(started)
        if not response.actual_cost_usd.is_finite() or response.actual_cost_usd < 0:
            return self._fallback(
                request,
                GatewayOutcome.INVALID_OUTPUT_FALLBACK,
                "negative_model_cost",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
            )
        try:
            output = PriorityFeedbackOutput.model_validate(response.payload)
        except ValidationError:
            return self._fallback(
                request,
                GatewayOutcome.INVALID_OUTPUT_FALLBACK,
                "model_output_schema_invalid",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
                actual_cost_usd=response.actual_cost_usd,
            )

        evidence_start = request.attempt_text.find(output.evidence_quote)
        if evidence_start < 0:
            return self._fallback(
                request,
                GatewayOutcome.EVIDENCE_MISMATCH_FALLBACK,
                "model_evidence_not_in_attempt",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
                actual_cost_usd=response.actual_cost_usd,
            )
        evidence_end = evidence_start + len(output.evidence_quote)
        reason_code = (
            "priority_feedback_model_validated"
            if self._adapter.is_remote
            else request.fallback_reason_code
        )
        return GatewayResult(
            adapter=self._adapter.name,
            prompt_version=self.prompt_version,
            outcome=(
                GatewayOutcome.VALIDATED_MODEL
                if self._adapter.is_remote
                else GatewayOutcome.VALIDATED_FIXTURE
            ),
            reason_code=reason_code,
            delivered_content=output.feedback.strip(),
            output_hash=self._hash(output.feedback.strip()),
            used_remote_call=self._adapter.is_remote,
            estimated_cost_usd=self._adapter.estimated_cost_usd,
            actual_cost_usd=response.actual_cost_usd,
            latency_ms=latency_ms,
            focus=output.focus,
            evidence_start=evidence_start,
            evidence_end=evidence_end,
            evidence_hash=self._hash(output.evidence_quote),
            rejection_code=None,
        )

    def _fallback(
        self,
        request: PriorityFeedbackRequest,
        outcome: GatewayOutcome,
        rejection_code: str,
        *,
        latency_ms: int = 0,
        remote_attempted: bool = False,
        actual_cost_usd: Decimal | None = None,
    ) -> GatewayResult:
        conservative_cost = (
            actual_cost_usd
            if actual_cost_usd is not None
            else self._adapter.estimated_cost_usd
            if remote_attempted
            else Decimal("0")
        )
        return GatewayResult(
            adapter=self._adapter.name,
            prompt_version=self.prompt_version,
            outcome=outcome,
            reason_code=request.fallback_reason_code,
            delivered_content=request.fallback_feedback,
            output_hash=self._hash(request.fallback_feedback),
            used_remote_call=remote_attempted,
            estimated_cost_usd=self._adapter.estimated_cost_usd,
            actual_cost_usd=conservative_cost,
            latency_ms=latency_ms,
            focus=None,
            evidence_start=None,
            evidence_end=None,
            evidence_hash=None,
            rejection_code=rejection_code,
        )

    @staticmethod
    def _latency_ms(started: float) -> int:
        return max(0, round((perf_counter() - started) * 1000))

    @staticmethod
    def _hash(value: str) -> str:
        return sha256(value.encode("utf-8")).hexdigest()


@dataclass(frozen=True, slots=True)
class AnnotationAnalysisResult:
    adapter: str
    prompt_version: str
    outcome: GatewayOutcome
    reason_code: str
    focus: str
    selection_scope: str
    translation: str | None
    vocabulary_note: str | None
    grammar_structure: tuple[str, ...]
    diagnosis: str
    breakdown: tuple[str, ...]
    next_check: str
    output_hash: str
    used_remote_call: bool
    estimated_cost_usd: Decimal
    actual_cost_usd: Decimal
    latency_ms: int
    evidence_start: int | None
    evidence_end: int | None
    evidence_hash: str | None
    rejection_code: str | None

    @property
    def used_fallback(self) -> bool:
        return self.outcome not in {
            GatewayOutcome.VALIDATED_FIXTURE,
            GatewayOutcome.VALIDATED_MODEL,
        }


class AnnotationAnalysisGateway:
    prompt_version = "prompt_annotation_confusion_analysis_v2"

    def __init__(
        self,
        adapter: AnnotationAnalysisAdapter,
        *,
        timeout_seconds: float,
        allow_remote: bool = False,
    ) -> None:
        if timeout_seconds <= 0:
            raise ValueError("model timeout must be positive")
        if not adapter.estimated_cost_usd.is_finite() or adapter.estimated_cost_usd < 0:
            raise ValueError("model cost estimate must be finite and non-negative")
        self._adapter = adapter
        self._timeout_seconds = timeout_seconds
        self._allow_remote = allow_remote

    async def generate(
        self,
        request: AnnotationAnalysisRequest,
        budget: ModelBudget,
    ) -> AnnotationAnalysisResult:
        if self._adapter.is_remote and not self._allow_remote:
            return self._fallback(
                request,
                GatewayOutcome.REMOTE_DISABLED_FALLBACK,
                "remote_model_calls_disabled",
            )
        if self._adapter.is_remote and (
            evaluate_model_budget(budget, self._adapter.estimated_cost_usd)
            is BudgetDecision.USE_DETERMINISTIC_FALLBACK
        ):
            return self._fallback(
                request,
                GatewayOutcome.BUDGET_FALLBACK,
                "model_budget_exhausted",
            )

        started = perf_counter()
        try:
            response = await asyncio.wait_for(
                self._adapter.generate(request),
                timeout=self._timeout_seconds,
            )
        except TimeoutError:
            return self._fallback(
                request,
                GatewayOutcome.TIMEOUT_FALLBACK,
                "model_timeout",
                latency_ms=self._latency_ms(started),
                remote_attempted=self._adapter.is_remote,
            )
        except Exception:
            return self._fallback(
                request,
                GatewayOutcome.ADAPTER_ERROR_FALLBACK,
                "model_adapter_error",
                latency_ms=self._latency_ms(started),
                remote_attempted=self._adapter.is_remote,
            )

        latency_ms = self._latency_ms(started)
        if not response.actual_cost_usd.is_finite() or response.actual_cost_usd < 0:
            return self._fallback(
                request,
                GatewayOutcome.INVALID_OUTPUT_FALLBACK,
                "negative_model_cost",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
            )
        try:
            output = AnnotationAnalysisOutput.model_validate(response.payload)
        except ValidationError:
            return self._fallback(
                request,
                GatewayOutcome.INVALID_OUTPUT_FALLBACK,
                "model_output_schema_invalid",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
                actual_cost_usd=response.actual_cost_usd,
            )

        output_matches_scope = output.selection_scope == request.selection_scope
        output_has_primary_help = (
            output.vocabulary_note is not None
            if request.selection_scope == "word_or_phrase"
            else output.translation is not None and len(output.grammar_structure) > 0
        )
        if not output_matches_scope or (self._adapter.is_remote and not output_has_primary_help):
            return self._fallback(
                request,
                GatewayOutcome.INVALID_OUTPUT_FALLBACK,
                "model_selection_assistance_mismatch",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
                actual_cost_usd=response.actual_cost_usd,
            )

        evidence_start = request.paragraph_context.find(output.evidence_quote)
        if evidence_start < 0:
            return self._fallback(
                request,
                GatewayOutcome.EVIDENCE_MISMATCH_FALLBACK,
                "model_evidence_not_in_context",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
                actual_cost_usd=response.actual_cost_usd,
            )
        evidence_end = evidence_start + len(output.evidence_quote)
        serialized = "\n".join(
            [
                output.selection_scope,
                output.focus,
                output.translation or "",
                output.vocabulary_note or "",
                *output.grammar_structure,
                output.diagnosis,
                *output.breakdown,
                output.next_check,
            ]
        )
        return AnnotationAnalysisResult(
            adapter=self._adapter.name,
            prompt_version=self.prompt_version,
            outcome=(
                GatewayOutcome.VALIDATED_MODEL
                if self._adapter.is_remote
                else GatewayOutcome.VALIDATED_FIXTURE
            ),
            reason_code=(
                "annotation_analysis_model_validated"
                if self._adapter.is_remote
                else "annotation_analysis_fixture"
            ),
            focus=output.focus,
            selection_scope=output.selection_scope,
            translation=output.translation,
            vocabulary_note=output.vocabulary_note,
            grammar_structure=tuple(output.grammar_structure),
            diagnosis=output.diagnosis,
            breakdown=tuple(output.breakdown),
            next_check=output.next_check,
            output_hash=self._hash(serialized),
            used_remote_call=self._adapter.is_remote,
            estimated_cost_usd=self._adapter.estimated_cost_usd,
            actual_cost_usd=response.actual_cost_usd,
            latency_ms=latency_ms,
            evidence_start=evidence_start,
            evidence_end=evidence_end,
            evidence_hash=self._hash(output.evidence_quote),
            rejection_code=None,
        )

    def _fallback(
        self,
        request: AnnotationAnalysisRequest,
        outcome: GatewayOutcome,
        rejection_code: str,
        *,
        latency_ms: int = 0,
        remote_attempted: bool = False,
        actual_cost_usd: Decimal | None = None,
    ) -> AnnotationAnalysisResult:
        conservative_cost = (
            actual_cost_usd
            if actual_cost_usd is not None
            else self._adapter.estimated_cost_usd
            if remote_attempted
            else Decimal("0")
        )
        serialized = "\n".join(
            [
                request.fallback_focus,
                request.selection_scope,
                request.fallback_translation or "",
                request.fallback_vocabulary_note or "",
                *request.fallback_grammar_structure,
                request.fallback_diagnosis,
                *request.fallback_breakdown,
                request.fallback_next_check,
            ]
        )
        return AnnotationAnalysisResult(
            adapter=self._adapter.name,
            prompt_version=self.prompt_version,
            outcome=outcome,
            reason_code="annotation_analysis_fallback",
            focus=request.fallback_focus,
            selection_scope=request.selection_scope,
            translation=request.fallback_translation,
            vocabulary_note=request.fallback_vocabulary_note,
            grammar_structure=request.fallback_grammar_structure,
            diagnosis=request.fallback_diagnosis,
            breakdown=request.fallback_breakdown,
            next_check=request.fallback_next_check,
            output_hash=self._hash(serialized),
            used_remote_call=remote_attempted,
            estimated_cost_usd=self._adapter.estimated_cost_usd,
            actual_cost_usd=conservative_cost,
            latency_ms=latency_ms,
            evidence_start=None,
            evidence_end=None,
            evidence_hash=None,
            rejection_code=rejection_code,
        )

    @staticmethod
    def _latency_ms(started: float) -> int:
        return max(0, round((perf_counter() - started) * 1000))

    @staticmethod
    def _hash(value: str) -> str:
        return sha256(value.encode("utf-8")).hexdigest()
