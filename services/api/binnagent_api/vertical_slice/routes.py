# ruff: noqa: RUF001

import json
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from hashlib import sha256
from typing import Annotated, Any
from uuid import uuid4

import sqlalchemy as sa
from binnagent_agent import (
    AnnotationAnalysisGateway,
    ExpressionAssistGateway,
    ExpressionReviewGateway,
    GatewayOutcome,
    ModelBudget,
    PriorityFeedbackGateway,
    PriorityFeedbackRequest,
)
from binnagent_agent import (
    AnnotationAnalysisRequest as GatewayAnnotationAnalysisRequest,
)
from binnagent_agent import ExpressionAssistRequest as GatewayExpressionAssistRequest
from binnagent_agent import (
    ExpressionReviewRequest as GatewayExpressionReviewRequest,
)
from binnagent_agent.memory import MemoryAccessContext, MemoryQuery, MemoryRecord
from binnagent_agent.tools import (
    ToolActorType,
    ToolContext,
    ToolExecutor,
    ToolResult,
    ToolStatus,
    runtime_registry,
)
from binnagent_agent.workflows.context_lab import ContextLabWorkflow
from binnagent_agent.workflows.expression_lab import ExpressionLabWorkflow
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.aggregate import LearningTask, Transition
from binnagent_domain.vertical_slice.commands import (
    AddAnnotation,
    CompleteTask,
    EndTaskEarly,
    PauseTask,
    RecordIntervention,
    RecordRevision,
    RemoveAnnotation,
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
from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.agent_memory import obsidian_memory
from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.database import get_engine
from binnagent_api.learner_auth import LearnerIdentity
from binnagent_api.learner_level_service import enqueue_level_assessment
from binnagent_api.model_adapters import (
    annotation_analysis_adapter,
    expression_assist_adapter,
    expression_review_adapter,
    priority_feedback_adapter,
)
from binnagent_api.model_tool_runtime import SqlAlchemyModelToolRuntime
from binnagent_api.personalized_reading_content import (
    approved_hint as personalized_approved_hint,
)
from binnagent_api.personalized_reading_content import (
    expression_item_for_task as personalized_expression_item_for_task,
)
from binnagent_api.personalized_reading_content import (
    grammar_challenge as personalized_grammar_challenge,
)
from binnagent_api.personalized_reading_content import (
    learner_item as personalized_learner_item,
)
from binnagent_api.personalized_reading_content import (
    material_ref as personalized_material_ref,
)
from binnagent_api.personalized_reading_content import (
    material_row_for_task,
)
from binnagent_api.personalized_reading_content import (
    paragraph_text as personalized_paragraph_text,
)
from binnagent_api.personalized_reading_content import (
    validate_span as personalized_validate_span,
)
from binnagent_api.settings import get_settings
from binnagent_api.tool_audit import SqlAlchemyToolAuditPort
from binnagent_api.tool_policy import SqlAlchemyToolPolicyPort
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
    ExpressionAssistRequest,
    ExpressionAssistView,
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
    MaterialFeedbackRequest,
    MaterialFeedbackView,
    RemoveAnnotationRequest,
    RevisionRequest,
    RevisionView,
    VersionedCommandRequest,
)
from binnagent_api.vocabulary_dictionary import (
    netem_vocabulary_dictionary,
    record_vocabulary_learning,
)

learner_router = APIRouter(prefix="/v1", tags=["vertical-slice"])
control_router = APIRouter(prefix="/v1", tags=["vertical-slice-control"])
repository = VerticalSliceRepository()
content_catalog = LocalContentCatalog()
tool_executor = ToolExecutor(runtime_registry)
IdempotencyKey = Annotated[
    str,
    Header(alias="Idempotency-Key", min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_.:-]+$"),
]


def _model_tool_context(
    *,
    task: LearningTask,
    learner_id: str,
    expected_task_version: int,
    tool_name: str,
    request_digest: str,
    timeout_seconds: int,
    idempotency_key: str | None = None,
) -> ToolContext:
    invocation_key = sha256(
        ":".join(
            (
                tool_name,
                task.workflow_run_id,
                task.task_id,
                str(expected_task_version),
                request_digest,
            )
        ).encode("utf-8")
    ).hexdigest()
    return ToolContext(
        trace_id=f"tool_trace_{uuid4().hex}",
        workflow_run_id=task.workflow_run_id,
        task_id=task.task_id,
        learner_id=learner_id,
        actor_type=ToolActorType.LEARNER,
        task_type=task.task_type.value,
        expected_task_version=expected_task_version,
        idempotency_key=idempotency_key,
        invocation_key=invocation_key,
        deadline_at=datetime.now(UTC) + timedelta(seconds=timeout_seconds),
    )


def _require_tool_success(result: ToolResult[object]) -> Any:
    if result.status is not ToolStatus.SUCCEEDED or result.data is None:
        raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, result.reason_codes[0])
    return result.data


async def _recall_agent_memory(
    context: ToolContext,
    *,
    agent_name: str,
    query: str,
    limit: int = 4,
) -> tuple[MemoryRecord, ...]:
    return await obsidian_memory.recall(
        MemoryAccessContext(
            learner_id=context.learner_id,
            agent_name=agent_name,
            invocation_key=context.invocation_key,
            workflow_run_id=context.workflow_run_id,
            task_id=context.task_id,
        ),
        MemoryQuery(text=query, limit=limit),
    )


@learner_router.get("/tasks/{task_id}", response_model=LearnerTaskView)
async def get_task(task_id: str) -> LearnerTaskView:
    async with get_engine().connect() as connection:
        task = await repository.load(connection, task_id)
    return learner_task_view(task)


@learner_router.post(
    "/tasks/{task_id}/material-feedback",
    response_model=MaterialFeedbackView,
)
async def submit_material_feedback(
    request: Request,
    task_id: str,
    body: MaterialFeedbackRequest,
) -> MaterialFeedbackView:
    identity: LearnerIdentity = request.state.learner_identity
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        task = await repository.load(connection, task_id)
        if task.task_type not in {TaskType.CALIBRATION_READING, TaskType.MATCHED_READING}:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "material_feedback_requires_reading_task",
                task.version,
            )
        inserted = await connection.scalar(
            pg_insert(tables.material_feedback_events)
            .values(
                feedback_id=_id("material_feedback"),
                learner_id=identity.learner_id,
                workflow_run_id=task.workflow_run_id,
                task_id=task.task_id,
                content_version_id=task.current_material.content_version_id,
                sentiment=body.sentiment,
                created_at=now,
            )
            .on_conflict_do_nothing(index_elements=[tables.material_feedback_events.c.task_id])
            .returning(tables.material_feedback_events.c.feedback_id)
        )
        row = (
            (
                await connection.execute(
                    sa.select(tables.material_feedback_events).where(
                        tables.material_feedback_events.c.task_id == task.task_id
                    )
                )
            )
            .mappings()
            .one()
        )
        if inserted is not None:
            await enqueue_level_assessment(
                connection,
                learner_id=identity.learner_id,
                workflow_run_id=task.workflow_run_id,
                trigger_kind="material_feedback",
                trigger_key=f"material_feedback:{task.task_id}",
                now=now,
            )
    return MaterialFeedbackView(
        sentiment=str(row["sentiment"]),
        created_at=row["created_at"],
    )


@learner_router.post(
    "/tasks/{task_id}/grammar-challenge/hint",
    response_model=GrammarChallengeUpdateView,
)
async def reveal_grammar_hint(task_id: str) -> GrammarChallengeUpdateView:
    async with get_engine().begin() as connection:
        task = await repository.load(connection, task_id)
        challenge = await _reading_grammar_challenge(connection, task)
        state = await reveal_grammar_challenge_hint(
            connection,
            task.task_id,
            task.current_material.content_version_id,
            challenge,
        )
        return await _grammar_challenge_update(connection, task, challenge, state)


@learner_router.post(
    "/tasks/{task_id}/grammar-challenge/answer",
    response_model=GrammarChallengeUpdateView,
)
async def reveal_grammar_answer(task_id: str) -> GrammarChallengeUpdateView:
    async with get_engine().begin() as connection:
        task = await repository.load(connection, task_id)
        challenge = await _reading_grammar_challenge(connection, task)
        state = await reveal_grammar_challenge_answer(
            connection,
            task.task_id,
            task.current_material.content_version_id,
            challenge,
        )
        return await _grammar_challenge_update(
            connection,
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
        challenge = await _reading_grammar_challenge(connection, task)
        state, correct = await verify_grammar_correction(
            connection,
            task.task_id,
            task.current_material.content_version_id,
            challenge,
            body.correction,
        )
        return await _grammar_challenge_update(
            connection,
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
        personalized_row = await material_row_for_task(connection, previous)
        if personalized_row is not None:
            personalized_validate_span(personalized_row, span)
        else:
            content_catalog.validate_span(previous.current_material.content_version_id, span)
        transition = previous.add_annotation(
            AddAnnotation(
                expected_version=body.expected_version,
                annotation_id=_id("annotation"),
                kind=body.kind,
                span=span,
                user_explanation=body.user_explanation,
                analysis_snapshot=(
                    AnnotationAnalysisView.model_validate(body.analysis).model_dump(mode="json")
                    if body.analysis is not None
                    else None
                ),
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
    "/tasks/{task_id}/annotations/{annotation_id}/undo",
    response_model=LearnerTaskView,
)
async def undo_annotation(
    task_id: str,
    annotation_id: str,
    body: RemoveAnnotationRequest,
    idempotency_key: IdempotencyKey,
) -> LearnerTaskView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "remove_annotation")
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        transition = previous.remove_annotation(
            RemoveAnnotation(
                expected_version=body.expected_version,
                annotation_id=annotation_id,
                now=datetime.now(UTC),
            )
        )
        task, replayed = await _save(
            connection,
            previous,
            transition,
            idempotency_key,
            body,
            "remove_annotation",
        )
    return learner_task_view(task, replayed)


@learner_router.post(
    "/tasks/{task_id}/annotations/analyze",
    response_model=AnnotationAnalysisView,
)
async def analyze_annotation(
    task_id: str,
    body: AnnotationAnalysisRequest,
    request: Request,
) -> AnnotationAnalysisView:
    identity: LearnerIdentity = request.state.learner_identity
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
        if body.analysis_mode == "intensive_reading":
            if not body.learner_translation or not body.learner_component_marks:
                raise DomainError(
                    PublicErrorCode.SAVE_NOT_CONFIRMED,
                    "intensive_reading_attempt_required",
                )
            for mark in body.learner_component_marks:
                if (
                    mark.end <= mark.start
                    or mark.end > len(span.text_quote)
                    or span.text_quote[mark.start : mark.end] != mark.text_quote
                ):
                    raise DomainError(
                        PublicErrorCode.SAVE_NOT_CONFIRMED,
                        "intensive_reading_component_span_invalid",
                    )
        elif body.follow_up is not None:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "intensive_reading_follow_up_requires_context",
            )
        content_version_id = task.current_material.content_version_id
        personalized_row = await material_row_for_task(connection, task)
        if personalized_row is not None:
            personalized_validate_span(personalized_row, span)
            paragraph_context = personalized_paragraph_text(personalized_row, span.paragraph_id)
        else:
            content_catalog.validate_span(content_version_id, span)
            paragraph_context = content_catalog.paragraph_text(
                content_version_id, span.paragraph_id
            )
        plan = ContextLabWorkflow().plan_annotation_analysis(
            learner_question=body.learner_question,
            selected_text=span.text_quote,
            paragraph_context=paragraph_context,
        )
        dictionary_entry = (
            netem_vocabulary_dictionary().lookup(span.text_quote)
            if plan.selection_scope == "word_or_phrase"
            else None
        )
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
            timeout_seconds=settings.annotation_analysis_timeout_seconds,
            allow_remote=bool(settings.enable_remote_model_calls),
        )
        if dictionary_entry is not None:
            analysis_cache_variant = dictionary_entry.provider_ref
        elif settings.model_adapter == "deepseek":
            analysis_cache_variant = f"deepseek:{settings.deepseek_chat_model}"
        elif settings.model_adapter == "longcat":
            analysis_cache_variant = f"longcat:{settings.longcat_chat_model}"
        elif settings.model_adapter == "ollama":
            analysis_cache_variant = f"ollama:{settings.ollama_chat_model}"
        else:
            analysis_cache_variant = settings.model_adapter
        request_digest = sha256(
            (
                f"{_request_hash(body)}:netem-5530-v1:intensive-agent-v1:{analysis_cache_variant}"
            ).encode()
        ).hexdigest()

        async def invoke_annotation_model(tool_runtime: ToolContext) -> ToolResult[object]:
            memories = (
                ()
                if dictionary_entry is not None
                else await _recall_agent_memory(
                    tool_runtime,
                    agent_name="reading.analyze_selection.v1",
                    query=f"{span.text_quote}\n{body.learner_question}",
                )
            )
            gateway_result = await gateway.generate(
                GatewayAnnotationAnalysisRequest(
                    workflow_run_id=task.workflow_run_id,
                    task_id=task.task_id,
                    content_version_id=content_version_id,
                    selected_text=span.text_quote,
                    paragraph_context=paragraph_context,
                    selection_scope=plan.selection_scope,
                    learner_question=body.learner_question,
                    analysis_mode=body.analysis_mode,
                    learner_translation=body.learner_translation,
                    learner_component_marks=tuple(
                        (mark.role, mark.start, mark.end, mark.text_quote)
                        for mark in body.learner_component_marks
                    ),
                    follow_up_target_kind=(
                        body.follow_up.target_kind if body.follow_up is not None else None
                    ),
                    follow_up_target_label=(
                        body.follow_up.target_label if body.follow_up is not None else None
                    ),
                    follow_up_target_content=(
                        body.follow_up.target_content if body.follow_up is not None else None
                    ),
                    follow_up_question=(
                        body.follow_up.question if body.follow_up is not None else None
                    ),
                    fallback_focus=plan.fallback_focus,
                    fallback_diagnosis=plan.fallback_diagnosis,
                    fallback_breakdown=plan.fallback_breakdown,
                    fallback_next_check=plan.fallback_next_check,
                    fallback_translation=plan.fallback_translation,
                    fallback_vocabulary_note=plan.fallback_vocabulary_note,
                    fallback_grammar_structure=plan.fallback_grammar_structure,
                    dictionary_vocabulary_note=(
                        dictionary_entry.note if dictionary_entry is not None else None
                    ),
                    dictionary_provider_ref=(
                        dictionary_entry.provider_ref if dictionary_entry is not None else None
                    ),
                    learner_memory=tuple((memory.title, memory.content) for memory in memories),
                ),
                ModelBudget(
                    call_count=int(budget_row["model_call_count"]),
                    cost_usd=Decimal(str(budget_row["cost_usd"])),
                    max_calls=settings.annotation_analysis_max_calls_per_slice,
                    max_cost_usd=settings.annotation_analysis_max_cost_usd_per_slice,
                ),
            )
            return ToolResult(
                status=ToolStatus.SUCCEEDED,
                data=gateway_result,
                used_fallback=gateway_result.used_fallback,
                estimated_cost_usd=gateway_result.estimated_cost_usd,
                actual_cost_usd=gateway_result.actual_cost_usd,
            )

        tool_name = "reading.analyze_selection.v1"
        tool_context = _model_tool_context(
            task=task,
            learner_id=identity.learner_id,
            expected_task_version=body.expected_version,
            tool_name=tool_name,
            request_digest=request_digest,
            timeout_seconds=settings.annotation_analysis_timeout_seconds,
        )
        model_tool_runtime = SqlAlchemyModelToolRuntime(connection)
        cached_response = await model_tool_runtime.reserve(
            context=tool_context,
            tool_name=tool_name,
            request_hash=request_digest,
        )
        if cached_response is not None:
            cached_response["learning_count"] = (
                await record_vocabulary_learning(
                    connection,
                    learner_id=identity.learner_id,
                    entry=dictionary_entry,
                    increment=False,
                )
                if dictionary_entry is not None
                else None
            )
            cached_response.setdefault(
                "analysis_status",
                "review_required" if cached_response.get("source") == "model" else "abstained",
            )
            cached_response.setdefault("confidence", None)
            cached_response.setdefault("provider_ref", None)
            return AnnotationAnalysisView.model_validate(cached_response)

        async def analyze_selection_application(tool_runtime: ToolContext) -> ToolResult[object]:
            gateway_tool_result = await invoke_annotation_model(tool_runtime)
            result = _require_tool_success(gateway_tool_result)
            now = datetime.now(UTC)
            await connection.execute(
                tables.model_invocations.insert().values(
                    invocation_id=_id("model_invocation"),
                    invocation_key=tool_runtime.invocation_key,
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
            learning_count = (
                await record_vocabulary_learning(
                    connection,
                    learner_id=identity.learner_id,
                    entry=dictionary_entry,
                    increment=True,
                )
                if result.outcome is GatewayOutcome.VALIDATED_LOCAL_RESOURCE
                and dictionary_entry is not None
                else None
            )
            response = AnnotationAnalysisView(
                analysis_id=_id("annotation_analysis"),
                analysis_status=(
                    "resolved"
                    if result.outcome is GatewayOutcome.VALIDATED_LOCAL_RESOURCE
                    else (
                        "review_required"
                        if result.outcome is GatewayOutcome.VALIDATED_MODEL
                        else "abstained"
                    )
                ),
                confidence=None,
                provider_ref=(
                    f"dictionary:{result.prompt_version}"
                    if result.outcome is GatewayOutcome.VALIDATED_LOCAL_RESOURCE
                    else (
                        f"model:{result.adapter}:{result.prompt_version}"
                        if result.outcome is GatewayOutcome.VALIDATED_MODEL
                        else None
                    )
                ),
                focus=result.focus,
                selection_scope=result.selection_scope,
                translation=result.translation,
                vocabulary_note=result.vocabulary_note,
                learning_count=learning_count,
                grammar_structure=list(result.grammar_structure),
                sentence_components=[
                    {
                        "role": role,
                        "start": start,
                        "end": end,
                        "text_quote": text_quote,
                        "explanation": explanation,
                    }
                    for role, start, end, text_quote, explanation in result.sentence_components
                ],
                grammar_points=[
                    {"text_quote": text_quote, "explanation": explanation}
                    for text_quote, explanation in result.grammar_points
                ],
                collocations=[
                    {"text_quote": text_quote, "explanation": explanation}
                    for text_quote, explanation in result.collocations
                ],
                familiar_word_senses=[
                    {"text_quote": text_quote, "explanation": explanation}
                    for text_quote, explanation in result.familiar_word_senses
                ],
                translation_review=(
                    result.translation_review.model_dump(mode="json")
                    if result.translation_review is not None
                    else None
                ),
                knowledge_cards=[card.model_dump(mode="json") for card in result.knowledge_cards],
                follow_up_answer=(
                    result.follow_up_answer.model_dump(mode="json")
                    if result.follow_up_answer is not None
                    else None
                ),
                diagnosis=result.diagnosis,
                breakdown=list(result.breakdown),
                next_check=result.next_check,
                source=(
                    "local_dictionary"
                    if result.outcome is GatewayOutcome.VALIDATED_LOCAL_RESOURCE
                    else (
                        "model"
                        if result.outcome is GatewayOutcome.VALIDATED_MODEL
                        else "local_fallback"
                    )
                ),
                reason_code=result.reason_code,
                boundary_note=(
                    "释义来自已冻结的考研5530词典；具体语境义仍需结合原句的词性、搭配和逻辑判断。"
                    if result.outcome is GatewayOutcome.VALIDATED_LOCAL_RESOURCE
                    else (
                        "当前结果尚未经过已冻结词典或句法 Provider 验证, 只能作为分析建议；"
                        "低置信度结果不会写成已确认知识。"
                        if result.outcome is GatewayOutcome.VALIDATED_MODEL
                        else (
                            "当前仅提供分析步骤, 未完成可靠词义或句法解析；不回答题目、不代读全文。"
                        )
                    )
                ),
            )
            await model_tool_runtime.complete(
                context=tool_runtime,
                response_payload=response.model_dump(mode="json"),
                output_hash=result.output_hash,
            )
            return ToolResult(
                status=ToolStatus.SUCCEEDED,
                data=response,
                used_fallback=result.used_fallback,
                estimated_cost_usd=result.estimated_cost_usd,
                actual_cost_usd=result.actual_cost_usd,
                version_before=task.version,
                version_after=task.version,
            )

        tool_result = await tool_executor.execute(
            tool_name,
            tool_context,
            analyze_selection_application,
            payload=body.model_dump(mode="json"),
            usage_port=model_tool_runtime,
            audit_port=SqlAlchemyToolAuditPort(connection),
            policy_port=SqlAlchemyToolPolicyPort(connection),
        )
        return AnnotationAnalysisView.model_validate(_require_tool_success(tool_result))


@learner_router.post(
    "/tasks/{task_id}/expression-lab/chinese-assist",
    response_model=ExpressionAssistView,
)
async def generate_expression_from_chinese(
    task_id: str,
    body: ExpressionAssistRequest,
    request: Request,
    idempotency_key: IdempotencyKey,
) -> ExpressionAssistView:
    identity: LearnerIdentity = request.state.learner_identity
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
                "expression_chinese_assist_expression_only",
            )
        latest_attempt = task.current_attempts[-1] if task.current_attempts else None
        if latest_attempt is None:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "expression_chinese_assist_requires_saved_v1",
            )
        latest_intervention = task.interventions[-1] if task.interventions else None
        unanswered_intervention = (
            latest_intervention
            if latest_intervention is not None
            and latest_intervention.input_attempt_version_id == latest_attempt.attempt_version_id
            else None
        )
        existing_assist = (
            unanswered_intervention
            if unanswered_intervention is not None
            and unanswered_intervention.intervention_type is InterventionType.CANDIDATE_COMPARISON
            and unanswered_intervention.reason_code.startswith("expression_chinese_assist")
            else None
        )
        if unanswered_intervention is not None and existing_assist is None:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "learner_output_required_after_intervention",
            )

        personalized_row = await material_row_for_task(connection, task)
        material = (
            await personalized_expression_item_for_task(connection, task, personalized_row)
            if personalized_row is not None
            else content_catalog.learner_item(task.current_material.content_version_id)
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
        gateway = ExpressionAssistGateway(
            expression_assist_adapter(settings),
            timeout_seconds=settings.expression_review_timeout_seconds,
            allow_remote=bool(settings.enable_remote_model_calls),
        )

        async def invoke_expression_assist(tool_runtime: ToolContext) -> ToolResult[object]:
            memories = await _recall_agent_memory(
                tool_runtime,
                agent_name="expression.generate_from_chinese.v1",
                query=f"{body.chinese_intent}\n{latest_attempt.text}",
            )
            result = await gateway.generate(
                GatewayExpressionAssistRequest(
                    workflow_run_id=task.workflow_run_id,
                    task_id=task.task_id,
                    input_attempt_version_id=latest_attempt.attempt_version_id,
                    content_version_id=task.current_material.content_version_id,
                    chinese_intent=body.chinese_intent,
                    learner_draft=latest_attempt.text,
                    situation=str(material.get("situation", "")),
                    audience=str(material.get("audience", "")),
                    purpose=str(material.get("purpose", "")),
                    target_argument_move=str(material.get("target_argument_move", "")),
                    generation_index=body.generation_index,
                    previous_candidate=body.previous_candidate,
                    recent_assets=tuple(
                        [
                            *((asset.title, asset.content) for asset in body.recent_assets),
                            *((memory.title, memory.content) for memory in memories),
                        ][:12]
                    ),
                ),
                ModelBudget(
                    call_count=int(budget_row["model_call_count"]),
                    cost_usd=Decimal(str(budget_row["cost_usd"])),
                    max_calls=settings.model_max_calls_per_slice,
                    max_cost_usd=settings.model_max_cost_usd_per_slice,
                ),
            )
            return ToolResult(
                status=ToolStatus.SUCCEEDED,
                data=result,
                used_fallback=result.used_fallback,
                estimated_cost_usd=result.estimated_cost_usd,
                actual_cost_usd=result.actual_cost_usd,
            )

        request_digest = _request_hash(body)
        tool_name = "expression.generate_from_chinese.v1"
        tool_context = _model_tool_context(
            task=task,
            learner_id=identity.learner_id,
            expected_task_version=body.expected_version,
            tool_name=tool_name,
            request_digest=request_digest,
            timeout_seconds=settings.expression_review_timeout_seconds,
            idempotency_key=idempotency_key,
        )
        model_tool_runtime = SqlAlchemyModelToolRuntime(connection)
        cached_response = await model_tool_runtime.reserve(
            context=tool_context,
            tool_name=tool_name,
            request_hash=request_digest,
        )
        if cached_response is not None:
            return ExpressionAssistView.model_validate(cached_response)

        async def generate_from_chinese_application(
            tool_runtime: ToolContext,
        ) -> ToolResult[object]:
            gateway_tool_result = await invoke_expression_assist(tool_runtime)
            result = _require_tool_success(gateway_tool_result)
            now = datetime.now(UTC)
            await connection.execute(
                tables.model_invocations.insert().values(
                    invocation_id=_id("model_invocation"),
                    invocation_key=tool_runtime.invocation_key,
                    workflow_run_id=task.workflow_run_id,
                    task_id=task.task_id,
                    input_attempt_version_id=latest_attempt.attempt_version_id,
                    purpose="expression_chinese_assist",
                    adapter=result.adapter,
                    prompt_version=result.prompt_version,
                    outcome=result.outcome.value,
                    is_remote=result.used_remote_call,
                    estimated_cost_usd=result.estimated_cost_usd,
                    actual_cost_usd=result.actual_cost_usd,
                    latency_ms=result.latency_ms,
                    output_hash=result.output_hash,
                    focus="contextual_expression",
                    evidence_start=None,
                    evidence_end=None,
                    evidence_hash=None,
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
            updated_task = task
            side_effect_ids: list[str] = []
            if result.recommended_expression is not None and existing_assist is None:
                transition = task.record_intervention(
                    RecordIntervention(
                        expected_version=body.expected_version,
                        intervention_id=_id("intervention"),
                        input_attempt_version_id=latest_attempt.attempt_version_id,
                        hint_level=3,
                        intervention_type=InterventionType.CANDIDATE_COMPARISON,
                        model_adapter=result.adapter,
                        prompt_version=result.prompt_version,
                        reason_code="expression_chinese_assist_used",
                        delivered_content=result.recommended_expression,
                        result_status=InterventionResult.DELIVERED,
                        now=now,
                    )
                )
                updated_task, _ = await repository.save(
                    connection,
                    task,
                    transition,
                    idempotency_key=idempotency_key,
                    request_hash=request_digest,
                    command_name="learner_requested_expression_chinese_assist",
                    actor=ActorType.SYSTEM,
                )
                side_effect_ids.append(updated_task.interventions[-1].intervention_id)
            generated = result.recommended_expression is not None
            response = ExpressionAssistView(
                generation_id=_id("expression_generation"),
                status="generated" if generated else "unavailable",
                source=(
                    "model"
                    if result.outcome is GatewayOutcome.VALIDATED_MODEL
                    else "local_fixture"
                    if generated
                    else "unavailable"
                ),
                recommended_expression=result.recommended_expression,
                context_fit=result.context_fit,
                usage_notes=list(result.usage_notes),
                reason_code=result.reason_code,
                boundary_note=(
                    "这是结合当前任务、受众、写作目的和你的 V1 给出的局部表达建议。"
                    "它属于 H3 模型帮助，不会记为独立作答；请比较、改写后形成自己的下一版。"
                    if generated
                    else "模型当前不可用，没有用固定模板伪造英文表达；你的 V1 保持不变。"
                ),
                task=learner_task_view(updated_task),
            )
            await model_tool_runtime.complete(
                context=tool_runtime,
                response_payload=response.model_dump(mode="json"),
                output_hash=result.output_hash,
            )
            return ToolResult(
                status=ToolStatus.SUCCEEDED,
                data=response,
                used_fallback=result.used_fallback,
                estimated_cost_usd=result.estimated_cost_usd,
                actual_cost_usd=result.actual_cost_usd,
                version_before=task.version,
                version_after=updated_task.version,
                side_effect_ids=side_effect_ids,
            )

        tool_result = await tool_executor.execute(
            tool_name,
            tool_context,
            generate_from_chinese_application,
            payload=body.model_dump(mode="json"),
            usage_port=model_tool_runtime,
            audit_port=SqlAlchemyToolAuditPort(connection),
            policy_port=SqlAlchemyToolPolicyPort(connection),
        )
        return ExpressionAssistView.model_validate(_require_tool_success(tool_result))


@learner_router.post(
    "/tasks/{task_id}/expression-lab/review",
    response_model=ExpressionReviewView,
)
async def review_expression(
    task_id: str,
    body: ExpressionReviewRequest,
    request: Request,
) -> ExpressionReviewView:
    identity: LearnerIdentity = request.state.learner_identity
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
        gateway = ExpressionReviewGateway(
            expression_review_adapter(settings),
            timeout_seconds=settings.expression_review_timeout_seconds,
            allow_remote=bool(settings.enable_remote_model_calls),
        )

        async def invoke_expression_review(tool_runtime: ToolContext) -> ToolResult[object]:
            memories = await _recall_agent_memory(
                tool_runtime,
                agent_name="expression.review_draft.v1",
                query=body.draft,
            )
            plan = ExpressionLabWorkflow().plan_review(
                draft=body.draft,
                explicit_assets=tuple((asset.title, asset.content) for asset in body.recent_assets),
                recalled_memories=tuple((memory.title, memory.content) for memory in memories),
            )
            gateway_result = await gateway.generate(
                GatewayExpressionReviewRequest(
                    workflow_run_id=task.workflow_run_id,
                    task_id=task.task_id,
                    content_version_id=task.current_material.content_version_id,
                    draft=plan.draft,
                    recent_assets=plan.recent_assets,
                ),
                ModelBudget(
                    call_count=int(budget_row["model_call_count"]),
                    cost_usd=Decimal(str(budget_row["cost_usd"])),
                    max_calls=settings.model_max_calls_per_slice,
                    max_cost_usd=settings.model_max_cost_usd_per_slice,
                ),
            )
            return ToolResult(
                status=ToolStatus.SUCCEEDED,
                data=gateway_result,
                used_fallback=gateway_result.used_fallback,
                estimated_cost_usd=gateway_result.estimated_cost_usd,
                actual_cost_usd=gateway_result.actual_cost_usd,
            )

        request_digest = _request_hash(body)
        tool_name = "expression.review_draft.v1"
        tool_context = _model_tool_context(
            task=task,
            learner_id=identity.learner_id,
            expected_task_version=body.expected_version,
            tool_name=tool_name,
            request_digest=request_digest,
            timeout_seconds=settings.expression_review_timeout_seconds,
        )
        model_tool_runtime = SqlAlchemyModelToolRuntime(connection)
        cached_response = await model_tool_runtime.reserve(
            context=tool_context,
            tool_name=tool_name,
            request_hash=request_digest,
        )
        if cached_response is not None:
            return ExpressionReviewView.model_validate(cached_response)

        async def review_draft_application(tool_runtime: ToolContext) -> ToolResult[object]:
            gateway_tool_result = await invoke_expression_review(tool_runtime)
            result = _require_tool_success(gateway_tool_result)
            now = datetime.now(UTC)
            await connection.execute(
                tables.model_invocations.insert().values(
                    invocation_id=_id("model_invocation"),
                    invocation_key=tool_runtime.invocation_key,
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
            response = ExpressionReviewView(
                review_id=_id("expression_review"),
                source=(
                    "model"
                    if result.outcome is GatewayOutcome.VALIDATED_MODEL
                    else "local_fallback"
                ),
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
            await model_tool_runtime.complete(
                context=tool_runtime,
                response_payload=response.model_dump(mode="json"),
                output_hash=result.output_hash,
            )
            return ToolResult(
                status=ToolStatus.SUCCEEDED,
                data=response,
                used_fallback=result.used_fallback,
                estimated_cost_usd=result.estimated_cost_usd,
                actual_cost_usd=result.actual_cost_usd,
                version_before=task.version,
                version_after=task.version,
            )

        tool_result = await tool_executor.execute(
            tool_name,
            tool_context,
            review_draft_application,
            payload=body.model_dump(mode="json"),
            usage_port=model_tool_runtime,
            audit_port=SqlAlchemyToolAuditPort(connection),
            policy_port=SqlAlchemyToolPolicyPort(connection),
        )
        return ExpressionReviewView.model_validate(_require_tool_success(tool_result))


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
        personalized_row = await material_row_for_task(connection, previous)
        delivered_content = (
            personalized_approved_hint(personalized_row, hint_level)
            if personalized_row is not None
            else content_catalog.approved_reading_hint(
                previous.current_material.content_version_id,
                previous.task_id,
                previous.learner_profile,
                hint_level,
            )
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
    task_id: str,
    body: HintRequest,
    request: Request,
    idempotency_key: IdempotencyKey,
) -> LearnerTaskView:
    identity: LearnerIdentity = request.state.learner_identity
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

        async def invoke_priority_feedback(tool_runtime: ToolContext) -> ToolResult[object]:
            memories = await _recall_agent_memory(
                tool_runtime,
                agent_name="expression.deliver_priority_feedback.v1",
                query=current_attempts[-1].text,
            )
            result = await gateway.generate(
                PriorityFeedbackRequest(
                    workflow_run_id=previous.workflow_run_id,
                    task_id=previous.task_id,
                    input_attempt_version_id=body.input_attempt_version_id,
                    content_version_id=previous.current_material.content_version_id,
                    attempt_text=current_attempts[-1].text,
                    fallback_reason_code=fallback_reason_code,
                    fallback_feedback=fallback_feedback,
                    learner_memory=tuple((memory.title, memory.content) for memory in memories),
                ),
                ModelBudget(
                    call_count=int(budget_row["model_call_count"]),
                    cost_usd=Decimal(str(budget_row["cost_usd"])),
                    max_calls=settings.model_max_calls_per_slice,
                    max_cost_usd=settings.model_max_cost_usd_per_slice,
                ),
            )
            return ToolResult(
                status=ToolStatus.SUCCEEDED,
                data=result,
                used_fallback=result.used_fallback,
                estimated_cost_usd=result.estimated_cost_usd,
                actual_cost_usd=result.actual_cost_usd,
            )

        request_digest = _request_hash(body)
        tool_name = "expression.deliver_priority_feedback.v1"
        tool_context = _model_tool_context(
            task=previous,
            learner_id=identity.learner_id,
            expected_task_version=body.expected_version,
            tool_name=tool_name,
            request_digest=request_digest,
            timeout_seconds=settings.model_timeout_seconds,
            idempotency_key=idempotency_key,
        )
        model_tool_runtime = SqlAlchemyModelToolRuntime(connection)
        cached_response = await model_tool_runtime.reserve(
            context=tool_context,
            tool_name=tool_name,
            request_hash=request_digest,
        )
        if cached_response is not None:
            return LearnerTaskView.model_validate(cached_response)

        async def deliver_priority_feedback_application(
            tool_runtime: ToolContext,
        ) -> ToolResult[object]:
            gateway_tool_result = await invoke_priority_feedback(tool_runtime)
            gateway_result = _require_tool_success(gateway_tool_result)
            now = datetime.now(UTC)
            await connection.execute(
                tables.model_invocations.insert().values(
                    invocation_id=_id("model_invocation"),
                    invocation_key=tool_runtime.invocation_key,
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
                request_hash=request_digest,
                command_name="learner_requested_priority_feedback",
                actor=ActorType.SYSTEM,
            )
            response = learner_task_view(task, replayed)
            await model_tool_runtime.complete(
                context=tool_runtime,
                response_payload=response.model_dump(mode="json"),
                output_hash=gateway_result.output_hash,
            )
            return ToolResult(
                status=ToolStatus.SUCCEEDED,
                data=response,
                used_fallback=gateway_result.used_fallback,
                estimated_cost_usd=gateway_result.estimated_cost_usd,
                actual_cost_usd=gateway_result.actual_cost_usd,
                version_before=previous.version,
                version_after=task.version,
                side_effect_ids=[task.interventions[-1].intervention_id],
            )

        tool_result = await tool_executor.execute(
            tool_name,
            tool_context,
            deliver_priority_feedback_application,
            payload=body.model_dump(mode="json"),
            usage_port=model_tool_runtime,
            audit_port=SqlAlchemyToolAuditPort(connection),
            policy_port=SqlAlchemyToolPolicyPort(connection),
        )
        return LearnerTaskView.model_validate(_require_tool_success(tool_result))


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
        personalized_row = await material_row_for_task(connection, previous)
        current_material = (
            personalized_material_ref(personalized_row)
            if personalized_row is not None
            else content_catalog.current(previous.current_material.content_version_id)
        )
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
            challenge = await _reading_grammar_challenge(connection, previous)
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


async def _reading_grammar_challenge(
    connection: AsyncConnection, task: LearningTask
) -> GrammarChallenge:
    if task.task_type not in {TaskType.CALIBRATION_READING, TaskType.MATCHED_READING}:
        raise DomainError(
            PublicErrorCode.SAVE_NOT_CONFIRMED,
            "grammar_challenge_requires_reading_task",
            task.version,
        )
    personalized_row = await material_row_for_task(connection, task)
    return (
        personalized_grammar_challenge(personalized_row)
        if personalized_row is not None
        else content_catalog.grammar_challenge_for(
            task.task_id,
            task.current_material.content_version_id,
        )
    )


async def _grammar_challenge_update(
    connection: AsyncConnection,
    task: LearningTask,
    challenge: GrammarChallenge,
    state: GrammarChallengeState,
    *,
    verification_correct: bool | None = None,
    feedback: str | None = None,
) -> GrammarChallengeUpdateView:
    personalized_row = await material_row_for_task(connection, task)
    item = (
        personalized_learner_item(personalized_row)
        if personalized_row is not None
        else content_catalog.learner_item(task.current_material.content_version_id)
    )
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
                analysis=(
                    AnnotationAnalysisView.model_validate(item.analysis_snapshot)
                    if item.analysis_snapshot is not None
                    else None
                ),
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


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"
