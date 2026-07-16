import json
from datetime import UTC, datetime
from hashlib import sha256
from typing import Annotated
from uuid import uuid4

import sqlalchemy as sa
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.aggregate import LearningTask, Transition
from binnagent_domain.vertical_slice.commands import CreateTask
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.matching import (
    CalibrationObservation,
    ConservativeMaterialMatcher,
    MatchDecision,
)
from binnagent_domain.vertical_slice.models import (
    ActorType,
    LearnerProfileSnapshot,
    MaterialRef,
    TaskState,
    TaskType,
)
from binnagent_domain.vertical_slice.run import (
    AdvanceVerticalSliceRun,
    ApproveCalibrationFallback,
    CompleteVerticalSliceRun,
    CreateVerticalSliceRun,
    RecordDifficultyFeedback,
    ReserveNextTask,
    RunStage,
    RunTransition,
    VerticalSliceRun,
)
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.database import get_engine
from binnagent_api.vertical_slice import tables
from binnagent_api.vertical_slice.content_catalog import LocalContentCatalog
from binnagent_api.vertical_slice.repository import VerticalSliceRepository
from binnagent_api.vertical_slice.routes import learner_task_view
from binnagent_api.vertical_slice.run_repository import VerticalSliceRunRepository
from binnagent_api.vertical_slice.schemas import (
    AdvanceRunRequest,
    CalibrationFallbackRequest,
    ControlRunReplayView,
    CreateRunRequest,
    DifficultyFeedbackRequest,
    LearnerExpressionMaterialView,
    LearnerOutputRequirementView,
    LearnerParagraphView,
    LearnerQuestionOptionView,
    LearnerReadingMaterialView,
    LearnerReadingQuestionView,
    LearnerRunView,
    LearnerWorkspaceView,
    MatchDecisionView,
    NextTaskPlaceholderRequest,
    RunTaskRefView,
)

learner_run_router = APIRouter(prefix="/v1/runs", tags=["vertical-slice-runs"])
control_run_router = APIRouter(prefix="/v1/runs", tags=["vertical-slice-run-control"])
task_repository = VerticalSliceRepository()
run_repository = VerticalSliceRunRepository(task_repository)
content_catalog = LocalContentCatalog()
matcher = ConservativeMaterialMatcher()
RunIdempotencyKey = Annotated[
    str,
    Header(alias="Idempotency-Key", min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_.:-]+$"),
]


@learner_run_router.post("", response_model=LearnerRunView, status_code=201)
async def create_run(body: CreateRunRequest, idempotency_key: RunIdempotencyKey) -> LearnerRunView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "create_run")
        if replay is not None:
            return _run_view(replay, replayed=True)
        now = datetime.now(UTC)
        profile = _profile(body, now)
        run_id = _id("workflow_run")
        task_id = _id("task")
        material = content_catalog.material_at(TaskType.CALIBRATION_READING, 0)
        task_transition = _new_task(run_id, task_id, profile, material, now)
        run_transition = VerticalSliceRun.create(
            CreateVerticalSliceRun(
                workflow_run_id=run_id,
                learner_profile=profile,
                initial_task_id=task_id,
                initial_content_version_id=material.content_version_id,
                now=now,
            )
        )
        run, replayed = await run_repository.create_with_task(
            connection,
            run_transition,
            task_transition,
            idempotency_key=idempotency_key,
            request_hash=_request_hash(body),
            command_name="create_run",
            actor=ActorType.LEARNER,
        )
    return _run_view(run, replayed=replayed)


@learner_run_router.get("/{workflow_run_id}", response_model=LearnerRunView)
async def get_run(workflow_run_id: str) -> LearnerRunView:
    async with get_engine().connect() as connection:
        run = await run_repository.load(connection, workflow_run_id)
    return _run_view(run)


@learner_run_router.get("/{workflow_run_id}/workspace", response_model=LearnerWorkspaceView)
async def get_run_workspace(workflow_run_id: str) -> LearnerWorkspaceView:
    async with get_engine().connect() as connection:
        run = await run_repository.load(connection, workflow_run_id)
        current = run.current_task
        if current is None:
            return LearnerWorkspaceView(run=_run_view(run), task=None, material=None)
        task = await task_repository.load(connection, current.task_id)
        if task.workflow_run_id != run.workflow_run_id:
            raise DomainError(
                PublicErrorCode.SESSION_CONFLICT,
                "workspace_task_run_mismatch",
                run.version,
            )
        material = _material_view(task)
        return LearnerWorkspaceView(
            run=_run_view(run),
            task=learner_task_view(task),
            material=material,
        )


@learner_run_router.post("/{workflow_run_id}/advance", response_model=LearnerRunView)
async def advance_run(
    workflow_run_id: str,
    body: AdvanceRunRequest,
    idempotency_key: RunIdempotencyKey,
) -> LearnerRunView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "advance_run")
        if replay is not None:
            return _run_view(replay, replayed=True)
        run = await run_repository.load(connection, workflow_run_id)
        run.require_version(body.expected_version)
        current_ref = run.current_task
        if current_ref is None:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "run_has_no_current_task_to_advance",
                run.version,
            )
        current_task = await task_repository.load(connection, current_ref.task_id)
        _require_completed_current_task(run, current_task)
        now = datetime.now(UTC)
        next_material, decision = await _next_material(connection, run, current_task, now)
        next_task_transition = None
        next_task_id = None
        next_task_type = None
        if next_material is not None:
            next_task_type = _next_task_type(run.stage)
            next_task_id = _id("task")
            next_task_transition = _new_task(
                run.workflow_run_id,
                next_task_id,
                run.learner_profile,
                next_material,
                now,
                task_type=next_task_type,
            )
        run_transition = run.advance(
            AdvanceVerticalSliceRun(
                expected_version=body.expected_version,
                completed_task_id=current_task.task_id,
                completed_task_version=current_task.version,
                highest_hint_level=current_task.highest_hint_level,
                next_task_id=next_task_id,
                next_task_type=next_task_type,
                next_content_version_id=(
                    next_material.content_version_id if next_material is not None else None
                ),
                match_decision=decision,
                now=now,
            )
        )
        saved, replayed = await run_repository.save_with_task(
            connection,
            run,
            run_transition,
            next_task_transition,
            idempotency_key=idempotency_key,
            request_hash=_request_hash(body),
            command_name="advance_run",
            actor=ActorType.LEARNER,
        )
    return _run_view(saved, replayed=replayed)


@learner_run_router.post("/{workflow_run_id}/difficulty-feedback", response_model=LearnerRunView)
async def record_run_difficulty(
    workflow_run_id: str,
    body: DifficultyFeedbackRequest,
    idempotency_key: RunIdempotencyKey,
) -> LearnerRunView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "record_run_difficulty")
        if replay is not None:
            return _run_view(replay, replayed=True)
        run = await run_repository.load(connection, workflow_run_id)
        transition = run.record_difficulty_feedback(
            RecordDifficultyFeedback(
                expected_version=body.expected_version,
                rating=body.rating,
                skipped=body.skipped,
                now=datetime.now(UTC),
            )
        )
        saved, replayed = await _save_run(
            connection,
            run,
            transition,
            idempotency_key,
            body,
            "record_run_difficulty",
        )
    return _run_view(saved, replayed=replayed)


@learner_run_router.post("/{workflow_run_id}/next-task-placeholder", response_model=LearnerRunView)
async def reserve_run_next_task(
    workflow_run_id: str,
    body: NextTaskPlaceholderRequest,
    idempotency_key: RunIdempotencyKey,
) -> LearnerRunView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "reserve_run_next_task")
        if replay is not None:
            return _run_view(replay, replayed=True)
        run = await run_repository.load(connection, workflow_run_id)
        transition = run.reserve_next_task(
            ReserveNextTask(
                expected_version=body.expected_version,
                placeholder_id=_id("next_task_placeholder"),
                planned_task_type=body.planned_task_type,
                reason_code=body.reason_code,
                now=datetime.now(UTC),
            )
        )
        saved, replayed = await _save_run(
            connection,
            run,
            transition,
            idempotency_key,
            body,
            "reserve_run_next_task",
        )
    return _run_view(saved, replayed=replayed)


@learner_run_router.post("/{workflow_run_id}/complete", response_model=LearnerRunView)
async def complete_run(
    workflow_run_id: str,
    body: AdvanceRunRequest,
    idempotency_key: RunIdempotencyKey,
) -> LearnerRunView:
    async with get_engine().begin() as connection:
        replay = await _find_replay(connection, idempotency_key, body, "complete_run")
        if replay is not None:
            return _run_view(replay, replayed=True)
        run = await run_repository.load(connection, workflow_run_id)
        transition = run.complete(
            CompleteVerticalSliceRun(body.expected_version, datetime.now(UTC))
        )
        saved, replayed = await _save_run(
            connection, run, transition, idempotency_key, body, "complete_run"
        )
    return _run_view(saved, replayed=replayed)


@control_run_router.post(
    "/{workflow_run_id}/calibration-fallback", response_model=ControlRunReplayView
)
async def approve_calibration_fallback(
    workflow_run_id: str,
    body: CalibrationFallbackRequest,
    idempotency_key: RunIdempotencyKey,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ControlRunReplayView:
    del identity
    async with get_engine().begin() as connection:
        command_name = "approve_calibration_fallback"
        replay = await _find_replay(connection, idempotency_key, body, command_name)
        if replay is not None:
            return await _control_run_view(connection, replay, replayed=True)
        run = await run_repository.load(connection, workflow_run_id)
        now = datetime.now(UTC)
        decision = await _match(connection, run, None, now)
        material = content_catalog.material_by_version(decision.selected_content_version_id)
        task_id = _id("task")
        task_transition = _new_task(
            run.workflow_run_id,
            task_id,
            run.learner_profile,
            material,
            now,
            task_type=TaskType.MATCHED_READING,
        )
        transition = run.approve_calibration_fallback(
            ApproveCalibrationFallback(
                expected_version=body.expected_version,
                reason_code=body.reason_code,
                matched_task_id=task_id,
                matched_content_version_id=material.content_version_id,
                match_decision=decision,
                now=now,
            )
        )
        saved, _ = await run_repository.save_with_task(
            connection,
            run,
            transition,
            task_transition,
            idempotency_key=idempotency_key,
            request_hash=_request_hash(body),
            command_name=command_name,
            actor=ActorType.DEVELOPER_REVIEWER,
        )
        return await _control_run_view(connection, saved)


@control_run_router.get("/{workflow_run_id}/replay", response_model=ControlRunReplayView)
async def get_run_replay(
    workflow_run_id: str,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ControlRunReplayView:
    del identity
    async with get_engine().connect() as connection:
        run = await run_repository.load(connection, workflow_run_id)
        return await _control_run_view(connection, run)


async def _next_material(
    connection: AsyncConnection,
    run: VerticalSliceRun,
    current_task: LearningTask,
    now: datetime,
) -> tuple[MaterialRef | None, MatchDecision | None]:
    if run.stage is RunStage.CALIBRATION_A:
        return content_catalog.material_at(TaskType.CALIBRATION_READING, 1), None
    if run.stage is RunStage.CALIBRATION_B:
        decision = await _match(connection, run, current_task, now)
        return content_catalog.material_by_version(decision.selected_content_version_id), decision
    if run.stage is RunStage.MATCHED_READING:
        return content_catalog.paired_expression_for(
            current_task.current_material.content_version_id
        ), None
    if run.stage is RunStage.MICRO_EXPRESSION:
        return None, None
    raise DomainError(
        PublicErrorCode.SAVE_NOT_CONFIRMED,
        "run_stage_has_no_next_material",
        run.version,
    )


async def _match(
    connection: AsyncConnection,
    run: VerticalSliceRun,
    current_task: LearningTask | None,
    now: datetime,
) -> MatchDecision:
    observations: list[CalibrationObservation] = []
    for ref in run.task_refs:
        if ref.role not in {RunStage.CALIBRATION_A, RunStage.CALIBRATION_B}:
            continue
        task = (
            current_task
            if current_task is not None and current_task.task_id == ref.task_id
            else await task_repository.load(connection, ref.task_id)
        )
        if task.state is not TaskState.COMPLETED or not task.current_attempts:
            continue
        observations.append(
            CalibrationObservation(
                task_id=task.task_id,
                content_version_id=task.current_material.content_version_id,
                highest_hint_level=task.highest_hint_level,
                latest_independence=task.current_attempts[-1].independence,
            )
        )
    return matcher.select(
        decision_id=_id("match_decision"),
        profile=run.learner_profile,
        observations=tuple(observations),
        candidates=content_catalog.candidates_for(TaskType.MATCHED_READING),
        now=now,
    )


def _require_completed_current_task(run: VerticalSliceRun, task: LearningTask) -> None:
    if task.workflow_run_id != run.workflow_run_id or task.state is not TaskState.COMPLETED:
        raise DomainError(
            PublicErrorCode.SAVE_NOT_CONFIRMED,
            "current_run_task_is_not_completed",
            run.version,
        )


def _next_task_type(stage: RunStage) -> TaskType:
    mapping = {
        RunStage.CALIBRATION_A: TaskType.CALIBRATION_READING,
        RunStage.CALIBRATION_B: TaskType.MATCHED_READING,
        RunStage.MATCHED_READING: TaskType.MICRO_EXPRESSION,
    }
    task_type = mapping.get(stage)
    if task_type is None:
        raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "no_next_task_type")
    return task_type


def _new_task(
    run_id: str,
    task_id: str,
    profile: LearnerProfileSnapshot,
    material: MaterialRef,
    now: datetime,
    *,
    task_type: TaskType = TaskType.CALIBRATION_READING,
) -> Transition:
    return LearningTask.create(
        CreateTask(
            task_id=task_id,
            workflow_run_id=run_id,
            task_type=task_type,
            learner_profile=profile,
            material=material,
            assignment_id=_id("assignment"),
            now=now,
        )
    )


def _material_view(
    task: LearningTask,
) -> LearnerReadingMaterialView | LearnerExpressionMaterialView:
    item = content_catalog.learner_item(task.current_material.content_version_id)
    if task.task_type in {TaskType.CALIBRATION_READING, TaskType.MATCHED_READING}:
        paragraphs = item.get("paragraphs")
        question = item.get("main_question")
        options = question.get("options") if isinstance(question, dict) else None
        annotations = item.get("allowed_annotations")
        if (
            not isinstance(paragraphs, list)
            or not isinstance(question, dict)
            or not isinstance(options, list)
            or not isinstance(annotations, list)
        ):
            raise DomainError(
                PublicErrorCode.CONTENT_NOT_ELIGIBLE,
                "learner_reading_projection_missing",
            )
        return LearnerReadingMaterialView(
            content_type=(
                "calibration_reading"
                if task.task_type is TaskType.CALIBRATION_READING
                else "matched_reading"
            ),
            content_version_id=task.current_material.content_version_id,
            title=str(item.get("title", "")),
            paragraphs=[
                LearnerParagraphView(
                    paragraph_id=str(part.get("paragraph_id", "")),
                    text=str(part.get("text", "")),
                )
                for part in paragraphs
                if isinstance(part, dict)
            ],
            allowed_annotations=[str(value) for value in annotations],
            question=LearnerReadingQuestionView(
                question_id=str(question.get("question_id", "")),
                prompt=str(question.get("prompt", "")),
                options=[
                    LearnerQuestionOptionView(
                        option_id=str(option.get("option_id", "")),
                        text=str(option.get("text", "")),
                    )
                    for option in options
                    if isinstance(option, dict)
                ],
            ),
        )
    requirement = item.get("output_requirement")
    if not isinstance(requirement, dict):
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "learner_expression_projection_missing",
        )
    forbidden = item.get("forbidden_mechanical_use")
    minimum = item.get("v1_minimum")
    return LearnerExpressionMaterialView(
        content_type="micro_expression",
        content_version_id=task.current_material.content_version_id,
        title=str(item.get("title", "")),
        situation=str(item.get("situation", "")),
        audience=str(item.get("audience", "")),
        purpose=str(item.get("purpose", "")),
        target_argument_move=str(item.get("target_argument_move", "")),
        optional_active_resource=str(item.get("optional_active_resource", "")),
        forbidden_mechanical_use=(
            [str(value) for value in forbidden] if isinstance(forbidden, list) else []
        ),
        output_requirement=LearnerOutputRequirementView(
            sentence_min=int(requirement.get("sentence_min", 0)),
            sentence_max=int(requirement.get("sentence_max", 0)),
            word_min=int(requirement.get("word_min", 0)),
            word_max=int(requirement.get("word_max", 0)),
            language=str(requirement.get("language", "")),
        ),
        v1_minimum=[str(value) for value in minimum] if isinstance(minimum, list) else [],
    )


async def _save_run(
    connection: AsyncConnection,
    previous: VerticalSliceRun,
    transition: RunTransition,
    idempotency_key: str,
    body: BaseModel,
    command_name: str,
) -> tuple[VerticalSliceRun, bool]:
    return await run_repository.save_with_task(
        connection,
        previous,
        transition,
        None,
        idempotency_key=idempotency_key,
        request_hash=_request_hash(body),
        command_name=command_name,
        actor=ActorType.LEARNER,
    )


async def _find_replay(
    connection: AsyncConnection,
    idempotency_key: str,
    body: BaseModel,
    command_name: str,
) -> VerticalSliceRun | None:
    return await run_repository.find_replay(
        connection,
        idempotency_key=idempotency_key,
        request_hash=_request_hash(body),
        command_name=command_name,
    )


def _profile(body: CreateRunRequest, now: datetime) -> LearnerProfileSnapshot:
    value = body.learner_profile
    return LearnerProfileSnapshot(
        learner_snapshot_id=_id("learner_snapshot"),
        exam_track=value.exam_track,
        target_score=value.target_score,
        weekly_minutes=value.weekly_minutes,
        self_reported_level=value.self_reported_level,
        prior_exam_seen=value.prior_exam_seen,
        session_minutes=value.session_minutes,
        feedback_density=value.feedback_density,
        timed=value.timed,
        evidence_count=value.evidence_count,
        confidence_band=value.confidence_band,
        created_at=now,
    )


def _run_view(run: VerticalSliceRun, *, replayed: bool = False) -> LearnerRunView:
    current = run.current_task
    return LearnerRunView(
        workflow_run_id=run.workflow_run_id,
        lifecycle=run.lifecycle.value,
        stage=run.stage.value,
        version=run.version,
        current_task_id=current.task_id if current is not None else None,
        task_refs=[
            RunTaskRefView(
                task_id=item.task_id,
                role=item.role.value,
                task_type=item.task_type.value,
                content_version_id=item.content_version_id,
                completed=item.completed_at is not None,
                completed_task_version=item.completed_task_version,
                highest_hint_level=item.highest_hint_level,
            )
            for item in run.task_refs
        ],
        match_decisions=[
            MatchDecisionView(
                decision_id=item.decision_id,
                selected_content_version_id=item.selected_content_version_id,
                policy_version=item.policy_version,
                conservative=item.conservative,
                reason_codes=list(item.reason_codes),
            )
            for item in run.match_decisions
        ],
        calibration_fallback_approved=run.calibration_fallback_approved,
        difficulty_feedback_status=run.difficulty_feedback_status.value,
        difficulty_rating=(
            run.difficulty_rating.value if run.difficulty_rating is not None else None
        ),
        next_task_placeholder_id=(
            run.next_task_placeholder.placeholder_id
            if run.next_task_placeholder is not None
            else None
        ),
        completion_gaps=list(run.completion_gaps()),
        replayed=replayed,
    )


async def _control_run_view(
    connection: AsyncConnection,
    run: VerticalSliceRun,
    *,
    replayed: bool = False,
) -> ControlRunReplayView:
    base = _run_view(run, replayed=replayed)
    rows = (
        (
            await connection.execute(
                sa.select(tables.domain_events)
                .where(tables.domain_events.c.aggregate_id == run.workflow_run_id)
                .order_by(
                    tables.domain_events.c.aggregate_version,
                    tables.domain_events.c.occurred_at,
                )
            )
        )
        .mappings()
        .all()
    )
    return ControlRunReplayView(
        **base.model_dump(),
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


def _request_hash(body: BaseModel) -> str:
    value = json.dumps(body.model_dump(mode="json"), ensure_ascii=False, sort_keys=True)
    return sha256(value.encode("utf-8")).hexdigest()


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"
