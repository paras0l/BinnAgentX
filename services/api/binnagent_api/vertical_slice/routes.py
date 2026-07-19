# ruff: noqa: RUF001

import json
import re
from datetime import UTC, datetime
from decimal import Decimal
from hashlib import sha256
from typing import Annotated, Any, Literal
from uuid import uuid4

import sqlalchemy as sa
from binnagent_agent import (
    AnnotationAnalysisGateway,
    ExpressionReviewGateway,
    GatewayOutcome,
    ModelBudget,
    PriorityFeedbackGateway,
    PriorityFeedbackRequest,
)
from binnagent_agent import (
    AnnotationAnalysisRequest as GatewayAnnotationAnalysisRequest,
)
from binnagent_agent import (
    ExpressionReviewRequest as GatewayExpressionReviewRequest,
)
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.aggregate import LearningTask, Transition
from binnagent_domain.vertical_slice.commands import (
    AddAnnotation,
    CompleteTask,
    EndTaskEarly,
    PauseTask,
    RecordIntervention,
    RecordRevision,
    ReplaceMaterial,
    ResumeTask,
    SaveAttempt,
)
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.grammar_challenge import GrammarChallenge
from binnagent_domain.vertical_slice.models import (
    ActorType,
    InterventionResult,
    InterventionType,
    TaskType,
    TextSpan,
)
from fastapi import APIRouter, Depends, Header

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.database import get_engine
from binnagent_api.model_adapters import (
    annotation_analysis_adapter,
    expression_review_adapter,
    priority_feedback_adapter,
)
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables
from binnagent_api.vertical_slice.content_catalog import LocalContentCatalog
from binnagent_api.vertical_slice.grammar_challenges import (
    GrammarChallengeState,
    grammar_challenge_view,
    load_grammar_challenge_state,
    project_reading_paragraphs,
    reveal_grammar_challenge_answer,
    reveal_grammar_challenge_hint,
    verify_grammar_correction,
)
from binnagent_api.vertical_slice.repository import VerticalSliceRepository
from binnagent_api.vertical_slice.schemas import (
    AnnotationAnalysisRequest,
    AnnotationAnalysisView,
    AnnotationRequest,
    AnnotationSpanView,
    AnnotationView,
    AttemptRequest,
    AttemptView,
    ControlReplayView,
    ExpressionReviewRequest,
    ExpressionReviewView,
    ExpressionStyleVersionView,
    GrammarChallengeUpdateView,
    GrammarCorrectionRequest,
    HintRequest,
    InterventionRequest,
    InterventionView,
    LearnerParagraphView,
    LearnerTaskView,
    RevisionRequest,
    RevisionView,
    VersionedCommandRequest,
)

learner_router = APIRouter(prefix="/v1", tags=["vertical-slice"])
control_router = APIRouter(prefix="/v1", tags=["vertical-slice-control"])
repository = VerticalSliceRepository()
content_catalog = LocalContentCatalog()
IdempotencyKey = Annotated[
    str,
    Header(alias="Idempotency-Key", min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_.:-]+$"),
]


@learner_router.get("/tasks/{task_id}", response_model=LearnerTaskView)
async def get_task(task_id: str) -> LearnerTaskView:
    async with get_engine().connect() as connection:
        task = await repository.load(connection, task_id)
    return learner_task_view(task)


@learner_router.post(
    "/tasks/{task_id}/grammar-challenge/hint",
    response_model=GrammarChallengeUpdateView,
)
async def reveal_grammar_hint(task_id: str) -> GrammarChallengeUpdateView:
    async with get_engine().begin() as connection:
        task = await repository.load(connection, task_id)
        challenge = _reading_grammar_challenge(task)
        state = await reveal_grammar_challenge_hint(
            connection,
            task.task_id,
            task.current_material.content_version_id,
            challenge.challenge_id,
        )
        return _grammar_challenge_update(task, challenge, state)


@learner_router.post(
    "/tasks/{task_id}/grammar-challenge/answer",
    response_model=GrammarChallengeUpdateView,
)
async def reveal_grammar_answer(task_id: str) -> GrammarChallengeUpdateView:
    async with get_engine().begin() as connection:
        task = await repository.load(connection, task_id)
        challenge = _reading_grammar_challenge(task)
        state = await reveal_grammar_challenge_answer(
            connection,
            task.task_id,
            task.current_material.content_version_id,
            challenge,
        )
        return _grammar_challenge_update(
            task,
            challenge,
            state,
            feedback="已放弃本次作答，正确写法和恢复后的原文已显示。",
        )


@learner_router.post(
    "/tasks/{task_id}/grammar-challenge/verify",
    response_model=GrammarChallengeUpdateView,
)
async def verify_grammar_challenge(
    task_id: str,
    body: GrammarCorrectionRequest,
) -> GrammarChallengeUpdateView:
    async with get_engine().begin() as connection:
        task = await repository.load(connection, task_id)
        challenge = _reading_grammar_challenge(task)
        state, correct = await verify_grammar_correction(
            connection,
            task.task_id,
            task.current_material.content_version_id,
            challenge,
            body.correction,
        )
        return _grammar_challenge_update(
            task,
            challenge,
            state,
            verification_correct=correct,
            feedback=(
                "修改正确，文章已恢复为正确原文。"
                if correct
                else "还不正确，文章暂未修改。请结合句子结构再检查一次。"
            ),
        )


@learner_router.post("/tasks/{task_id}/annotations", response_model=LearnerTaskView)
async def add_annotation(
    task_id: str, body: AnnotationRequest, idempotency_key: IdempotencyKey
) -> LearnerTaskView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "add_annotation")
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        span = TextSpan(**body.span.model_dump())
        content_catalog.validate_span(previous.current_material.content_version_id, span)
        transition = previous.add_annotation(
            AddAnnotation(
                expected_version=body.expected_version,
                annotation_id=_id("annotation"),
                kind=body.kind,
                span=span,
                user_explanation=body.user_explanation,
                now=datetime.now(UTC),
            )
        )
        task, replayed = await _save(
            connection,
            previous,
            transition,
            idempotency_key,
            body,
            "add_annotation",
        )
    return learner_task_view(task, replayed)


@learner_router.post(
    "/tasks/{task_id}/annotations/analyze",
    response_model=AnnotationAnalysisView,
)
async def analyze_annotation(
    task_id: str,
    body: AnnotationAnalysisRequest,
) -> AnnotationAnalysisView:
    async with get_engine().begin() as connection:
        task = await repository.load(connection, task_id)
        if body.expected_version != task.version:
            raise DomainError(
                PublicErrorCode.SESSION_CONFLICT,
                "expected_version_mismatch",
                task.version,
            )
        if task.task_type is TaskType.MICRO_EXPRESSION:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "annotation_analysis_reading_only",
            )

        span = TextSpan(**body.span.model_dump())
        content_version_id = task.current_material.content_version_id
        content_catalog.validate_span(content_version_id, span)
        paragraph_context = content_catalog.paragraph_text(content_version_id, span.paragraph_id)
        scope = _selection_scope(span.text_quote, paragraph_context)
        (
            fallback_focus,
            fallback_diagnosis,
            fallback_breakdown,
            fallback_next_check,
            fallback_translation,
            fallback_vocabulary_note,
            fallback_grammar_structure,
        ) = _annotation_analysis_fallback(body.learner_question, span.text_quote, scope)
        settings = get_settings()
        budget_row = (
            (
                await connection.execute(
                    sa.select(
                        tables.workflow_runs.c.model_call_count,
                        tables.workflow_runs.c.cost_usd,
                    ).where(tables.workflow_runs.c.workflow_run_id == task.workflow_run_id)
                )
            )
            .mappings()
            .one()
        )
        gateway = AnnotationAnalysisGateway(
            annotation_analysis_adapter(settings),
            timeout_seconds=settings.model_timeout_seconds,
            allow_remote=bool(settings.enable_remote_model_calls),
        )
        result = await gateway.generate(
            GatewayAnnotationAnalysisRequest(
                workflow_run_id=task.workflow_run_id,
                task_id=task.task_id,
                content_version_id=content_version_id,
                selected_text=span.text_quote,
                paragraph_context=paragraph_context,
                selection_scope=scope,
                learner_question=body.learner_question,
                fallback_focus=fallback_focus,
                fallback_diagnosis=fallback_diagnosis,
                fallback_breakdown=fallback_breakdown,
                fallback_next_check=fallback_next_check,
                fallback_translation=fallback_translation,
                fallback_vocabulary_note=fallback_vocabulary_note,
                fallback_grammar_structure=fallback_grammar_structure,
            ),
            ModelBudget(
                call_count=int(budget_row["model_call_count"]),
                cost_usd=Decimal(str(budget_row["cost_usd"])),
                max_calls=settings.model_max_calls_per_slice,
                max_cost_usd=settings.model_max_cost_usd_per_slice,
            ),
        )
        now = datetime.now(UTC)
        request_digest = _request_hash(body)
        await connection.execute(
            tables.model_invocations.insert().values(
                invocation_id=_id("model_invocation"),
                workflow_run_id=task.workflow_run_id,
                task_id=task.task_id,
                input_attempt_version_id=f"annotation_analysis_{request_digest[:48]}",
                purpose="annotation_confusion_analysis",
                adapter=result.adapter,
                prompt_version=result.prompt_version,
                outcome=result.outcome.value,
                is_remote=result.used_remote_call,
                estimated_cost_usd=result.estimated_cost_usd,
                actual_cost_usd=result.actual_cost_usd,
                latency_ms=result.latency_ms,
                output_hash=result.output_hash,
                focus=result.focus,
                evidence_start=result.evidence_start,
                evidence_end=result.evidence_end,
                evidence_hash=result.evidence_hash,
                rejection_code=result.rejection_code,
                created_at=now,
            )
        )
        if result.used_remote_call:
            await connection.execute(
                tables.workflow_runs.update()
                .where(tables.workflow_runs.c.workflow_run_id == task.workflow_run_id)
                .values(
                    model_call_count=tables.workflow_runs.c.model_call_count + 1,
                    cost_usd=tables.workflow_runs.c.cost_usd + result.actual_cost_usd,
                    updated_at=now,
                )
            )

    return AnnotationAnalysisView(
        analysis_id=_id("annotation_analysis"),
        focus=result.focus,
        selection_scope=result.selection_scope,
        translation=result.translation,
        vocabulary_note=result.vocabulary_note,
        grammar_structure=list(result.grammar_structure),
        diagnosis=result.diagnosis,
        breakdown=list(result.breakdown),
        next_check=result.next_check,
        source=("model" if result.outcome is GatewayOutcome.VALIDATED_MODEL else "local_fallback"),
        reason_code=result.reason_code,
        boundary_note="只解释当前选区，不回答题目；整句翻译不会扩展为全文代读。",
    )


@learner_router.post(
    "/tasks/{task_id}/expression-lab/review",
    response_model=ExpressionReviewView,
)
async def review_expression(
    task_id: str,
    body: ExpressionReviewRequest,
) -> ExpressionReviewView:
    async with get_engine().begin() as connection:
        task = await repository.load(connection, task_id)
        if body.expected_version != task.version:
            raise DomainError(
                PublicErrorCode.SESSION_CONFLICT,
                "expected_version_mismatch",
                task.version,
            )
        if task.task_type is not TaskType.MICRO_EXPRESSION:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "expression_review_expression_only",
            )
        attempt = next(
            (item for item in reversed(task.current_attempts) if item.text == body.draft.strip()),
            None,
        )
        if attempt is None:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "expression_review_saved_attempt_required",
            )

        budget_row = (
            (
                await connection.execute(
                    sa.select(
                        tables.workflow_runs.c.model_call_count,
                        tables.workflow_runs.c.cost_usd,
                    ).where(tables.workflow_runs.c.workflow_run_id == task.workflow_run_id)
                )
            )
            .mappings()
            .one()
        )
        settings = get_settings()
        result = await ExpressionReviewGateway(
            expression_review_adapter(settings),
            timeout_seconds=settings.model_timeout_seconds,
            allow_remote=bool(settings.enable_remote_model_calls),
        ).generate(
            GatewayExpressionReviewRequest(
                workflow_run_id=task.workflow_run_id,
                task_id=task.task_id,
                content_version_id=task.current_material.content_version_id,
                draft=body.draft.strip(),
                recent_assets=tuple((asset.title, asset.content) for asset in body.recent_assets),
            ),
            ModelBudget(
                call_count=int(budget_row["model_call_count"]),
                cost_usd=Decimal(str(budget_row["cost_usd"])),
                max_calls=settings.model_max_calls_per_slice,
                max_cost_usd=settings.model_max_cost_usd_per_slice,
            ),
        )
        now = datetime.now(UTC)
        await connection.execute(
            tables.model_invocations.insert().values(
                invocation_id=_id("model_invocation"),
                workflow_run_id=task.workflow_run_id,
                task_id=task.task_id,
                input_attempt_version_id=attempt.attempt_version_id,
                purpose="expression_style_review",
                adapter=result.adapter,
                prompt_version=result.prompt_version,
                outcome=result.outcome.value,
                is_remote=result.used_remote_call,
                estimated_cost_usd=result.estimated_cost_usd,
                actual_cost_usd=result.actual_cost_usd,
                latency_ms=result.latency_ms,
                output_hash=result.output_hash,
                focus="style_transfer",
                evidence_start=result.evidence_start,
                evidence_end=result.evidence_end,
                evidence_hash=result.evidence_hash,
                rejection_code=result.rejection_code,
                created_at=now,
            )
        )
        if result.used_remote_call:
            await connection.execute(
                tables.workflow_runs.update()
                .where(tables.workflow_runs.c.workflow_run_id == task.workflow_run_id)
                .values(
                    model_call_count=tables.workflow_runs.c.model_call_count + 1,
                    cost_usd=tables.workflow_runs.c.cost_usd + result.actual_cost_usd,
                    updated_at=now,
                )
            )

    return ExpressionReviewView(
        review_id=_id("expression_review"),
        source=("model" if result.outcome is GatewayOutcome.VALIDATED_MODEL else "local_fallback"),
        reason_code=result.reason_code,
        thinking_difference=result.thinking_difference,
        versions=[
            ExpressionStyleVersionView(
                style=version.style,
                label=version.label,
                text=version.text,
                explanation=version.explanation,
            )
            for version in result.versions
        ],
        boundary_note="风格版本用于比较思维与表达差异，不覆盖学习者原文，也不计为独立输出。",
    )


@learner_router.post("/tasks/{task_id}/attempts", response_model=LearnerTaskView)
async def save_attempt(
    task_id: str, body: AttemptRequest, idempotency_key: IdempotencyKey
) -> LearnerTaskView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "save_attempt")
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        transition = previous.save_attempt(
            SaveAttempt(
                expected_version=body.expected_version,
                attempt_version_id=_id("attempt_version"),
                text=body.text,
                independence=body.independence,
                now=datetime.now(UTC),
            )
        )
        task, replayed = await _save(
            connection, previous, transition, idempotency_key, body, "save_attempt"
        )
    return learner_task_view(task, replayed)


@learner_router.post("/tasks/{task_id}/hints/h1", response_model=LearnerTaskView)
async def request_h1_hint(
    task_id: str, body: HintRequest, idempotency_key: IdempotencyKey
) -> LearnerTaskView:
    return await _request_reading_hint(task_id, 1, body, idempotency_key)


@learner_router.post("/tasks/{task_id}/hints/{hint_level}", response_model=LearnerTaskView)
async def request_reading_hint(
    task_id: str,
    hint_level: int,
    body: HintRequest,
    idempotency_key: IdempotencyKey,
) -> LearnerTaskView:
    return await _request_reading_hint(task_id, hint_level, body, idempotency_key)


async def _request_reading_hint(
    task_id: str,
    hint_level: int,
    body: HintRequest,
    idempotency_key: str,
) -> LearnerTaskView:
    if hint_level not in {1, 2, 3, 4}:
        raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "unsupported_reading_hint_level")
    command_name = f"learner_requested_h{hint_level}"
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, command_name)
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        if previous.task_type is TaskType.MICRO_EXPRESSION:
            raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "reading_hint_only")
        if not previous.current_attempts:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "learner_attempt_required_before_intervention",
            )
        expected_level = min(previous.highest_hint_level + 1, 4)
        if hint_level != expected_level or (hint_level == 4 and previous.highest_hint_level == 4):
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "reading_hint_must_escalate_one_level_at_a_time",
            )
        delivered_content = content_catalog.approved_reading_hint(
            previous.current_material.content_version_id,
            previous.task_id,
            previous.learner_profile,
            hint_level,
        )
        intervention_types = {
            1: InterventionType.TASK_RESTATEMENT,
            2: InterventionType.LOCAL_HINT,
            3: InterventionType.CANDIDATE_COMPARISON,
            4: InterventionType.MINIMAL_EXAMPLE,
        }
        transition = previous.record_intervention(
            RecordIntervention(
                expected_version=body.expected_version,
                intervention_id=_id("intervention"),
                input_attempt_version_id=body.input_attempt_version_id,
                hint_level=hint_level,
                intervention_type=intervention_types[hint_level],
                model_adapter="approved_content_fixture",
                prompt_version=f"prompt_reading_h{hint_level}_v1",
                reason_code=command_name,
                delivered_content=delivered_content,
                result_status=InterventionResult.DELIVERED,
                now=datetime.now(UTC),
            )
        )
        task, replayed = await repository.save(
            connection,
            previous,
            transition,
            idempotency_key=idempotency_key,
            request_hash=_request_hash(body),
            command_name=command_name,
            actor=ActorType.SYSTEM,
        )
    return learner_task_view(task, replayed)


@learner_router.post("/tasks/{task_id}/feedback/priority", response_model=LearnerTaskView)
async def request_priority_feedback(
    task_id: str, body: HintRequest, idempotency_key: IdempotencyKey
) -> LearnerTaskView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(
            connection,
            idempotency_key,
            body,
            "learner_requested_priority_feedback",
        )
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        if previous.task_type is not TaskType.MICRO_EXPRESSION:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "priority_feedback_expression_only",
            )
        current_attempts = previous.current_attempts
        if not current_attempts:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "learner_attempt_required_before_intervention",
            )
        if current_attempts[-1].attempt_version_id != body.input_attempt_version_id:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "priority_feedback_must_reference_latest_attempt",
            )
        current_attempt_ids = {item.attempt_version_id for item in current_attempts}
        if any(
            item.input_attempt_version_id in current_attempt_ids
            and item.intervention_type is InterventionType.PRIORITY_FEEDBACK
            for item in previous.interventions
        ):
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "priority_feedback_already_delivered_for_current_material",
            )
        fallback_reason_code, fallback_feedback = content_catalog.approved_expression_feedback(
            previous.current_material.content_version_id,
            current_attempts[-1].text,
        )
        settings = get_settings()
        budget_row = (
            (
                await connection.execute(
                    sa.select(
                        tables.workflow_runs.c.model_call_count,
                        tables.workflow_runs.c.cost_usd,
                    ).where(tables.workflow_runs.c.workflow_run_id == previous.workflow_run_id)
                )
            )
            .mappings()
            .one()
        )
        gateway = PriorityFeedbackGateway(
            priority_feedback_adapter(settings),
            timeout_seconds=settings.model_timeout_seconds,
            allow_remote=bool(settings.enable_remote_model_calls),
        )
        gateway_result = await gateway.generate(
            PriorityFeedbackRequest(
                workflow_run_id=previous.workflow_run_id,
                task_id=previous.task_id,
                input_attempt_version_id=body.input_attempt_version_id,
                content_version_id=previous.current_material.content_version_id,
                attempt_text=current_attempts[-1].text,
                fallback_reason_code=fallback_reason_code,
                fallback_feedback=fallback_feedback,
            ),
            ModelBudget(
                call_count=int(budget_row["model_call_count"]),
                cost_usd=Decimal(str(budget_row["cost_usd"])),
                max_calls=settings.model_max_calls_per_slice,
                max_cost_usd=settings.model_max_cost_usd_per_slice,
            ),
        )
        now = datetime.now(UTC)
        await connection.execute(
            tables.model_invocations.insert().values(
                invocation_id=_id("model_invocation"),
                workflow_run_id=previous.workflow_run_id,
                task_id=previous.task_id,
                input_attempt_version_id=body.input_attempt_version_id,
                purpose="expression_priority_feedback",
                adapter=gateway_result.adapter,
                prompt_version=gateway_result.prompt_version,
                outcome=gateway_result.outcome.value,
                is_remote=gateway_result.used_remote_call,
                estimated_cost_usd=gateway_result.estimated_cost_usd,
                actual_cost_usd=gateway_result.actual_cost_usd,
                latency_ms=gateway_result.latency_ms,
                output_hash=gateway_result.output_hash,
                focus=gateway_result.focus,
                evidence_start=gateway_result.evidence_start,
                evidence_end=gateway_result.evidence_end,
                evidence_hash=gateway_result.evidence_hash,
                rejection_code=gateway_result.rejection_code,
                created_at=now,
            )
        )
        if gateway_result.used_remote_call:
            await connection.execute(
                tables.workflow_runs.update()
                .where(tables.workflow_runs.c.workflow_run_id == previous.workflow_run_id)
                .values(
                    model_call_count=tables.workflow_runs.c.model_call_count + 1,
                    cost_usd=tables.workflow_runs.c.cost_usd + gateway_result.actual_cost_usd,
                    updated_at=now,
                )
            )
        transition = previous.record_intervention(
            RecordIntervention(
                expected_version=body.expected_version,
                intervention_id=_id("intervention"),
                input_attempt_version_id=body.input_attempt_version_id,
                hint_level=2,
                intervention_type=InterventionType.PRIORITY_FEEDBACK,
                model_adapter=gateway_result.adapter,
                prompt_version=gateway_result.prompt_version,
                reason_code=gateway_result.reason_code,
                delivered_content=gateway_result.delivered_content,
                result_status=(
                    InterventionResult.FALLBACK
                    if gateway_result.used_fallback
                    else InterventionResult.DELIVERED
                ),
                now=now,
            )
        )
        task, replayed = await repository.save(
            connection,
            previous,
            transition,
            idempotency_key=idempotency_key,
            request_hash=_request_hash(body),
            command_name="learner_requested_priority_feedback",
            actor=ActorType.SYSTEM,
        )
    return learner_task_view(task, replayed)


@learner_router.post("/tasks/{task_id}/revisions", response_model=LearnerTaskView)
async def record_revision(
    task_id: str, body: RevisionRequest, idempotency_key: IdempotencyKey
) -> LearnerTaskView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "record_revision")
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        transition = previous.record_revision(
            RecordRevision(
                expected_version=body.expected_version,
                revision_event_id=_id("revision_event"),
                from_attempt_version_id=body.from_attempt_version_id,
                to_attempt_version_id=body.to_attempt_version_id,
                intervention_id=body.intervention_id,
                result_status=body.result_status,
                now=datetime.now(UTC),
            )
        )
        task, replayed = await _save(
            connection, previous, transition, idempotency_key, body, "record_revision"
        )
    return learner_task_view(task, replayed)


@learner_router.post("/tasks/{task_id}/material-seen", response_model=LearnerTaskView)
async def report_material_seen(
    task_id: str, body: VersionedCommandRequest, idempotency_key: IdempotencyKey
) -> LearnerTaskView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "report_material_seen")
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        transition = previous.replace_material(
            ReplaceMaterial(
                expected_version=body.expected_version,
                assignment_id=_id("assignment"),
                replacement=content_catalog.replacement_for(
                    previous.task_type,
                    previous.current_material.content_version_id,
                ),
                reason_code="material_seen",
                now=datetime.now(UTC),
            )
        )
        task, replayed = await _save(
            connection,
            previous,
            transition,
            idempotency_key,
            body,
            "report_material_seen",
        )
    return learner_task_view(task, replayed)


@learner_router.post("/tasks/{task_id}/pause", response_model=LearnerTaskView)
async def pause_task(
    task_id: str, body: VersionedCommandRequest, idempotency_key: IdempotencyKey
) -> LearnerTaskView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "pause_task")
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        transition = previous.pause(PauseTask(body.expected_version, datetime.now(UTC)))
        task, replayed = await _save(
            connection, previous, transition, idempotency_key, body, "pause_task"
        )
    return learner_task_view(task, replayed)


@learner_router.post("/tasks/{task_id}/resume", response_model=LearnerTaskView)
async def resume_task(
    task_id: str, body: VersionedCommandRequest, idempotency_key: IdempotencyKey
) -> LearnerTaskView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "resume_task")
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        current_material = content_catalog.current(previous.current_material.content_version_id)
        transition = previous.resume(
            ResumeTask(
                body.expected_version,
                current_material.rights_status.value,
                datetime.now(UTC),
            )
        )
        task, replayed = await _save(
            connection, previous, transition, idempotency_key, body, "resume_task"
        )
    return learner_task_view(task, replayed)


@learner_router.post("/tasks/{task_id}/complete", response_model=LearnerTaskView)
async def complete_task(
    task_id: str, body: VersionedCommandRequest, idempotency_key: IdempotencyKey
) -> LearnerTaskView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "complete_task")
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        if previous.task_type in {TaskType.CALIBRATION_READING, TaskType.MATCHED_READING}:
            challenge = _reading_grammar_challenge(previous)
            challenge_state = await load_grammar_challenge_state(
                connection,
                previous.task_id,
                previous.current_material.content_version_id,
                challenge.challenge_id,
            )
            if not challenge_state.resolved:
                raise DomainError(
                    PublicErrorCode.SAVE_NOT_CONFIRMED,
                    "grammar_challenge_not_resolved",
                    previous.version,
                )
        transition = previous.complete(CompleteTask(body.expected_version, datetime.now(UTC)))
        task, replayed = await _save(
            connection, previous, transition, idempotency_key, body, "complete_task"
        )
    return learner_task_view(task, replayed)


@learner_router.post("/tasks/{task_id}/end-early", response_model=LearnerTaskView)
async def end_task_early(
    task_id: str, body: VersionedCommandRequest, idempotency_key: IdempotencyKey
) -> LearnerTaskView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "end_task_early")
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        transition = previous.end_early(EndTaskEarly(body.expected_version, datetime.now(UTC)))
        task, replayed = await _save(
            connection, previous, transition, idempotency_key, body, "end_task_early"
        )
    return learner_task_view(task, replayed)


@control_router.post("/tasks/{task_id}/interventions", response_model=ControlReplayView)
async def record_intervention(
    task_id: str,
    body: InterventionRequest,
    idempotency_key: IdempotencyKey,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ControlReplayView:
    del identity
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, body.reason_code)
        if replay is not None:
            return await _control_view(connection, replay)
        previous = await repository.load(connection, task_id)
        transition = previous.record_intervention(
            RecordIntervention(
                expected_version=body.expected_version,
                intervention_id=_id("intervention"),
                input_attempt_version_id=body.input_attempt_version_id,
                hint_level=body.hint_level,
                intervention_type=body.intervention_type,
                model_adapter=body.model_adapter,
                prompt_version=body.prompt_version,
                reason_code=body.reason_code,
                delivered_content=body.delivered_content,
                result_status=body.result_status,
                now=datetime.now(UTC),
            )
        )
        task, replayed = await repository.save(
            connection,
            previous,
            transition,
            idempotency_key=idempotency_key,
            request_hash=_request_hash(body),
            command_name=body.reason_code,
            actor=ActorType.DEVELOPER_REVIEWER,
        )
        del replayed
        return await _control_view(connection, task)


@control_router.get("/tasks/{task_id}/replay", response_model=ControlReplayView)
async def get_control_replay(
    task_id: str,
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ControlReplayView:
    async with get_engine().connect() as connection:
        task = await repository.load(connection, task_id)
        return await _control_view(connection, task)


def _reading_grammar_challenge(task: LearningTask) -> GrammarChallenge:
    if task.task_type not in {TaskType.CALIBRATION_READING, TaskType.MATCHED_READING}:
        raise DomainError(
            PublicErrorCode.SAVE_NOT_CONFIRMED,
            "grammar_challenge_requires_reading_task",
            task.version,
        )
    return content_catalog.grammar_challenge_for(
        task.task_id,
        task.current_material.content_version_id,
    )


def _grammar_challenge_update(
    task: LearningTask,
    challenge: GrammarChallenge,
    state: GrammarChallengeState,
    *,
    verification_correct: bool | None = None,
    feedback: str | None = None,
) -> GrammarChallengeUpdateView:
    item = content_catalog.learner_item(task.current_material.content_version_id)
    paragraphs = item.get("paragraphs")
    if not isinstance(paragraphs, list):
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "grammar_challenge_paragraphs_missing",
        )
    return GrammarChallengeUpdateView(
        paragraphs=[
            LearnerParagraphView(paragraph_id=paragraph_id, text=text)
            for paragraph_id, text in project_reading_paragraphs(
                paragraphs,
                challenge,
                state,
            )
        ],
        grammar_challenge=grammar_challenge_view(challenge, state),
        verification_correct=verification_correct,
        feedback=feedback,
    )


async def _save(
    connection: Any,
    previous: LearningTask,
    transition: Transition,
    idempotency_key: str,
    body: Any,
    command_name: str,
) -> tuple[LearningTask, bool]:
    return await repository.save(
        connection,
        previous,
        transition,
        idempotency_key=idempotency_key,
        request_hash=_request_hash(body),
        command_name=command_name,
        actor=ActorType.LEARNER,
    )


async def _find_replay(
    connection: Any,
    idempotency_key: str,
    body: Any,
    command_name: str,
) -> LearningTask | None:
    return await repository.find_replay(
        connection,
        idempotency_key=idempotency_key,
        request_hash=_request_hash(body),
        command_name=command_name,
    )


async def _control_view(connection: Any, task: LearningTask) -> ControlReplayView:
    rows = (
        (
            await connection.execute(
                sa.select(tables.domain_events)
                .where(tables.domain_events.c.aggregate_id == task.task_id)
                .order_by(
                    tables.domain_events.c.aggregate_version,
                    tables.domain_events.c.occurred_at,
                )
            )
        )
        .mappings()
        .all()
    )
    invocation_rows = (
        (
            await connection.execute(
                sa.select(tables.model_invocations)
                .where(tables.model_invocations.c.task_id == task.task_id)
                .order_by(tables.model_invocations.c.created_at)
            )
        )
        .mappings()
        .all()
    )
    return ControlReplayView(
        task_id=task.task_id,
        workflow_run_id=task.workflow_run_id,
        state=task.state.value,
        version=task.version,
        evidence_counts={
            "annotations": len(task.annotations),
            "attempts": len(task.attempts),
            "interventions": len(task.interventions),
            "revisions": len(task.revisions),
        },
        model_invocations=[
            {
                "invocation_id": row["invocation_id"],
                "input_attempt_version_id": row["input_attempt_version_id"],
                "purpose": row["purpose"],
                "adapter": row["adapter"],
                "prompt_version": row["prompt_version"],
                "outcome": row["outcome"],
                "is_remote": row["is_remote"],
                "estimated_cost_usd": row["estimated_cost_usd"],
                "actual_cost_usd": row["actual_cost_usd"],
                "latency_ms": row["latency_ms"],
                "output_hash": row["output_hash"],
                "focus": row["focus"],
                "evidence_start": row["evidence_start"],
                "evidence_end": row["evidence_end"],
                "evidence_hash": row["evidence_hash"],
                "rejection_code": row["rejection_code"],
                "created_at": row["created_at"],
            }
            for row in invocation_rows
        ],
        event_chain=[
            {
                "event_id": row["event_id"],
                "event_type": row["event_type"],
                "aggregate_version": row["aggregate_version"],
                "payload": row["payload"],
                "occurred_at": row["occurred_at"],
            }
            for row in rows
        ],
    )


def learner_task_view(task: LearningTask, replayed: bool = False) -> LearnerTaskView:
    current_annotations = task.current_annotations
    current_attempts = task.current_attempts
    current_attempt_ids = {item.attempt_version_id for item in current_attempts}
    current_interventions = [
        item for item in task.interventions if item.input_attempt_version_id in current_attempt_ids
    ]
    current_revisions = [
        item
        for item in task.revisions
        if item.from_attempt_version_id in current_attempt_ids
        and item.to_attempt_version_id in current_attempt_ids
    ]
    return LearnerTaskView(
        task_id=task.task_id,
        workflow_run_id=task.workflow_run_id,
        task_type=task.task_type.value,
        state=task.state.value,
        version=task.version,
        highest_hint_level=task.highest_hint_level,
        current_content_version_id=task.current_material.content_version_id,
        annotation_count=len(current_annotations),
        annotations=[
            AnnotationView(
                annotation_id=item.annotation_id,
                kind=item.kind.value,
                span=AnnotationSpanView(
                    paragraph_id=item.span.paragraph_id,
                    start=item.span.start,
                    end=item.span.end,
                    text_quote=item.span.text_quote,
                ),
                user_explanation=item.user_explanation,
                created_at=item.created_at,
            )
            for item in current_annotations
        ],
        attempts=[
            AttemptView(
                attempt_version_id=item.attempt_version_id,
                version=item.version,
                text=item.text,
                content_hash=item.content_hash,
                independence=item.independence.value,
                created_at=item.created_at,
            )
            for item in current_attempts
        ],
        interventions=[
            InterventionView(
                intervention_id=item.intervention_id,
                input_attempt_version_id=item.input_attempt_version_id,
                hint_level=item.hint_level,
                intervention_type=item.intervention_type.value,
                reason_code=item.reason_code,
                delivered_content=item.delivered_content,
                content_hash=item.content_hash,
                result_status=item.result_status.value,
                created_at=item.created_at,
            )
            for item in current_interventions
        ],
        revisions=[
            RevisionView(
                revision_event_id=item.revision_event_id,
                from_attempt_version_id=item.from_attempt_version_id,
                to_attempt_version_id=item.to_attempt_version_id,
                intervention_id=item.intervention_id,
                result_status=item.result_status.value,
                created_at=item.created_at,
            )
            for item in current_revisions
        ],
        intervention_count=len(task.interventions),
        revision_count=len(task.revisions),
        completion_gaps=list(task.completion_gaps()),
        replayed=replayed,
    )


def _request_hash(body: Any) -> str:
    value = json.dumps(body.model_dump(mode="json"), ensure_ascii=False, sort_keys=True)
    return sha256(value.encode("utf-8")).hexdigest()


def _annotation_analysis_fallback(
    learner_question: str,
    selected_text: str,
    selection_scope: str,
) -> tuple[str, str, tuple[str, ...], str, str | None, str | None, tuple[str, ...]]:
    normalized = learner_question.lower()
    quote = " ".join(selected_text.split())[:80]
    if selection_scope == "word_or_phrase" or any(
        term in normalized for term in ("词", "搭配", "意思", "word", "meaning")
    ):
        return (
            "vocabulary",
            "这是词或短语级选区，先确认当前语境义、词性和搭配，再放回原句验证。",
            (
                f"先只看选区“{quote}”，判断它在句中承担什么成分。",
                "列出你已知的常见词义，再用前后搭配排除不合语境的一项。",
                "把暂定词义放回原句，检查句意和语气是否同时通顺。",
            ),
            "你现在能否用一个更具体的中文短语替换它，并让前后句仍然连贯？",
            None,
            "先依据词性、固定搭配和上下文缩小语境义，再把候选含义放回原句验证。",
            (),
        )
    if selection_scope == "sentence_or_paragraph" or any(
        term in normalized for term in ("长句", "主干", "结构", "修饰", "从句", "grammar")
    ):
        structure = (
            "主干：先找有限谓语，再确认与它配对的主语和宾语或补语。",
            "从句：用连接词确定名词性、定语或状语从句的边界。",
            "修饰：暂时拿掉介词短语、非谓语和插入成分，再逐层放回。",
        )
        return (
            "syntax",
            "这是句子或段落级选区，应先看完整译意，再用主干、从句和修饰层级解释译意怎样形成。",
            structure,
            "去掉所有修饰后，你能否说出这句话最短的“谁做了什么”？",
            None,
            None,
            structure,
        )
    if any(term in normalized for term in ("指代", "代词", "refer", "this", "they", " it ")):
        return (
            "reference",
            "你的描述指向代词或概念指代不清，需要用语法一致和语义连贯双重验证。",
            (
                f"先定位选区“{quote}”中的指代表达。",
                "向前寻找数、性或概念范围能够匹配的候选对象。",
                "把候选对象逐一代回，排除让逻辑重复或含义断裂的解释。",
            ),
            "哪个候选对象代回后，既符合语法，又能解释作者为什么接着说下一句？",
            None,
            None,
            (),
        )
    if any(term in normalized for term in ("逻辑", "转折", "因果", "关系", "however", "because")):
        return (
            "logic",
            "你的卡点更像是没有确认这处话语与前后内容的逻辑方向。",
            (
                f"先把“{quote}”概括成一个不超过十个字的命题。",
                "寻找转折、因果、递进或举例信号，并确认信号连接的两端。",
                "比较前后两个命题：作者是在支持、限制，还是反驳前一个判断。",
            ),
            "如果删掉连接词，前后两部分最合理的关系仍然是什么？",
            None,
            None,
            (),
        )
    if any(term in normalized for term in ("背景", "语境", "context")):
        return (
            "context",
            "这处困难可能来自省略的背景或概念边界，但先用段内信息建立最低限度理解。",
            (
                f"先记录“{quote}”明确说了什么，不补充文外知识。",
                "从同段寻找定义、例子或对比，确认作者怎样限定这个概念。",
                "只在段内线索仍不足时，再列出需要补查的一个背景问题。",
            ),
            "不用外部知识时，你能从本段确定的最小结论是什么？",
            None,
            None,
            (),
        )
    return (
        "mixed",
        "你已经定位了具体选区，但卡点类型还不够明确；先从结构和上下文各做一次排查。",
        (
            f"先用自己的话复述“{quote}”目前能确定的部分。",
            "标出最不确定的一个词、一个结构或一处逻辑连接，不要同时处理整段。",
            "把这个最小卡点放回前后句，检查它改变的是字面意思还是作者论证。",
        ),
        "如果只能再问一个问题，最能推进理解的是词义、句子主干，还是前后逻辑？",
        None,
        None,
        (),
    )


def _selection_scope(
    selected_text: str,
    paragraph_context: str,
) -> Literal["word_or_phrase", "sentence_or_paragraph"]:
    normalized = selected_text.strip()
    words = re.findall(r"[A-Za-z]+(?:['’-][A-Za-z]+)*", normalized)
    is_short_phrase = len(words) <= 5 and not re.search(r"[.!?;:]", normalized)
    if len(words) <= 1 or is_short_phrase:
        return "word_or_phrase"
    if normalized == paragraph_context.strip() or len(words) >= 28:
        return "sentence_or_paragraph"
    return "sentence_or_paragraph"


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"
