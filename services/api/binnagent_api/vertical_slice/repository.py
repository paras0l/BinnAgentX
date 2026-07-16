from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4

import sqlalchemy as sa
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.aggregate import LearningTask, Transition
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.models import (
    ActorType,
    AiIntervention,
    Annotation,
    AnnotationKind,
    Attempt,
    AttemptIndependence,
    DifficultyStatus,
    ExamTrack,
    FeedbackDensity,
    InterventionResult,
    InterventionType,
    LearnerProfileSnapshot,
    MaterialAssignment,
    MaterialInvalidation,
    MaterialRef,
    RevisionEvent,
    RevisionResult,
    RightsStatus,
    SelfReportedLevel,
    TaskState,
    TaskType,
    TextSpan,
)
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.vertical_slice import tables


class TaskNotFoundError(LookupError):
    def __init__(self, task_id: str) -> None:
        super().__init__(task_id)
        self.task_id = task_id


class VerticalSliceRepository:
    async def create(
        self,
        connection: AsyncConnection,
        transition: Transition,
        *,
        idempotency_key: str,
        request_hash: str,
        command_name: str,
        actor: ActorType,
    ) -> tuple[LearningTask, bool]:
        await self._lock_idempotency(connection, idempotency_key)
        replay = await self._idempotent_replay(
            connection, idempotency_key, request_hash, command_name
        )
        if replay is not None:
            return await self.load(connection, replay), True

        task = transition.task
        await self.insert_embedded(
            connection,
            transition,
            actor=actor,
            command_name=command_name,
            ensure_workflow=True,
        )
        await self._record_idempotency(
            connection,
            idempotency_key,
            request_hash,
            command_name,
            task.task_id,
            task.updated_at,
        )
        return task, False

    async def insert_embedded(
        self,
        connection: AsyncConnection,
        transition: Transition,
        *,
        actor: ActorType,
        command_name: str,
        ensure_workflow: bool,
    ) -> None:
        """Insert a task as part of a wider run transaction."""
        task = transition.task
        profile = task.learner_profile
        await connection.execute(
            pg_insert(tables.learner_profile_snapshots)
            .values(
                learner_snapshot_id=profile.learner_snapshot_id,
                snapshot=_profile_to_json(profile),
                created_at=profile.created_at,
            )
            .on_conflict_do_nothing(index_elements=["learner_snapshot_id"])
        )
        if ensure_workflow:
            await connection.execute(
                pg_insert(tables.workflow_runs)
                .values(
                    workflow_run_id=task.workflow_run_id,
                    workflow_version="workflow_read_write_v1",
                    state="running",
                    checkpoint_id="checkpoint_initial",
                    model_call_count=0,
                    cost_usd=Decimal("0"),
                    version=1,
                    created_at=task.created_at,
                    updated_at=task.updated_at,
                )
                .on_conflict_do_nothing(index_elements=["workflow_run_id"])
            )
        await connection.execute(tables.learning_tasks.insert().values(**_task_projection(task)))
        await self._append_facts(connection, None, task)
        await self._append_events(connection, transition, actor, command_name)

    async def save(
        self,
        connection: AsyncConnection,
        previous: LearningTask,
        transition: Transition,
        *,
        idempotency_key: str,
        request_hash: str,
        command_name: str,
        actor: ActorType,
    ) -> tuple[LearningTask, bool]:
        await self._lock_idempotency(connection, idempotency_key)
        replay = await self._idempotent_replay(
            connection, idempotency_key, request_hash, command_name
        )
        if replay is not None:
            return await self.load(connection, replay), True

        task = transition.task
        result = await connection.execute(
            tables.learning_tasks.update()
            .where(
                tables.learning_tasks.c.task_id == task.task_id,
                tables.learning_tasks.c.version == previous.version,
            )
            .values(
                state=task.state.value,
                state_before_pause=(
                    task.state_before_pause.value if task.state_before_pause is not None else None
                ),
                highest_hint_level=task.highest_hint_level,
                version=task.version,
                updated_at=task.updated_at,
            )
        )
        if result.rowcount != 1:
            current_version = await connection.scalar(
                sa.select(tables.learning_tasks.c.version).where(
                    tables.learning_tasks.c.task_id == task.task_id
                )
            )
            raise DomainError(
                PublicErrorCode.SESSION_CONFLICT,
                "repository_expected_version_mismatch",
                current_version,
            )
        await self._append_facts(connection, previous, task)
        await self._append_events(connection, transition, actor, command_name)
        await self._record_idempotency(
            connection, idempotency_key, request_hash, command_name, task.task_id, task.updated_at
        )
        return task, False

    async def find_replay(
        self,
        connection: AsyncConnection,
        *,
        idempotency_key: str,
        request_hash: str,
        command_name: str,
    ) -> LearningTask | None:
        """Lock a command key and return its prior result before domain evaluation."""
        await self._lock_idempotency(connection, idempotency_key)
        task_id = await self._idempotent_replay(
            connection, idempotency_key, request_hash, command_name
        )
        return await self.load(connection, task_id) if task_id is not None else None

    async def load(self, connection: AsyncConnection, task_id: str) -> LearningTask:
        task_row = (
            (
                await connection.execute(
                    sa.select(tables.learning_tasks).where(
                        tables.learning_tasks.c.task_id == task_id
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if task_row is None:
            raise TaskNotFoundError(task_id)
        profile_json = await connection.scalar(
            sa.select(tables.learner_profile_snapshots.c.snapshot).where(
                tables.learner_profile_snapshots.c.learner_snapshot_id
                == task_row["learner_snapshot_id"]
            )
        )
        if not isinstance(profile_json, dict):
            raise RuntimeError("learner profile snapshot is missing")
        materials = (
            (
                await connection.execute(
                    sa.select(tables.task_material_assignments)
                    .where(tables.task_material_assignments.c.task_id == task_id)
                    .order_by(tables.task_material_assignments.c.ordinal)
                )
            )
            .mappings()
            .all()
        )
        invalidations = (
            (
                await connection.execute(
                    sa.select(tables.material_assignment_invalidations)
                    .join(
                        tables.task_material_assignments,
                        tables.task_material_assignments.c.assignment_id
                        == tables.material_assignment_invalidations.c.assignment_id,
                    )
                    .where(tables.task_material_assignments.c.task_id == task_id)
                    .order_by(tables.material_assignment_invalidations.c.invalidated_at)
                )
            )
            .mappings()
            .all()
        )
        annotations = await self._rows(connection, tables.task_annotations, task_id, "created_at")
        attempts = await self._rows(connection, tables.attempt_versions, task_id, "version")
        interventions = await self._rows(connection, tables.ai_interventions, task_id, "created_at")
        revisions = await self._rows(connection, tables.revision_events, task_id, "created_at")
        return LearningTask(
            task_id=task_row["task_id"],
            workflow_run_id=task_row["workflow_run_id"],
            task_type=TaskType(task_row["task_type"]),
            learner_profile=_profile_from_json(profile_json),
            state=TaskState(task_row["state"]),
            version=task_row["version"],
            highest_hint_level=task_row["highest_hint_level"],
            material_assignments=tuple(_material_assignment(row) for row in materials),
            material_invalidations=tuple(_material_invalidation(row) for row in invalidations),
            annotations=tuple(_annotation(row) for row in annotations),
            attempts=tuple(_attempt(row) for row in attempts),
            interventions=tuple(_intervention(row) for row in interventions),
            revisions=tuple(_revision(row) for row in revisions),
            state_before_pause=(
                TaskState(task_row["state_before_pause"])
                if task_row["state_before_pause"] is not None
                else None
            ),
            created_at=task_row["created_at"],
            updated_at=task_row["updated_at"],
        )

    async def _rows(
        self,
        connection: AsyncConnection,
        table: sa.Table,
        task_id: str,
        order_column: str,
    ) -> list[sa.RowMapping]:
        return list(
            (
                await connection.execute(
                    sa.select(table)
                    .where(table.c.task_id == task_id)
                    .order_by(table.c[order_column])
                )
            )
            .mappings()
            .all()
        )

    async def _append_facts(
        self,
        connection: AsyncConnection,
        previous: LearningTask | None,
        task: LearningTask,
    ) -> None:
        old_materials = len(previous.material_assignments) if previous is not None else 0
        for ordinal, assignment in enumerate(
            task.material_assignments[old_materials:], old_materials
        ):
            material = assignment.material
            await connection.execute(
                tables.task_material_assignments.insert().values(
                    assignment_id=assignment.assignment_id,
                    task_id=task.task_id,
                    ordinal=ordinal,
                    content_id=material.content_id,
                    content_version_id=material.content_version_id,
                    content_hash=material.content_hash,
                    rights_status=material.rights_status.value,
                    difficulty_status=material.difficulty_status.value,
                    reason_code=assignment.reason_code,
                    eligible_when_assigned=assignment.eligible_when_assigned,
                    assigned_at=assignment.assigned_at,
                )
            )
        await self._insert_new_invalidations(connection, previous, task)
        await self._insert_new_annotations(connection, previous, task)
        await self._insert_new_attempts(connection, previous, task)
        await self._insert_new_interventions(connection, previous, task)
        await self._insert_new_revisions(connection, previous, task)

    async def _insert_new_invalidations(
        self, connection: AsyncConnection, previous: LearningTask | None, task: LearningTask
    ) -> None:
        start = len(previous.material_invalidations) if previous is not None else 0
        for item in task.material_invalidations[start:]:
            await connection.execute(
                tables.material_assignment_invalidations.insert().values(
                    invalidation_id=item.invalidation_id,
                    assignment_id=item.assignment_id,
                    reason_code=item.reason_code,
                    invalidated_at=item.invalidated_at,
                )
            )

    async def _insert_new_annotations(
        self, connection: AsyncConnection, previous: LearningTask | None, task: LearningTask
    ) -> None:
        start = len(previous.annotations) if previous is not None else 0
        for item in task.annotations[start:]:
            await connection.execute(
                tables.task_annotations.insert().values(
                    annotation_id=item.annotation_id,
                    task_id=task.task_id,
                    content_version_id=item.content_version_id,
                    kind=item.kind.value,
                    paragraph_id=item.span.paragraph_id,
                    span_start=item.span.start,
                    span_end=item.span.end,
                    text_quote=item.span.text_quote,
                    text_hash=item.span.text_hash,
                    user_explanation=item.user_explanation,
                    created_at=item.created_at,
                )
            )

    async def _insert_new_attempts(
        self, connection: AsyncConnection, previous: LearningTask | None, task: LearningTask
    ) -> None:
        start = len(previous.attempts) if previous is not None else 0
        for item in task.attempts[start:]:
            await connection.execute(
                tables.attempt_versions.insert().values(
                    attempt_version_id=item.attempt_version_id,
                    task_id=task.task_id,
                    version=item.version,
                    text=item.text,
                    content_hash=item.content_hash,
                    independence=item.independence.value,
                    created_at=item.created_at,
                )
            )

    async def _insert_new_interventions(
        self, connection: AsyncConnection, previous: LearningTask | None, task: LearningTask
    ) -> None:
        start = len(previous.interventions) if previous is not None else 0
        for item in task.interventions[start:]:
            await connection.execute(
                tables.ai_interventions.insert().values(
                    intervention_id=item.intervention_id,
                    task_id=task.task_id,
                    input_attempt_version_id=item.input_attempt_version_id,
                    hint_level=item.hint_level,
                    intervention_type=item.intervention_type.value,
                    model_adapter=item.model_adapter,
                    prompt_version=item.prompt_version,
                    result_status=item.result_status.value,
                    created_at=item.created_at,
                )
            )

    async def _insert_new_revisions(
        self, connection: AsyncConnection, previous: LearningTask | None, task: LearningTask
    ) -> None:
        start = len(previous.revisions) if previous is not None else 0
        for item in task.revisions[start:]:
            await connection.execute(
                tables.revision_events.insert().values(
                    revision_event_id=item.revision_event_id,
                    task_id=task.task_id,
                    from_attempt_version_id=item.from_attempt_version_id,
                    to_attempt_version_id=item.to_attempt_version_id,
                    intervention_id=item.intervention_id,
                    result_status=item.result_status.value,
                    created_at=item.created_at,
                )
            )

    async def _append_events(
        self,
        connection: AsyncConnection,
        transition: Transition,
        actor: ActorType,
        reason_code: str,
    ) -> None:
        for event in transition.events:
            payload = dict(event.payload)
            await connection.execute(
                tables.domain_events.insert().values(
                    event_id=event.event_id,
                    event_type=event.event_type,
                    aggregate_id=event.aggregate_id,
                    aggregate_version=event.aggregate_version,
                    payload=payload,
                    occurred_at=event.occurred_at,
                )
            )
            await connection.execute(
                tables.outbox_messages.insert().values(
                    message_id=uuid4(),
                    topic=f"vertical_slice.{event.event_type}",
                    aggregate_id=event.aggregate_id,
                    payload={
                        "event_id": event.event_id,
                        "aggregate_version": event.aggregate_version,
                        **payload,
                    },
                    status="pending",
                    attempt_count=0,
                    occurred_at=event.occurred_at,
                    available_at=event.occurred_at,
                    processed_at=None,
                )
            )
            await connection.execute(
                tables.audit_events.insert().values(
                    audit_event_id=f"audit_event_{uuid4().hex}",
                    workflow_run_id=transition.task.workflow_run_id,
                    actor_type=actor.value,
                    action=event.event_type,
                    reason_code=reason_code,
                    target_version=event.aggregate_version,
                    created_at=event.occurred_at,
                )
            )

    async def _idempotent_replay(
        self,
        connection: AsyncConnection,
        idempotency_key: str,
        request_hash: str,
        command_name: str,
    ) -> str | None:
        row = (
            (
                await connection.execute(
                    sa.select(tables.idempotency_records).where(
                        tables.idempotency_records.c.idempotency_key == idempotency_key
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            return None
        if row["request_hash"] != request_hash or row["command_name"] != command_name:
            raise DomainError(
                PublicErrorCode.SESSION_CONFLICT,
                "idempotency_key_reused_with_different_command",
            )
        reference = row["response_reference"]
        if not isinstance(reference, str):
            raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "idempotent_response_missing")
        return reference

    async def _lock_idempotency(self, connection: AsyncConnection, idempotency_key: str) -> None:
        await connection.execute(
            sa.text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": idempotency_key},
        )

    async def _record_idempotency(
        self,
        connection: AsyncConnection,
        idempotency_key: str,
        request_hash: str,
        command_name: str,
        task_id: str,
        created_at: datetime,
    ) -> None:
        await connection.execute(
            tables.idempotency_records.insert().values(
                idempotency_key=idempotency_key,
                command_name=command_name,
                request_hash=request_hash,
                response_reference=task_id,
                created_at=created_at,
            )
        )


def _task_projection(task: LearningTask) -> dict[str, Any]:
    return {
        "task_id": task.task_id,
        "workflow_run_id": task.workflow_run_id,
        "learner_snapshot_id": task.learner_profile.learner_snapshot_id,
        "task_type": task.task_type.value,
        "state": task.state.value,
        "state_before_pause": None,
        "highest_hint_level": task.highest_hint_level,
        "version": task.version,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


def _profile_to_json(profile: LearnerProfileSnapshot) -> dict[str, Any]:
    return {
        "learner_snapshot_id": profile.learner_snapshot_id,
        "exam_track": profile.exam_track.value,
        "target_score": profile.target_score,
        "weekly_minutes": profile.weekly_minutes,
        "language_background": {
            "self_reported_level": profile.self_reported_level.value,
            "prior_exam_seen": profile.prior_exam_seen,
        },
        "explicit_preferences": {
            "session_minutes": profile.session_minutes,
            "feedback_density": profile.feedback_density.value,
            "timed": profile.timed,
        },
        "evidence_count": profile.evidence_count,
        "confidence_band": profile.confidence_band,
        "created_at": profile.created_at.isoformat(),
    }


def _profile_from_json(value: dict[str, Any]) -> LearnerProfileSnapshot:
    background = value["language_background"]
    preferences = value["explicit_preferences"]
    return LearnerProfileSnapshot(
        learner_snapshot_id=value["learner_snapshot_id"],
        exam_track=ExamTrack(value["exam_track"]),
        target_score=value["target_score"],
        weekly_minutes=value["weekly_minutes"],
        self_reported_level=SelfReportedLevel(background["self_reported_level"]),
        prior_exam_seen=background["prior_exam_seen"],
        session_minutes=preferences["session_minutes"],
        feedback_density=FeedbackDensity(preferences["feedback_density"]),
        timed=preferences["timed"],
        evidence_count=value["evidence_count"],
        confidence_band=value["confidence_band"],
        created_at=datetime.fromisoformat(value["created_at"]),
    )


def _material_assignment(row: sa.RowMapping) -> MaterialAssignment:
    return MaterialAssignment(
        assignment_id=row["assignment_id"],
        material=MaterialRef(
            content_id=row["content_id"],
            content_version_id=row["content_version_id"],
            content_hash=row["content_hash"],
            rights_status=RightsStatus(row["rights_status"]),
            difficulty_status=DifficultyStatus(row["difficulty_status"]),
        ),
        reason_code=row["reason_code"],
        eligible_when_assigned=row["eligible_when_assigned"],
        assigned_at=row["assigned_at"],
    )


def _material_invalidation(row: sa.RowMapping) -> MaterialInvalidation:
    return MaterialInvalidation(
        invalidation_id=row["invalidation_id"],
        assignment_id=row["assignment_id"],
        reason_code=row["reason_code"],
        invalidated_at=row["invalidated_at"],
    )


def _annotation(row: sa.RowMapping) -> Annotation:
    return Annotation(
        annotation_id=row["annotation_id"],
        task_id=row["task_id"],
        content_version_id=row["content_version_id"],
        kind=AnnotationKind(row["kind"]),
        span=TextSpan(
            paragraph_id=row["paragraph_id"],
            start=row["span_start"],
            end=row["span_end"],
            text_quote=row["text_quote"],
            text_hash=row["text_hash"],
        ),
        user_explanation=row["user_explanation"],
        created_at=row["created_at"],
    )


def _attempt(row: sa.RowMapping) -> Attempt:
    return Attempt(
        attempt_version_id=row["attempt_version_id"],
        task_id=row["task_id"],
        version=row["version"],
        text=row["text"],
        content_hash=row["content_hash"],
        independence=AttemptIndependence(row["independence"]),
        created_at=row["created_at"],
    )


def _intervention(row: sa.RowMapping) -> AiIntervention:
    return AiIntervention(
        intervention_id=row["intervention_id"],
        task_id=row["task_id"],
        input_attempt_version_id=row["input_attempt_version_id"],
        hint_level=row["hint_level"],
        intervention_type=InterventionType(row["intervention_type"]),
        model_adapter=row["model_adapter"],
        prompt_version=row["prompt_version"],
        result_status=InterventionResult(row["result_status"]),
        created_at=row["created_at"],
    )


def _revision(row: sa.RowMapping) -> RevisionEvent:
    return RevisionEvent(
        revision_event_id=row["revision_event_id"],
        task_id=row["task_id"],
        from_attempt_version_id=row["from_attempt_version_id"],
        to_attempt_version_id=row["to_attempt_version_id"],
        intervention_id=row["intervention_id"],
        result_status=RevisionResult(row["result_status"]),
        created_at=row["created_at"],
    )
