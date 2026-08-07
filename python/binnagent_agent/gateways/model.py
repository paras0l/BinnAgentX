import asyncio
import re
from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum
from hashlib import sha256
from time import perf_counter
from typing import Annotated, Literal, Protocol

from binnagent_domain.model_errors import ModelBalanceError
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


class AnchoredSentenceInsightOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text_quote: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=240),
    ]
    explanation: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=8, max_length=500),
    ]


class SentenceComponentOutput(AnchoredSentenceInsightOutput):
    role: Literal[
        "subject",
        "predicate",
        "object",
        "predicative",
        "attributive",
        "adverbial",
        "complement",
        "appositive",
        "connector",
    ]
    start: Annotated[int, Field(ge=0)]
    end: Annotated[int, Field(ge=1)]


class TranslationReviewIssueOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["word_meaning", "scope", "logic", "omission", "tone", "structure"]
    source_quote: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=240),
    ]
    learner_excerpt: (
        Annotated[
            str,
            StringConstraints(strip_whitespace=True, min_length=1, max_length=240),
        ]
        | None
    ) = None
    explanation: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=8, max_length=500),
    ]
    suggestion: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=4, max_length=300),
    ]


class TranslationReviewOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=12, max_length=500),
    ]
    strengths: Annotated[
        list[
            Annotated[
                str,
                StringConstraints(strip_whitespace=True, min_length=4, max_length=240),
            ]
        ],
        Field(default_factory=list, max_length=4),
    ]
    issues: Annotated[list[TranslationReviewIssueOutput], Field(default_factory=list, max_length=4)]


class KnowledgeCardOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: Literal["grammar", "collocation", "vocabulary", "translation"]
    title: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=2, max_length=80),
    ]
    source_quote: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=240),
    ]
    rule: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=4, max_length=400),
    ]
    explanation: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=8, max_length=500),
    ]
    check_question: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=8, max_length=300),
    ]


class FollowUpAnswerOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=8, max_length=800),
    ]
    evidence_quotes: Annotated[
        list[
            Annotated[
                str,
                StringConstraints(strip_whitespace=True, min_length=1, max_length=240),
            ]
        ],
        Field(default_factory=list, max_length=3),
    ]
    next_questions: Annotated[
        list[
            Annotated[
                str,
                StringConstraints(strip_whitespace=True, min_length=4, max_length=200),
            ]
        ],
        Field(default_factory=list, max_length=3),
    ]


class AnnotationAnalysisOutput(BaseModel):
    """Validated model payload for a learner-requested reading-span analysis."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.1.0", "1.2.0", "1.3.0"]
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
        Field(max_length=6),
    ]
    sentence_components: Annotated[
        list[SentenceComponentOutput], Field(default_factory=list, max_length=16)
    ]
    grammar_points: Annotated[
        list[AnchoredSentenceInsightOutput], Field(default_factory=list, max_length=8)
    ]
    collocations: Annotated[
        list[AnchoredSentenceInsightOutput], Field(default_factory=list, max_length=8)
    ]
    familiar_word_senses: Annotated[
        list[AnchoredSentenceInsightOutput], Field(default_factory=list, max_length=8)
    ]
    translation_review: TranslationReviewOutput | None = None
    knowledge_cards: Annotated[list[KnowledgeCardOutput], Field(default_factory=list, max_length=8)]
    follow_up_answer: FollowUpAnswerOutput | None = None
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


class ExpressionStyleVersionOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    style: Literal["logic_mirror", "academic", "news"]
    label: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=40)]
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
    explanation: Annotated[
        list[
            Annotated[str, StringConstraints(strip_whitespace=True, min_length=4, max_length=300)]
        ],
        Field(min_length=1, max_length=4),
    ]


class ExpressionReviewOutput(BaseModel):
    """Validated three-style review of a learner-authored expression draft."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0.0"]
    original_quote: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
    ]
    thinking_difference: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=12, max_length=800),
    ]
    versions: Annotated[list[ExpressionStyleVersionOutput], Field(min_length=3, max_length=3)]


class ExpressionAssistOutput(BaseModel):
    """Validated contextual recommendation generated from a learner's Chinese intent."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0.0"]
    recommended_expression: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=2, max_length=2000),
    ]
    context_fit: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=8, max_length=500),
    ]
    usage_notes: Annotated[
        list[
            Annotated[str, StringConstraints(strip_whitespace=True, min_length=4, max_length=240)]
        ],
        Field(min_length=1, max_length=4),
    ]


def _conservative_expression_versions(draft: str) -> tuple[ExpressionStyleVersionOutput, ...]:
    academic = draft
    for source, target in (
        (r",\s+but\s+", "; however, "),
        (r"\bon their own\b", "independently"),
        (r",\s+then\s+", ". They can then "),
        (r"\buse the tool\b", "consult the tool"),
    ):
        academic = re.sub(source, target, academic, flags=re.IGNORECASE)

    news = draft
    for source, target in (
        (r",\s+but\s+", ". "),
        (r",\s+then\s+", ". Then "),
        (r"\bon their own\b", "independently"),
        (r"\ba specific\b", "a"),
    ):
        news = re.sub(source, target, news, flags=re.IGNORECASE)

    return (
        ExpressionStyleVersionOutput(
            style="logic_mirror",
            label="中式思路镜像",
            text=draft,
            explanation=["保留原有信息顺序, 用来观察观点是否先于依据出现。"],
        ),
        ExpressionStyleVersionOutput(
            style="academic",
            label="地道学术版",
            text=academic,
            explanation=["使用克制的连接词与书面搭配, 同时保留原有立场和事实。"],
        ),
        ExpressionStyleVersionOutput(
            style="news",
            label="极简新闻版",
            text=news,
            explanation=["拆开转折和动作顺序, 让每个短句只承担一个主要信息。"],
        ),
    )


@dataclass(frozen=True, slots=True)
class PriorityFeedbackRequest:
    workflow_run_id: str
    task_id: str
    input_attempt_version_id: str
    content_version_id: str
    attempt_text: str
    fallback_reason_code: str
    fallback_feedback: str
    learner_memory: tuple[tuple[str, str], ...] = ()


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
    analysis_mode: Literal["standard", "intensive_reading"] = "standard"
    learner_translation: str | None = None
    learner_component_marks: tuple[tuple[str, int, int, str], ...] = ()
    follow_up_target_kind: str | None = None
    follow_up_target_label: str | None = None
    follow_up_target_content: str | None = None
    follow_up_question: str | None = None
    dictionary_vocabulary_note: str | None = None
    dictionary_provider_ref: str | None = None
    learner_memory: tuple[tuple[str, str], ...] = ()


@dataclass(frozen=True, slots=True)
class ExpressionReviewRequest:
    workflow_run_id: str
    task_id: str
    content_version_id: str
    draft: str
    recent_assets: tuple[tuple[str, str], ...] = ()


@dataclass(frozen=True, slots=True)
class ExpressionAssistRequest:
    workflow_run_id: str
    task_id: str
    input_attempt_version_id: str
    content_version_id: str
    chinese_intent: str
    learner_draft: str
    situation: str
    audience: str
    purpose: str
    target_argument_move: str
    generation_index: int
    previous_candidate: str | None = None
    recent_assets: tuple[tuple[str, str], ...] = ()


@dataclass(frozen=True, slots=True)
class ModelAdapterResponse:
    payload: object
    actual_cost_usd: Decimal
    prompt_version: str | None = None


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


class ExpressionReviewAdapter(Protocol):
    name: str
    is_remote: bool
    estimated_cost_usd: Decimal

    async def generate(self, request: ExpressionReviewRequest) -> ModelAdapterResponse: ...


class ExpressionAssistAdapter(Protocol):
    name: str
    is_remote: bool
    estimated_cost_usd: Decimal

    async def generate(self, request: ExpressionAssistRequest) -> ModelAdapterResponse: ...


class GatewayOutcome(StrEnum):
    VALIDATED_FIXTURE = "validated_fixture"
    VALIDATED_MODEL = "validated_model"
    VALIDATED_LOCAL_RESOURCE = "validated_local_resource"
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
            GatewayOutcome.VALIDATED_LOCAL_RESOURCE,
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
        intensive = request.analysis_mode == "intensive_reading"
        evidence_quote = request.selected_text.strip()[:240]
        return ModelAdapterResponse(
            payload={
                "schema_version": "1.3.0" if intensive else "1.1.0",
                "selection_scope": request.selection_scope,
                "focus": request.fallback_focus,
                "translation": request.fallback_translation,
                "vocabulary_note": request.fallback_vocabulary_note,
                "grammar_structure": list(request.fallback_grammar_structure),
                "translation_review": (
                    {
                        "summary": (
                            "已记录你的译文; 当前本地分析只提供核对步骤, 暂不把译文差异判定为错误。"
                        ),
                        "strengths": [],
                        "issues": [],
                    }
                    if intensive
                    else None
                ),
                "knowledge_cards": [],
                "follow_up_answer": (
                    {
                        "answer": (
                            "当前没有足够可靠的模型结果继续判断这处问题。"
                            "请先回到原句核对词序、成分边界和修饰关系。"
                        ),
                        "evidence_quotes": [evidence_quote] if evidence_quote else [],
                        "next_questions": ["这处判断能否直接回到原句范围验证?"],
                    }
                    if request.follow_up_question
                    else None
                ),
                "diagnosis": request.fallback_diagnosis,
                "breakdown": list(request.fallback_breakdown),
                "next_check": request.fallback_next_check,
                "evidence_quote": request.selected_text.strip()[:240],
                "answer_text": None,
            },
            actual_cost_usd=Decimal("0"),
        )


class DeterministicExpressionReviewAdapter:
    name = "deterministic_fixture"
    is_remote = False
    estimated_cost_usd = Decimal("0")

    async def generate(self, request: ExpressionReviewRequest) -> ModelAdapterResponse:
        draft = request.draft.strip()
        versions = _conservative_expression_versions(draft)
        return ModelAdapterResponse(
            payload={
                "schema_version": "1.0.0",
                "original_quote": draft[:500],
                "thinking_difference": (
                    "先对照三种写作目标观察信息顺序、逻辑连接和句子密度, "
                    "再选择最值得亲自重写的一处。"
                ),
                "versions": [version.model_dump() for version in versions],
            },
            actual_cost_usd=Decimal("0"),
        )


class DeterministicExpressionAssistAdapter:
    name = "deterministic_fixture"
    is_remote = False
    estimated_cost_usd = Decimal("0")

    async def generate(self, request: ExpressionAssistRequest) -> ModelAdapterResponse:
        variant = "Another natural way to express this idea is to make the main point explicit."
        if request.generation_index == 1:
            variant = "A natural English expression should state the main point clearly."
        return ModelAdapterResponse(
            payload={
                "schema_version": "1.0.0",
                "recommended_expression": variant,
                "context_fit": "The wording is direct enough for the current audience and purpose.",
                "usage_notes": [
                    "Use a direct subject and verb instead of translating each Chinese word.",
                    "Keep the original meaning without adding a new claim.",
                ],
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
        except ModelBalanceError:
            raise
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
            prompt_version=response.prompt_version or self.prompt_version,
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
    sentence_components: tuple[tuple[str, int, int, str, str], ...]
    grammar_points: tuple[tuple[str, str], ...]
    collocations: tuple[tuple[str, str], ...]
    familiar_word_senses: tuple[tuple[str, str], ...]
    translation_review: TranslationReviewOutput | None
    knowledge_cards: tuple[KnowledgeCardOutput, ...]
    follow_up_answer: FollowUpAnswerOutput | None
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
            GatewayOutcome.VALIDATED_LOCAL_RESOURCE,
        }


class AnnotationAnalysisGateway:
    prompt_version = "prompt_annotation_confusion_analysis_v3"

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
        if (
            request.selection_scope == "word_or_phrase"
            and request.dictionary_vocabulary_note is not None
            and request.dictionary_provider_ref is not None
        ):
            return self._dictionary_result(request)
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
        except ModelBalanceError:
            raise
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
        if request.selection_scope == "word_or_phrase":
            output_has_primary_help = output.vocabulary_note is not None
        elif request.analysis_mode == "intensive_reading":
            # Intensive reading deliberately allows every recognition category to be empty.
            # A reference translation is enough to validate the response after the learner's
            # own translation and component marks have already passed the API gate.
            output_has_primary_help = (
                output.translation is not None and output.translation_review is not None
            )
        else:
            output_has_primary_help = (
                output.translation is not None and len(output.grammar_structure) > 0
            )
        follow_up_matches = (
            request.follow_up_question is None or output.follow_up_answer is not None
        )
        if (
            not output_matches_scope
            or (self._adapter.is_remote and not output_has_primary_help)
            or (self._adapter.is_remote and not follow_up_matches)
        ):
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
                *(
                    f"{item.role}:{item.text_quote}:{item.explanation}"
                    for item in output.sentence_components
                ),
                *(
                    f"grammar:{item.text_quote}:{item.explanation}"
                    for item in output.grammar_points
                ),
                *(
                    f"collocation:{item.text_quote}:{item.explanation}"
                    for item in output.collocations
                ),
                *(
                    f"sense:{item.text_quote}:{item.explanation}"
                    for item in output.familiar_word_senses
                ),
                *(
                    f"translation-issue:{item.kind}:{item.source_quote}:{item.explanation}"
                    for item in (
                        output.translation_review.issues if output.translation_review else []
                    )
                ),
                *(
                    f"knowledge:{item.category}:{item.source_quote}:{item.rule}"
                    for item in output.knowledge_cards
                ),
                output.follow_up_answer.answer if output.follow_up_answer else "",
                output.diagnosis,
                *output.breakdown,
                output.next_check,
            ]
        )
        sentence_components = tuple(
            (item.role, item.start, item.end, item.text_quote, item.explanation)
            for item in output.sentence_components
            if item.end <= len(request.selected_text)
            and request.selected_text[item.start : item.end] == item.text_quote
        )

        def anchored(
            items: list[AnchoredSentenceInsightOutput],
        ) -> tuple[tuple[str, str], ...]:
            return tuple(
                (item.text_quote, item.explanation)
                for item in items
                if item.text_quote in request.selected_text
            )

        translation_review = output.translation_review
        if translation_review is not None:
            translation_review = translation_review.model_copy(
                update={
                    "issues": [
                        item
                        for item in translation_review.issues
                        if item.source_quote in request.selected_text
                    ]
                }
            )
        knowledge_cards = tuple(
            item for item in output.knowledge_cards if item.source_quote in request.selected_text
        )
        follow_up_answer = output.follow_up_answer
        if follow_up_answer is not None:
            follow_up_answer = follow_up_answer.model_copy(
                update={
                    "evidence_quotes": [
                        quote
                        for quote in follow_up_answer.evidence_quotes
                        if quote in request.selected_text
                    ]
                }
            )

        return AnnotationAnalysisResult(
            adapter=self._adapter.name,
            prompt_version=response.prompt_version or self.prompt_version,
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
            sentence_components=sentence_components,
            grammar_points=anchored(output.grammar_points),
            collocations=anchored(output.collocations),
            familiar_word_senses=anchored(output.familiar_word_senses),
            translation_review=translation_review,
            knowledge_cards=knowledge_cards,
            follow_up_answer=follow_up_answer,
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

    def _dictionary_result(
        self,
        request: AnnotationAnalysisRequest,
    ) -> AnnotationAnalysisResult:
        note = request.dictionary_vocabulary_note
        provider_ref = request.dictionary_provider_ref
        assert note is not None
        assert provider_ref is not None
        evidence_quote = request.selected_text.strip()[:240]
        evidence_start = request.paragraph_context.find(evidence_quote)
        serialized = "\n".join(
            [
                "vocabulary",
                request.selection_scope,
                note,
                request.fallback_diagnosis,
                *request.fallback_breakdown,
                request.fallback_next_check,
            ]
        )
        return AnnotationAnalysisResult(
            adapter="netem_5530_dictionary",
            prompt_version=provider_ref,
            outcome=GatewayOutcome.VALIDATED_LOCAL_RESOURCE,
            reason_code="annotation_analysis_dictionary_hit",
            focus="vocabulary",
            selection_scope=request.selection_scope,
            translation=None,
            vocabulary_note=note,
            grammar_structure=(),
            sentence_components=(),
            grammar_points=(),
            collocations=(),
            familiar_word_senses=(),
            translation_review=None,
            knowledge_cards=(),
            follow_up_answer=None,
            diagnosis=request.fallback_diagnosis,
            breakdown=request.fallback_breakdown,
            next_check=request.fallback_next_check,
            output_hash=self._hash(serialized),
            used_remote_call=False,
            estimated_cost_usd=Decimal("0"),
            actual_cost_usd=Decimal("0"),
            latency_ms=0,
            evidence_start=evidence_start if evidence_start >= 0 else None,
            evidence_end=(evidence_start + len(evidence_quote) if evidence_start >= 0 else None),
            evidence_hash=(self._hash(evidence_quote) if evidence_start >= 0 else None),
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
                request.follow_up_question or "",
            ]
        )
        translation_review = (
            TranslationReviewOutput(
                summary="已记录你的译文; 当前降级结果只提供核对步骤, 暂不把译文差异判定为错误。",
                strengths=[],
                issues=[],
            )
            if request.analysis_mode == "intensive_reading"
            else None
        )
        evidence_quote = request.selected_text.strip()[:240]
        target_label = request.follow_up_target_label or "这个问题"
        follow_up_answer = (
            FollowUpAnswerOutput(
                answer=(
                    f"当前没有足够可靠的模型结果进一步判断“{target_label}”。"
                    "请先依据下方原句范围核对成分边界和修饰关系。"
                ),
                evidence_quotes=[evidence_quote] if evidence_quote else [],
                next_questions=["这处判断能否直接回到原句的词序和范围验证?"],
            )
            if request.follow_up_question
            else None
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
            sentence_components=(),
            grammar_points=(),
            collocations=(),
            familiar_word_senses=(),
            translation_review=translation_review,
            knowledge_cards=(),
            follow_up_answer=follow_up_answer,
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


@dataclass(frozen=True, slots=True)
class ExpressionReviewResult:
    adapter: str
    prompt_version: str
    outcome: GatewayOutcome
    reason_code: str
    thinking_difference: str
    versions: tuple[ExpressionStyleVersionOutput, ...]
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


@dataclass(frozen=True, slots=True)
class ExpressionAssistResult:
    adapter: str
    prompt_version: str
    outcome: GatewayOutcome
    reason_code: str
    recommended_expression: str | None
    context_fit: str | None
    usage_notes: tuple[str, ...]
    output_hash: str
    used_remote_call: bool
    estimated_cost_usd: Decimal
    actual_cost_usd: Decimal
    latency_ms: int
    rejection_code: str | None

    @property
    def used_fallback(self) -> bool:
        return self.outcome not in {
            GatewayOutcome.VALIDATED_FIXTURE,
            GatewayOutcome.VALIDATED_MODEL,
        }


class ExpressionAssistGateway:
    prompt_version = "prompt_expression_chinese_assist_v1"

    def __init__(
        self,
        adapter: ExpressionAssistAdapter,
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
        request: ExpressionAssistRequest,
        budget: ModelBudget,
    ) -> ExpressionAssistResult:
        if request.generation_index < 1:
            raise ValueError("generation index must be positive")
        if self._adapter.is_remote and not self._allow_remote:
            return self._fallback("remote_model_calls_disabled")
        if self._adapter.is_remote and (
            evaluate_model_budget(budget, self._adapter.estimated_cost_usd)
            is BudgetDecision.USE_DETERMINISTIC_FALLBACK
        ):
            return self._fallback("model_budget_exhausted")

        started = perf_counter()
        try:
            response = await asyncio.wait_for(
                self._adapter.generate(request),
                timeout=self._timeout_seconds,
            )
        except TimeoutError:
            return self._fallback(
                "model_timeout",
                latency_ms=self._latency_ms(started),
                remote_attempted=self._adapter.is_remote,
            )
        except ModelBalanceError:
            raise
        except Exception:
            return self._fallback(
                "model_adapter_error",
                latency_ms=self._latency_ms(started),
                remote_attempted=self._adapter.is_remote,
            )

        latency_ms = self._latency_ms(started)
        if not response.actual_cost_usd.is_finite() or response.actual_cost_usd < 0:
            return self._fallback(
                "negative_model_cost",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
            )
        try:
            output = ExpressionAssistOutput.model_validate(response.payload)
        except ValidationError:
            return self._fallback(
                "model_output_schema_invalid",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
                actual_cost_usd=response.actual_cost_usd,
            )
        serialized = "\n".join(
            (output.recommended_expression, output.context_fit, *output.usage_notes)
        )
        return ExpressionAssistResult(
            adapter=self._adapter.name,
            prompt_version=response.prompt_version or self.prompt_version,
            outcome=(
                GatewayOutcome.VALIDATED_MODEL
                if self._adapter.is_remote
                else GatewayOutcome.VALIDATED_FIXTURE
            ),
            reason_code=(
                "expression_chinese_assist_model_validated"
                if self._adapter.is_remote
                else "expression_chinese_assist_fixture"
            ),
            recommended_expression=output.recommended_expression,
            context_fit=output.context_fit,
            usage_notes=tuple(output.usage_notes),
            output_hash=self._hash(serialized),
            used_remote_call=self._adapter.is_remote,
            estimated_cost_usd=self._adapter.estimated_cost_usd,
            actual_cost_usd=response.actual_cost_usd,
            latency_ms=latency_ms,
            rejection_code=None,
        )

    def _fallback(
        self,
        rejection_code: str,
        *,
        latency_ms: int = 0,
        remote_attempted: bool = False,
        actual_cost_usd: Decimal | None = None,
    ) -> ExpressionAssistResult:
        outcome_by_rejection = {
            "remote_model_calls_disabled": GatewayOutcome.REMOTE_DISABLED_FALLBACK,
            "model_budget_exhausted": GatewayOutcome.BUDGET_FALLBACK,
            "model_timeout": GatewayOutcome.TIMEOUT_FALLBACK,
            "model_adapter_error": GatewayOutcome.ADAPTER_ERROR_FALLBACK,
        }
        cost = (
            actual_cost_usd
            if actual_cost_usd is not None
            else self._adapter.estimated_cost_usd
            if remote_attempted
            else Decimal("0")
        )
        return ExpressionAssistResult(
            adapter=self._adapter.name,
            prompt_version=self.prompt_version,
            outcome=outcome_by_rejection.get(
                rejection_code,
                GatewayOutcome.INVALID_OUTPUT_FALLBACK,
            ),
            reason_code="expression_chinese_assist_unavailable",
            recommended_expression=None,
            context_fit=None,
            usage_notes=(),
            output_hash=self._hash(rejection_code),
            used_remote_call=remote_attempted,
            estimated_cost_usd=self._adapter.estimated_cost_usd,
            actual_cost_usd=cost,
            latency_ms=latency_ms,
            rejection_code=rejection_code,
        )

    @staticmethod
    def _latency_ms(started: float) -> int:
        return max(0, round((perf_counter() - started) * 1000))

    @staticmethod
    def _hash(value: str) -> str:
        return sha256(value.encode("utf-8")).hexdigest()


class ExpressionReviewGateway:
    prompt_version = "prompt_expression_style_review_v1"

    def __init__(
        self,
        adapter: ExpressionReviewAdapter,
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
        request: ExpressionReviewRequest,
        budget: ModelBudget,
    ) -> ExpressionReviewResult:
        fallback_reason: str | None = None
        if self._adapter.is_remote and not self._allow_remote:
            fallback_reason = "remote_model_calls_disabled"
        elif self._adapter.is_remote and (
            evaluate_model_budget(budget, self._adapter.estimated_cost_usd)
            is BudgetDecision.USE_DETERMINISTIC_FALLBACK
        ):
            fallback_reason = "model_budget_exhausted"
        if fallback_reason:
            return self._fallback(request, fallback_reason)

        started = perf_counter()
        try:
            response = await asyncio.wait_for(
                self._adapter.generate(request),
                timeout=self._timeout_seconds,
            )
        except TimeoutError:
            return self._fallback(
                request,
                "model_timeout",
                latency_ms=self._latency_ms(started),
                remote_attempted=self._adapter.is_remote,
            )
        except ModelBalanceError:
            raise
        except Exception:
            return self._fallback(
                request,
                "model_adapter_error",
                latency_ms=self._latency_ms(started),
                remote_attempted=self._adapter.is_remote,
            )

        latency_ms = self._latency_ms(started)
        try:
            output = ExpressionReviewOutput.model_validate(response.payload)
        except ValidationError:
            return self._fallback(
                request,
                "model_output_schema_invalid",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
                actual_cost_usd=response.actual_cost_usd,
            )
        styles = {version.style for version in output.versions}
        evidence_start = request.draft.find(output.original_quote)
        if styles != {"logic_mirror", "academic", "news"} or evidence_start < 0:
            return self._fallback(
                request,
                "model_expression_review_mismatch",
                latency_ms=latency_ms,
                remote_attempted=self._adapter.is_remote,
                actual_cost_usd=response.actual_cost_usd,
            )
        serialized = self._serialize(output.thinking_difference, tuple(output.versions))
        return ExpressionReviewResult(
            adapter=self._adapter.name,
            prompt_version=response.prompt_version or self.prompt_version,
            outcome=(
                GatewayOutcome.VALIDATED_MODEL
                if self._adapter.is_remote
                else GatewayOutcome.VALIDATED_FIXTURE
            ),
            reason_code=(
                "expression_review_model_validated"
                if self._adapter.is_remote
                else "expression_review_fixture"
            ),
            thinking_difference=output.thinking_difference,
            versions=tuple(output.versions),
            output_hash=self._hash(serialized),
            used_remote_call=self._adapter.is_remote,
            estimated_cost_usd=self._adapter.estimated_cost_usd,
            actual_cost_usd=response.actual_cost_usd,
            latency_ms=latency_ms,
            evidence_start=evidence_start,
            evidence_end=evidence_start + len(output.original_quote),
            evidence_hash=self._hash(output.original_quote),
            rejection_code=None,
        )

    def _fallback(
        self,
        request: ExpressionReviewRequest,
        rejection_code: str,
        *,
        latency_ms: int = 0,
        remote_attempted: bool = False,
        actual_cost_usd: Decimal | None = None,
    ) -> ExpressionReviewResult:
        draft = request.draft.strip()
        versions = _conservative_expression_versions(draft)
        thinking_difference = (
            "先对照三种写作目标观察信息顺序、逻辑连接和句子密度, 再选择最值得亲自重写的一处。"
        )
        conservative_cost = (
            actual_cost_usd
            if actual_cost_usd is not None
            else self._adapter.estimated_cost_usd
            if remote_attempted
            else Decimal("0")
        )
        return ExpressionReviewResult(
            adapter=self._adapter.name,
            prompt_version=self.prompt_version,
            outcome=GatewayOutcome.INVALID_OUTPUT_FALLBACK,
            reason_code="expression_review_fallback",
            thinking_difference=thinking_difference,
            versions=versions,
            output_hash=self._hash(self._serialize(thinking_difference, versions)),
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
    def _serialize(
        thinking_difference: str,
        versions: tuple[ExpressionStyleVersionOutput, ...],
    ) -> str:
        return "\n".join(
            [
                thinking_difference,
                *(
                    f"{version.style}\n{version.text}\n{' | '.join(version.explanation)}"
                    for version in versions
                ),
            ]
        )

    @staticmethod
    def _latency_ms(started: float) -> int:
        return max(0, round((perf_counter() - started) * 1000))

    @staticmethod
    def _hash(value: str) -> str:
        return sha256(value.encode("utf-8")).hexdigest()
