from dataclasses import dataclass, replace
from datetime import datetime
from enum import StrEnum
from typing import NoReturn
from uuid import uuid4

from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.events import DomainEvent
from binnagent_domain.vertical_slice.matching import MatchDecision
from binnagent_domain.vertical_slice.models import LearnerProfileSnapshot, TaskType


class RunStage(StrEnum):
    CALIBRATION_A = "calibration_a"
    CALIBRATION_B = "calibration_b"
    MATCHED_READING = "matched_reading"
    MICRO_EXPRESSION = "micro_expression"
    WRAP_UP = "wrap_up"
    COMPLETED = "completed"


class RunLifecycle(StrEnum):
    RUNNING = "running"
    PAUSED = "paused"
    REVIEW_PENDING = "review_pending"
    COMPLETED = "completed"
    FAILED_RECOVERABLE = "failed_recoverable"
    FAILED_TERMINAL = "failed_terminal"


class RunKind(StrEnum):
    FIRST_EXPERIENCE = "first_experience"
    PRACTICE = "practice"


class DifficultyFeedbackStatus(StrEnum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    SKIPPED = "skipped"


class DifficultyRating(StrEnum):
    TOO_EASY = "too_easy"
    MATCHED = "matched"
    TOO_HARD = "too_hard"


@dataclass(frozen=True, slots=True)
class RunTaskRef:
    task_id: str
    role: RunStage
    task_type: TaskType
    content_version_id: str
    assigned_at: datetime
    completed_at: datetime | None = None
    completed_task_version: int | None = None
    highest_hint_level: int | None = None


@dataclass(frozen=True, slots=True)
class NextTaskPlaceholder:
    placeholder_id: str
    planned_task_type: TaskType
    reason_code: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class CreateVerticalSliceRun:
    workflow_run_id: str
    learner_id: str
    learner_profile: LearnerProfileSnapshot
    initial_task_id: str
    initial_task_type: TaskType
    initial_stage: RunStage
    initial_content_version_id: str
    run_kind: RunKind
    predecessor_run_id: str | None
    initial_match_decision: MatchDecision | None
    now: datetime


@dataclass(frozen=True, slots=True)
class AdvanceVerticalSliceRun:
    expected_version: int
    completed_task_id: str
    completed_task_version: int
    highest_hint_level: int
    next_task_id: str | None
    next_task_type: TaskType | None
    next_content_version_id: str | None
    match_decision: MatchDecision | None
    now: datetime
    ended_early: bool = False


@dataclass(frozen=True, slots=True)
class RecordDifficultyFeedback:
    expected_version: int
    rating: DifficultyRating | None
    skipped: bool
    now: datetime


@dataclass(frozen=True, slots=True)
class ReserveNextTask:
    expected_version: int
    placeholder_id: str
    planned_task_type: TaskType
    reason_code: str
    now: datetime


@dataclass(frozen=True, slots=True)
class CompleteVerticalSliceRun:
    expected_version: int
    now: datetime


@dataclass(frozen=True, slots=True)
class ApproveCalibrationFallback:
    expected_version: int
    reason_code: str
    matched_task_id: str
    matched_content_version_id: str
    match_decision: MatchDecision
    now: datetime


@dataclass(frozen=True, slots=True)
class RunTransition:
    run: "VerticalSliceRun"
    events: tuple[DomainEvent, ...]


@dataclass(frozen=True, slots=True)
class VerticalSliceRun:
    workflow_run_id: str
    learner_id: str
    learner_profile: LearnerProfileSnapshot
    run_kind: RunKind
    predecessor_run_id: str | None
    lifecycle: RunLifecycle
    stage: RunStage
    version: int
    task_refs: tuple[RunTaskRef, ...]
    match_decisions: tuple[MatchDecision, ...]
    calibration_fallback_approved: bool
    difficulty_feedback_status: DifficultyFeedbackStatus
    difficulty_rating: DifficultyRating | None
    next_task_placeholder: NextTaskPlaceholder | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(cls, command: CreateVerticalSliceRun) -> RunTransition:
        if command.run_kind is RunKind.FIRST_EXPERIENCE:
            if (
                command.initial_stage is not RunStage.CALIBRATION_A
                or command.initial_task_type is not TaskType.CALIBRATION_READING
                or command.predecessor_run_id is not None
                or command.initial_match_decision is not None
            ):
                raise DomainError(
                    PublicErrorCode.SAVE_NOT_CONFIRMED,
                    "invalid_first_experience_initial_state",
                )
        elif (
            command.initial_stage is not RunStage.MATCHED_READING
            or command.initial_task_type is not TaskType.MATCHED_READING
            or command.predecessor_run_id is None
            or command.initial_match_decision is None
            or command.initial_match_decision.selected_content_version_id
            != command.initial_content_version_id
        ):
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "invalid_practice_initial_state",
            )
        initial = RunTaskRef(
            task_id=command.initial_task_id,
            role=command.initial_stage,
            task_type=command.initial_task_type,
            content_version_id=command.initial_content_version_id,
            assigned_at=command.now,
        )
        run = cls(
            workflow_run_id=command.workflow_run_id,
            learner_id=command.learner_id,
            learner_profile=command.learner_profile,
            run_kind=command.run_kind,
            predecessor_run_id=command.predecessor_run_id,
            lifecycle=RunLifecycle.RUNNING,
            stage=command.initial_stage,
            version=1,
            task_refs=(initial,),
            match_decisions=(
                (command.initial_match_decision,)
                if command.initial_match_decision is not None
                else ()
            ),
            calibration_fallback_approved=False,
            difficulty_feedback_status=DifficultyFeedbackStatus.PENDING,
            difficulty_rating=None,
            next_task_placeholder=None,
            created_at=command.now,
            updated_at=command.now,
        )
        return RunTransition(
            run,
            (
                run._event(
                    "vertical_slice_run_created",
                    command.now,
                    {
                        "run_kind": command.run_kind.value,
                        "predecessor_run_id": command.predecessor_run_id,
                    },
                ),
                *(
                    (
                        run._event(
                            "material_match_decided",
                            command.now,
                            {
                                "decision_id": command.initial_match_decision.decision_id,
                                "selected_content_version_id": (
                                    command.initial_match_decision.selected_content_version_id
                                ),
                                "policy_version": command.initial_match_decision.policy_version,
                                "conservative": command.initial_match_decision.conservative,
                            },
                        ),
                    )
                    if command.initial_match_decision is not None
                    else ()
                ),
                run._event(
                    "run_task_assigned",
                    command.now,
                    {
                        "task_id": initial.task_id,
                        "role": initial.role.value,
                        "content_version_id": initial.content_version_id,
                    },
                ),
            ),
        )

    @property
    def current_task(self) -> RunTaskRef | None:
        if self.stage in {RunStage.WRAP_UP, RunStage.COMPLETED}:
            return None
        return self.task_refs[-1]

    def advance(self, command: AdvanceVerticalSliceRun) -> RunTransition:
        self._guard(command.expected_version, command.now)
        current = self.current_task
        if current is None or current.task_id != command.completed_task_id:
            self._invalid_state("completed_task_is_not_current_run_task")
        if current.completed_at is not None:
            self._invalid_state("run_task_completion_already_recorded")
        if command.completed_task_version < 1 or not 0 <= command.highest_hint_level <= 4:
            self._invalid("invalid_completed_task_fact")

        next_stage, required_type = self._next_stage_requirement()
        if next_stage is RunStage.WRAP_UP:
            if any(
                value is not None
                for value in (
                    command.next_task_id,
                    command.next_task_type,
                    command.next_content_version_id,
                    command.match_decision,
                )
            ):
                self._invalid("wrap_up_must_not_assign_another_task")
        else:
            if (
                command.next_task_id is None
                or command.next_task_type is not required_type
                or command.next_content_version_id is None
            ):
                self._invalid("required_next_task_assignment_missing")
            if next_stage is RunStage.MATCHED_READING:
                if (
                    command.match_decision is None
                    or command.match_decision.selected_content_version_id
                    != command.next_content_version_id
                ):
                    self._invalid("matched_reading_requires_matching_decision")
            elif command.match_decision is not None:
                self._invalid("matching_decision_only_allowed_for_matched_reading")

        completed = replace(
            current,
            completed_at=command.now,
            completed_task_version=command.completed_task_version,
            highest_hint_level=command.highest_hint_level,
        )
        refs = (*self.task_refs[:-1], completed)
        events = [
            self._event(
                (
                    "run_task_ended_early_registered"
                    if command.ended_early
                    else "run_task_completion_registered"
                ),
                command.now,
                {
                    "task_id": completed.task_id,
                    "role": completed.role.value,
                    "task_version": command.completed_task_version,
                    "outcome": "ended_early" if command.ended_early else "completed",
                },
                version=self.version + 1,
            )
        ]
        decisions = self.match_decisions
        if next_stage is not RunStage.WRAP_UP:
            assert command.next_task_id is not None
            assert command.next_task_type is not None
            assert command.next_content_version_id is not None
            assigned = RunTaskRef(
                task_id=command.next_task_id,
                role=next_stage,
                task_type=command.next_task_type,
                content_version_id=command.next_content_version_id,
                assigned_at=command.now,
            )
            refs = (*refs, assigned)
            events.append(
                self._event(
                    "run_task_assigned",
                    command.now,
                    {
                        "task_id": assigned.task_id,
                        "role": assigned.role.value,
                        "content_version_id": assigned.content_version_id,
                    },
                    version=self.version + 1,
                )
            )
            if command.match_decision is not None:
                decisions = (*decisions, command.match_decision)
                events.append(
                    self._event(
                        "material_match_decided",
                        command.now,
                        {
                            "decision_id": command.match_decision.decision_id,
                            "selected_content_version_id": (
                                command.match_decision.selected_content_version_id
                            ),
                            "policy_version": command.match_decision.policy_version,
                            "conservative": command.match_decision.conservative,
                        },
                        version=self.version + 1,
                    )
                )
        run = replace(
            self,
            stage=next_stage,
            version=self.version + 1,
            task_refs=refs,
            match_decisions=decisions,
            updated_at=command.now,
        )
        return RunTransition(run, tuple(events))

    def approve_calibration_fallback(self, command: ApproveCalibrationFallback) -> RunTransition:
        self._guard(command.expected_version, command.now)
        if self.stage not in {RunStage.CALIBRATION_A, RunStage.CALIBRATION_B}:
            self._invalid_state("calibration_fallback_only_allowed_during_calibration")
        if command.reason_code not in {"content_unavailable", "technical_recovery"}:
            self._invalid("invalid_calibration_fallback_reason")
        if command.match_decision.selected_content_version_id != command.matched_content_version_id:
            self._invalid("fallback_match_decision_mismatch")
        assigned = RunTaskRef(
            task_id=command.matched_task_id,
            role=RunStage.MATCHED_READING,
            task_type=TaskType.MATCHED_READING,
            content_version_id=command.matched_content_version_id,
            assigned_at=command.now,
        )
        run = replace(
            self,
            stage=RunStage.MATCHED_READING,
            version=self.version + 1,
            task_refs=(*self.task_refs, assigned),
            match_decisions=(*self.match_decisions, command.match_decision),
            calibration_fallback_approved=True,
            updated_at=command.now,
        )
        return RunTransition(
            run,
            (
                run._event(
                    "calibration_fallback_approved",
                    command.now,
                    {"reason_code": command.reason_code},
                ),
                run._event(
                    "material_match_decided",
                    command.now,
                    {
                        "decision_id": command.match_decision.decision_id,
                        "selected_content_version_id": (
                            command.match_decision.selected_content_version_id
                        ),
                        "policy_version": command.match_decision.policy_version,
                        "conservative": True,
                    },
                ),
                run._event(
                    "run_task_assigned",
                    command.now,
                    {
                        "task_id": assigned.task_id,
                        "role": assigned.role.value,
                        "content_version_id": assigned.content_version_id,
                    },
                ),
            ),
        )

    def record_difficulty_feedback(self, command: RecordDifficultyFeedback) -> RunTransition:
        self._guard(command.expected_version, command.now)
        if self.stage is not RunStage.WRAP_UP:
            self._invalid_state("difficulty_feedback_only_allowed_during_wrap_up")
        if self.difficulty_feedback_status is not DifficultyFeedbackStatus.PENDING:
            self._invalid_state("difficulty_feedback_already_recorded")
        if command.skipped == (command.rating is not None):
            self._invalid("submit_rating_or_skip_exactly_once")
        status = (
            DifficultyFeedbackStatus.SKIPPED
            if command.skipped
            else DifficultyFeedbackStatus.SUBMITTED
        )
        run = replace(
            self,
            version=self.version + 1,
            difficulty_feedback_status=status,
            difficulty_rating=command.rating,
            updated_at=command.now,
        )
        return RunTransition(
            run,
            (
                run._event(
                    "difficulty_feedback_recorded",
                    command.now,
                    {
                        "status": status.value,
                        "rating": command.rating.value if command.rating else None,
                    },
                ),
            ),
        )

    def reserve_next_task(self, command: ReserveNextTask) -> RunTransition:
        self._guard(command.expected_version, command.now)
        if self.stage is not RunStage.WRAP_UP:
            self._invalid_state("next_task_only_allowed_during_wrap_up")
        if self.next_task_placeholder is not None:
            self._invalid_state("next_task_placeholder_already_exists")
        if command.reason_code not in {"continue_matched_practice", "review_priority_gap"}:
            self._invalid("invalid_next_task_reason")
        placeholder = NextTaskPlaceholder(
            placeholder_id=command.placeholder_id,
            planned_task_type=command.planned_task_type,
            reason_code=command.reason_code,
            created_at=command.now,
        )
        run = replace(
            self,
            version=self.version + 1,
            next_task_placeholder=placeholder,
            updated_at=command.now,
        )
        return RunTransition(
            run,
            (
                run._event(
                    "next_task_placeholder_created",
                    command.now,
                    {
                        "placeholder_id": placeholder.placeholder_id,
                        "planned_task_type": placeholder.planned_task_type.value,
                        "reason_code": placeholder.reason_code,
                    },
                ),
            ),
        )

    def complete(self, command: CompleteVerticalSliceRun) -> RunTransition:
        self._guard(command.expected_version, command.now)
        gaps = self.completion_gaps()
        if gaps:
            self._invalid("run_completion_requirements_missing:" + ",".join(gaps))
        run = replace(
            self,
            lifecycle=RunLifecycle.COMPLETED,
            stage=RunStage.COMPLETED,
            version=self.version + 1,
            updated_at=command.now,
        )
        return RunTransition(
            run,
            (run._event("vertical_slice_run_completed", command.now),),
        )

    def completion_gaps(self) -> tuple[str, ...]:
        if self.lifecycle is RunLifecycle.COMPLETED:
            return ()
        gaps: list[str] = []
        completed_roles = {item.role for item in self.task_refs if item.completed_at is not None}
        calibration_complete = {
            RunStage.CALIBRATION_A,
            RunStage.CALIBRATION_B,
        }.issubset(completed_roles)
        if (
            self.run_kind is RunKind.FIRST_EXPERIENCE
            and not calibration_complete
            and not self.calibration_fallback_approved
        ):
            gaps.append("two_calibrations_or_approved_fallback")
        if RunStage.MATCHED_READING not in completed_roles:
            gaps.append("matched_reading_completed")
        if RunStage.MICRO_EXPRESSION not in completed_roles:
            gaps.append("micro_expression_completed")
        if self.difficulty_feedback_status is DifficultyFeedbackStatus.PENDING:
            gaps.append("difficulty_feedback_or_explicit_skip")
        if self.next_task_placeholder is None:
            gaps.append("next_task_placeholder")
        if self.stage is not RunStage.WRAP_UP:
            gaps.append("run_not_in_wrap_up")
        return tuple(gaps)

    def require_version(self, expected_version: int) -> None:
        if expected_version != self.version:
            raise DomainError(
                PublicErrorCode.SESSION_CONFLICT,
                "run_expected_version_mismatch",
                self.version,
            )

    def _next_stage_requirement(self) -> tuple[RunStage, TaskType | None]:
        mapping: dict[RunStage, tuple[RunStage, TaskType | None]] = {
            RunStage.CALIBRATION_A: (
                RunStage.CALIBRATION_B,
                TaskType.CALIBRATION_READING,
            ),
            RunStage.CALIBRATION_B: (
                RunStage.MATCHED_READING,
                TaskType.MATCHED_READING,
            ),
            RunStage.MATCHED_READING: (
                RunStage.MICRO_EXPRESSION,
                TaskType.MICRO_EXPRESSION,
            ),
            RunStage.MICRO_EXPRESSION: (RunStage.WRAP_UP, None),
        }
        result = mapping.get(self.stage)
        if result is None:
            self._invalid_state("run_stage_cannot_advance")
        return result

    def _guard(self, expected_version: int, now: datetime) -> None:
        self.require_version(expected_version)
        if self.lifecycle is RunLifecycle.COMPLETED:
            self._invalid_state("completed_run_is_immutable")
        if now <= self.updated_at:
            self._invalid("command_time_precedes_current_run_state")

    def _event(
        self,
        event_type: str,
        occurred_at: datetime,
        payload: dict[str, str | int | bool | None] | None = None,
        *,
        version: int | None = None,
    ) -> DomainEvent:
        return DomainEvent(
            event_id=f"event_{uuid4().hex}",
            event_type=event_type,
            aggregate_id=self.workflow_run_id,
            aggregate_version=version or self.version,
            occurred_at=occurred_at,
            payload=payload or {},
        )

    def _invalid(self, reason: str) -> NoReturn:
        raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, reason, self.version)

    def _invalid_state(self, reason: str) -> NoReturn:
        raise DomainError(PublicErrorCode.SESSION_CONFLICT, reason, self.version)
