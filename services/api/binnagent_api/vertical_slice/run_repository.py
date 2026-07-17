from datetime import datetime
from decimal import Decimal
from uuid import uuid4

import sqlalchemy as sa
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.aggregate import Transition
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.matching import MatchDecision
from binnagent_domain.vertical_slice.models import ActorType, TaskType
from binnagent_domain.vertical_slice.run import (
    DifficultyFeedbackStatus,
    DifficultyRating,
    NextTaskPlaceholder,
    RunKind,
    RunLifecycle,
    RunStage,
    RunTaskRef,
    RunTransition,
    VerticalSliceRun,
)
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.vertical_slice import tables
from binnagent_api.vertical_slice.repository import (
    VerticalSliceRepository,
    _profile_from_json,
    _profile_to_json,
)


class RunNotFoundError(LookupError):
    def __init__(self, workflow_run_id: str) -> None:
        super().__init__(workflow_run_id)
        self.workflow_run_id = workflow_run_id


class VerticalSliceRunRepository:
    def __init__(self, task_repository: VerticalSliceRepository | None = None) -> None:
        self._tasks = task_repository or VerticalSliceRepository()

    async def create_with_task(
        self,
        connection: AsyncConnection,
        run_transition: RunTransition,
        task_transition: Transition,
        *,
        idempotency_key: str,
        request_hash: str,
        command_name: str,
        actor: ActorType,
    ) -> tuple[VerticalSliceRun, bool]:
        await self._lock_idempotency(connection, idempotency_key)
        replay = await self._idempotent_replay(
            connection, idempotency_key, request_hash, command_name
        )
        if replay is not None:
            return await self.load(connection, replay), True

        run = run_transition.run
        profile = run.learner_profile
        if task_transition.task.workflow_run_id != run.workflow_run_id:
            self._conflict("initial_task_run_mismatch")
        if task_transition.task.task_id != run.task_refs[0].task_id:
            self._conflict("initial_task_reference_mismatch")
        await connection.execute(
            pg_insert(tables.learner_profile_snapshots)
            .values(
                learner_snapshot_id=profile.learner_snapshot_id,
                snapshot=_profile_to_json(profile),
                created_at=profile.created_at,
            )
            .on_conflict_do_nothing(index_elements=["learner_snapshot_id"])
        )
        await connection.execute(tables.workflow_runs.insert().values(**self._projection(run)))
        await self._tasks.insert_embedded(
            connection,
            task_transition,
            actor=actor,
            command_name=command_name,
            ensure_workflow=False,
        )
        await self._append_facts(connection, None, run)
        await self._append_events(connection, run_transition, actor, command_name)
        await self._record_idempotency(
            connection,
            idempotency_key,
            request_hash,
            command_name,
            run.workflow_run_id,
            run.updated_at,
        )
        return run, False

    async def save_with_task(
        self,
        connection: AsyncConnection,
        previous: VerticalSliceRun,
        run_transition: RunTransition,
        task_transition: Transition | None,
        *,
        idempotency_key: str,
        request_hash: str,
        command_name: str,
        actor: ActorType,
    ) -> tuple[VerticalSliceRun, bool]:
        await self._lock_idempotency(connection, idempotency_key)
        replay = await self._idempotent_replay(
            connection, idempotency_key, request_hash, command_name
        )
        if replay is not None:
            return await self.load(connection, replay), True

        run = run_transition.run
        new_refs = run.task_refs[len(previous.task_refs) :]
        if bool(new_refs) != (task_transition is not None):
            self._conflict("run_task_assignment_and_task_creation_must_be_atomic")
        if task_transition is not None:
            if len(new_refs) != 1 or task_transition.task.task_id != new_refs[0].task_id:
                self._conflict("assigned_task_reference_mismatch")
            await self._tasks.insert_embedded(
                connection,
                task_transition,
                actor=actor,
                command_name=command_name,
                ensure_workflow=False,
            )

        projection = self._projection(run)
        result = await connection.execute(
            tables.workflow_runs.update()
            .where(
                tables.workflow_runs.c.workflow_run_id == run.workflow_run_id,
                tables.workflow_runs.c.version == previous.version,
            )
            .values(
                state=projection["state"],
                stage=projection["stage"],
                checkpoint_id=projection["checkpoint_id"],
                version=projection["version"],
                calibration_fallback_approved=projection["calibration_fallback_approved"],
                difficulty_feedback_status=projection["difficulty_feedback_status"],
                difficulty_rating=projection["difficulty_rating"],
                next_task_placeholder_id=projection["next_task_placeholder_id"],
                updated_at=projection["updated_at"],
            )
        )
        if result.rowcount != 1:
            current_version = await connection.scalar(
                sa.select(tables.workflow_runs.c.version).where(
                    tables.workflow_runs.c.workflow_run_id == run.workflow_run_id
                )
            )
            raise DomainError(
                PublicErrorCode.SESSION_CONFLICT,
                "run_repository_expected_version_mismatch",
                current_version,
            )
        await self._append_facts(connection, previous, run)
        await self._append_events(connection, run_transition, actor, command_name)
        await self._record_idempotency(
            connection,
            idempotency_key,
            request_hash,
            command_name,
            run.workflow_run_id,
            run.updated_at,
        )
        return run, False

    async def find_replay(
        self,
        connection: AsyncConnection,
        *,
        idempotency_key: str,
        request_hash: str,
        command_name: str,
    ) -> VerticalSliceRun | None:
        await self._lock_idempotency(connection, idempotency_key)
        reference = await self._idempotent_replay(
            connection, idempotency_key, request_hash, command_name
        )
        return await self.load(connection, reference) if reference is not None else None

    async def load(self, connection: AsyncConnection, workflow_run_id: str) -> VerticalSliceRun:
        row = (
            (
                await connection.execute(
                    sa.select(tables.workflow_runs).where(
                        tables.workflow_runs.c.workflow_run_id == workflow_run_id
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None or row["stage"] is None or row["learner_snapshot_id"] is None:
            raise RunNotFoundError(workflow_run_id)
        profile_json = await connection.scalar(
            sa.select(tables.learner_profile_snapshots.c.snapshot).where(
                tables.learner_profile_snapshots.c.learner_snapshot_id == row["learner_snapshot_id"]
            )
        )
        if not isinstance(profile_json, dict):
            raise RuntimeError("run learner profile snapshot is missing")
        ref_rows = (
            (
                await connection.execute(
                    sa.select(tables.run_task_refs)
                    .where(tables.run_task_refs.c.workflow_run_id == workflow_run_id)
                    .order_by(tables.run_task_refs.c.assigned_at)
                )
            )
            .mappings()
            .all()
        )
        completion_rows = (
            (
                await connection.execute(
                    sa.select(tables.run_task_completion_events).where(
                        tables.run_task_completion_events.c.workflow_run_id == workflow_run_id
                    )
                )
            )
            .mappings()
            .all()
        )
        completions = {item["task_id"]: item for item in completion_rows}
        decision_rows = (
            (
                await connection.execute(
                    sa.select(tables.material_match_decisions)
                    .where(tables.material_match_decisions.c.workflow_run_id == workflow_run_id)
                    .order_by(tables.material_match_decisions.c.created_at)
                )
            )
            .mappings()
            .all()
        )
        placeholder = None
        if row["next_task_placeholder_id"] is not None:
            placeholder_row = (
                (
                    await connection.execute(
                        sa.select(tables.next_task_placeholders).where(
                            tables.next_task_placeholders.c.placeholder_id
                            == row["next_task_placeholder_id"]
                        )
                    )
                )
                .mappings()
                .one()
            )
            placeholder = NextTaskPlaceholder(
                placeholder_id=placeholder_row["placeholder_id"],
                planned_task_type=TaskType(placeholder_row["planned_task_type"]),
                reason_code=placeholder_row["reason_code"],
                created_at=placeholder_row["created_at"],
            )
        return VerticalSliceRun(
            workflow_run_id=row["workflow_run_id"],
            learner_id=row["learner_id"],
            learner_profile=_profile_from_json(profile_json),
            run_kind=RunKind(row["run_kind"]),
            predecessor_run_id=row["predecessor_run_id"],
            lifecycle=RunLifecycle(row["state"]),
            stage=RunStage(row["stage"]),
            version=row["version"],
            task_refs=tuple(
                self._task_ref(item, completions.get(item["task_id"])) for item in ref_rows
            ),
            match_decisions=tuple(self._match_decision(item) for item in decision_rows),
            calibration_fallback_approved=row["calibration_fallback_approved"],
            difficulty_feedback_status=DifficultyFeedbackStatus(row["difficulty_feedback_status"]),
            difficulty_rating=(
                DifficultyRating(row["difficulty_rating"])
                if row["difficulty_rating"] is not None
                else None
            ),
            next_task_placeholder=placeholder,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def load_successor(
        self,
        connection: AsyncConnection,
        predecessor_run_id: str,
    ) -> VerticalSliceRun | None:
        workflow_run_id = await connection.scalar(
            sa.select(tables.workflow_runs.c.workflow_run_id).where(
                tables.workflow_runs.c.predecessor_run_id == predecessor_run_id
            )
        )
        return await self.load(connection, workflow_run_id) if workflow_run_id else None

    async def _append_facts(
        self,
        connection: AsyncConnection,
        previous: VerticalSliceRun | None,
        run: VerticalSliceRun,
    ) -> None:
        old_ref_count = len(previous.task_refs) if previous is not None else 0
        for task_ref in run.task_refs[old_ref_count:]:
            await connection.execute(
                tables.run_task_refs.insert().values(
                    workflow_run_id=run.workflow_run_id,
                    role=task_ref.role.value,
                    task_id=task_ref.task_id,
                    task_type=task_ref.task_type.value,
                    content_version_id=task_ref.content_version_id,
                    assigned_at=task_ref.assigned_at,
                )
            )
        previous_refs = (
            {item.task_id: item for item in previous.task_refs} if previous is not None else {}
        )
        for task_ref in run.task_refs:
            before = previous_refs.get(task_ref.task_id)
            if task_ref.completed_at is None or (
                before is not None and before.completed_at is not None
            ):
                continue
            await connection.execute(
                tables.run_task_completion_events.insert().values(
                    completion_event_id=f"run_task_completion_{uuid4().hex}",
                    workflow_run_id=run.workflow_run_id,
                    task_id=task_ref.task_id,
                    completed_at=task_ref.completed_at,
                    completed_task_version=task_ref.completed_task_version,
                    highest_hint_level=task_ref.highest_hint_level,
                )
            )
        old_decisions = len(previous.match_decisions) if previous is not None else 0
        for decision in run.match_decisions[old_decisions:]:
            await connection.execute(
                tables.material_match_decisions.insert().values(
                    decision_id=decision.decision_id,
                    workflow_run_id=run.workflow_run_id,
                    learner_snapshot_id=decision.learner_snapshot_id,
                    candidate_version_ids=list(decision.candidate_version_ids),
                    selected_content_version_id=decision.selected_content_version_id,
                    policy_version=decision.policy_version,
                    conservative=decision.conservative,
                    reason_codes=list(decision.reason_codes),
                    created_at=decision.created_at,
                )
            )
        if (
            previous is not None
            and previous.difficulty_feedback_status is DifficultyFeedbackStatus.PENDING
            and run.difficulty_feedback_status is not DifficultyFeedbackStatus.PENDING
        ):
            await connection.execute(
                tables.difficulty_feedback_events.insert().values(
                    feedback_event_id=f"difficulty_feedback_{uuid4().hex}",
                    workflow_run_id=run.workflow_run_id,
                    status=run.difficulty_feedback_status.value,
                    rating=run.difficulty_rating.value if run.difficulty_rating else None,
                    created_at=run.updated_at,
                )
            )
        if run.next_task_placeholder is not None and (
            previous is None or previous.next_task_placeholder is None
        ):
            placeholder = run.next_task_placeholder
            await connection.execute(
                tables.next_task_placeholders.insert().values(
                    placeholder_id=placeholder.placeholder_id,
                    workflow_run_id=run.workflow_run_id,
                    planned_task_type=placeholder.planned_task_type.value,
                    reason_code=placeholder.reason_code,
                    created_at=placeholder.created_at,
                )
            )

    async def _append_events(
        self,
        connection: AsyncConnection,
        transition: RunTransition,
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
                    workflow_run_id=transition.run.workflow_run_id,
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
                "idempotency_key_reused_with_different_run_command",
            )
        reference = row["response_reference"]
        if not isinstance(reference, str):
            raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "run_replay_missing")
        return reference

    async def _record_idempotency(
        self,
        connection: AsyncConnection,
        idempotency_key: str,
        request_hash: str,
        command_name: str,
        workflow_run_id: str,
        created_at: datetime,
    ) -> None:
        await connection.execute(
            tables.idempotency_records.insert().values(
                idempotency_key=idempotency_key,
                command_name=command_name,
                request_hash=request_hash,
                response_reference=workflow_run_id,
                created_at=created_at,
            )
        )

    @staticmethod
    async def _lock_idempotency(connection: AsyncConnection, idempotency_key: str) -> None:
        await connection.execute(
            sa.text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": idempotency_key},
        )

    @staticmethod
    def _projection(run: VerticalSliceRun) -> dict[str, object]:
        return {
            "workflow_run_id": run.workflow_run_id,
            "learner_id": run.learner_id,
            "learner_snapshot_id": run.learner_profile.learner_snapshot_id,
            "workflow_version": "workflow_read_write_v2",
            "run_kind": run.run_kind.value,
            "predecessor_run_id": run.predecessor_run_id,
            "state": run.lifecycle.value,
            "stage": run.stage.value,
            "checkpoint_id": f"checkpoint_run_v{run.version}",
            "model_call_count": 0,
            "cost_usd": Decimal("0"),
            "version": run.version,
            "calibration_fallback_approved": run.calibration_fallback_approved,
            "difficulty_feedback_status": run.difficulty_feedback_status.value,
            "difficulty_rating": (run.difficulty_rating.value if run.difficulty_rating else None),
            "next_task_placeholder_id": (
                run.next_task_placeholder.placeholder_id if run.next_task_placeholder else None
            ),
            "created_at": run.created_at,
            "updated_at": run.updated_at,
        }

    @staticmethod
    def _task_ref(row: sa.RowMapping, completion: sa.RowMapping | None) -> RunTaskRef:
        return RunTaskRef(
            task_id=row["task_id"],
            role=RunStage(row["role"]),
            task_type=TaskType(row["task_type"]),
            content_version_id=row["content_version_id"],
            assigned_at=row["assigned_at"],
            completed_at=completion["completed_at"] if completion is not None else None,
            completed_task_version=(
                completion["completed_task_version"] if completion is not None else None
            ),
            highest_hint_level=(
                completion["highest_hint_level"] if completion is not None else None
            ),
        )

    @staticmethod
    def _match_decision(row: sa.RowMapping) -> MatchDecision:
        return MatchDecision(
            decision_id=row["decision_id"],
            learner_snapshot_id=row["learner_snapshot_id"],
            candidate_version_ids=tuple(row["candidate_version_ids"]),
            selected_content_version_id=row["selected_content_version_id"],
            policy_version=row["policy_version"],
            conservative=row["conservative"],
            reason_codes=tuple(row["reason_codes"]),
            created_at=row["created_at"],
        )

    @staticmethod
    def _conflict(reason: str) -> None:
        raise DomainError(PublicErrorCode.SESSION_CONFLICT, reason)
