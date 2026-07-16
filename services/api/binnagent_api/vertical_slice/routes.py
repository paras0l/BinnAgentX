import json
from datetime import UTC, datetime
from hashlib import sha256
from typing import Annotated, Any
from uuid import uuid4

import sqlalchemy as sa
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.aggregate import LearningTask, Transition
from binnagent_domain.vertical_slice.commands import (
    AddAnnotation,
    CompleteTask,
    PauseTask,
    RecordIntervention,
    RecordRevision,
    ReplaceMaterial,
    ResumeTask,
    SaveAttempt,
)
from binnagent_domain.vertical_slice.errors import DomainError
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
from binnagent_api.vertical_slice import tables
from binnagent_api.vertical_slice.content_catalog import LocalContentCatalog
from binnagent_api.vertical_slice.repository import VerticalSliceRepository
from binnagent_api.vertical_slice.schemas import (
    AnnotationRequest,
    AnnotationSpanView,
    AnnotationView,
    AttemptRequest,
    AttemptView,
    ControlReplayView,
    HintRequest,
    InterventionRequest,
    InterventionView,
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
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "learner_requested_h1")
        if replay is not None:
            return learner_task_view(replay, True)
        previous = await repository.load(connection, task_id)
        if previous.task_type is TaskType.MICRO_EXPRESSION:
            raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "reading_h1_only")
        if not previous.current_attempts:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "learner_attempt_required_before_intervention",
            )
        current_attempt_ids = {item.attempt_version_id for item in previous.current_attempts}
        if any(
            item.input_attempt_version_id in current_attempt_ids and item.hint_level == 1
            for item in previous.interventions
        ):
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "h1_already_delivered_for_current_material",
            )
        delivered_content = content_catalog.approved_reading_hint(
            previous.current_material.content_version_id, 1
        )
        transition = previous.record_intervention(
            RecordIntervention(
                expected_version=body.expected_version,
                intervention_id=_id("intervention"),
                input_attempt_version_id=body.input_attempt_version_id,
                hint_level=1,
                intervention_type=InterventionType.TASK_RESTATEMENT,
                model_adapter="approved_content_fixture",
                prompt_version="prompt_reading_h1_v1",
                reason_code="learner_requested_h1",
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
            command_name="learner_requested_h1",
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
        reason_code, delivered_content = content_catalog.approved_expression_feedback(
            previous.current_material.content_version_id,
            current_attempts[-1].text,
        )
        transition = previous.record_intervention(
            RecordIntervention(
                expected_version=body.expected_version,
                intervention_id=_id("intervention"),
                input_attempt_version_id=body.input_attempt_version_id,
                hint_level=2,
                intervention_type=InterventionType.PRIORITY_FEEDBACK,
                model_adapter="approved_content_fixture",
                prompt_version="prompt_expression_priority_feedback_v1",
                reason_code=reason_code,
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
        transition = previous.complete(CompleteTask(body.expected_version, datetime.now(UTC)))
        task, replayed = await _save(
            connection, previous, transition, idempotency_key, body, "complete_task"
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


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"
