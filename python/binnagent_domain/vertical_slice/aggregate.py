from dataclasses import dataclass, replace
from datetime import datetime
from hashlib import sha256
from typing import NoReturn, Self
from uuid import uuid4

from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.commands import (
    AddAnnotation,
    CompleteTask,
    CreateTask,
    PauseTask,
    RecordIntervention,
    RecordRevision,
    ReplaceMaterial,
    ResumeTask,
    SaveAttempt,
)
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.events import DomainEvent
from binnagent_domain.vertical_slice.models import (
    AiIntervention,
    Annotation,
    Attempt,
    AttemptIndependence,
    InterventionResult,
    LearnerProfileSnapshot,
    MaterialAssignment,
    MaterialInvalidation,
    MaterialRef,
    RevisionEvent,
    RightsStatus,
    TaskState,
    TaskType,
)


@dataclass(frozen=True, slots=True)
class Transition:
    task: "LearningTask"
    events: tuple[DomainEvent, ...]


@dataclass(frozen=True, slots=True)
class LearningTask:
    task_id: str
    workflow_run_id: str
    task_type: TaskType
    learner_profile: LearnerProfileSnapshot
    state: TaskState
    version: int
    highest_hint_level: int
    material_assignments: tuple[MaterialAssignment, ...]
    material_invalidations: tuple[MaterialInvalidation, ...]
    annotations: tuple[Annotation, ...]
    attempts: tuple[Attempt, ...]
    interventions: tuple[AiIntervention, ...]
    revisions: tuple[RevisionEvent, ...]
    state_before_pause: TaskState | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(cls, command: CreateTask) -> Transition:
        _require_eligible_material(command.material)
        _require_profile(command.learner_profile)
        task = cls(
            task_id=command.task_id,
            workflow_run_id=command.workflow_run_id,
            task_type=command.task_type,
            learner_profile=command.learner_profile,
            state=TaskState.READING,
            version=1,
            highest_hint_level=0,
            material_assignments=(
                MaterialAssignment(
                    assignment_id=command.assignment_id,
                    material=command.material,
                    reason_code="initial_assignment",
                    eligible_when_assigned=True,
                    assigned_at=command.now,
                ),
            ),
            material_invalidations=(),
            annotations=(),
            attempts=(),
            interventions=(),
            revisions=(),
            state_before_pause=None,
            created_at=command.now,
            updated_at=command.now,
        )
        return Transition(task, (task._event("task_created", command.now),))

    @property
    def current_material(self) -> MaterialRef:
        return self.material_assignments[-1].material

    def add_annotation(self, command: AddAnnotation) -> Transition:
        self._guard_mutation(command.expected_version)
        if self.state not in {TaskState.READING, TaskState.DRAFTING, TaskState.SAVED}:
            self._invalid_state("annotation_not_allowed")
        if any(item.annotation_id == command.annotation_id for item in self.annotations):
            self._invalid("annotation_id_already_exists")
        span = command.span
        invalid_span = (
            span.start < 0
            or span.end <= span.start
            or span.end - span.start != len(span.text_quote)
            or len(span.text_quote) > 1000
        )
        if invalid_span:
            self._invalid("invalid_annotation_span")
        if _hash(span.text_quote) != span.text_hash:
            self._invalid("annotation_text_hash_mismatch")
        explanation = command.user_explanation.strip()
        if not explanation or len(explanation) > 2000:
            self._invalid("invalid_user_explanation")
        annotation = Annotation(
            annotation_id=command.annotation_id,
            task_id=self.task_id,
            content_version_id=self.current_material.content_version_id,
            kind=command.kind,
            span=span,
            user_explanation=explanation,
            created_at=command.now,
        )
        task = self._advance(
            command.now,
            state=TaskState.DRAFTING,
            annotations=(*self.annotations, annotation),
        )
        return Transition(
            task,
            (
                task._event(
                    "annotation_saved",
                    command.now,
                    {"annotation_id": annotation.annotation_id, "kind": annotation.kind.value},
                ),
            ),
        )

    def save_attempt(self, command: SaveAttempt) -> Transition:
        self._guard_mutation(command.expected_version)
        if self.state in {TaskState.REVIEW_PENDING, TaskState.RECOVERABLE_ERROR}:
            self._invalid_state("attempt_not_allowed")
        if any(item.attempt_version_id == command.attempt_version_id for item in self.attempts):
            self._invalid("attempt_id_already_exists")
        text = command.text.strip()
        if not text or len(text) > 20000:
            self._invalid("invalid_attempt_text")
        required_independence = self._required_independence()
        if command.independence is not required_independence:
            self._invalid(f"attempt_must_be_{required_independence.value}")
        attempt = Attempt(
            attempt_version_id=command.attempt_version_id,
            task_id=self.task_id,
            version=len(self.attempts) + 1,
            text=text,
            content_hash=_hash(text),
            independence=command.independence,
            created_at=command.now,
        )
        task = self._advance(
            command.now,
            state=TaskState.SAVED,
            attempts=(*self.attempts, attempt),
        )
        event_type = (
            "independent_attempt_saved"
            if attempt.independence is AttemptIndependence.INDEPENDENT
            else "attempt_saved_after_hint"
        )
        return Transition(
            task,
            (
                task._event(
                    event_type,
                    command.now,
                    {
                        "attempt_version_id": attempt.attempt_version_id,
                        "attempt_version": attempt.version,
                        "independence": attempt.independence.value,
                        "content_hash": attempt.content_hash,
                    },
                ),
            ),
        )

    def record_intervention(self, command: RecordIntervention) -> Transition:
        self._guard_mutation(command.expected_version)
        if not 1 <= command.hint_level <= 4:
            self._invalid("hint_level_out_of_range")
        current_attempts = self.current_attempts
        if not current_attempts:
            self._invalid("learner_attempt_required_before_intervention")
        if current_attempts[-1].attempt_version_id != command.input_attempt_version_id:
            self._invalid("intervention_must_reference_latest_attempt")
        if any(item.intervention_id == command.intervention_id for item in self.interventions):
            self._invalid("intervention_id_already_exists")
        if self._has_unanswered_intervention():
            self._invalid("learner_output_required_after_intervention")
        intervention = AiIntervention(
            intervention_id=command.intervention_id,
            task_id=self.task_id,
            input_attempt_version_id=command.input_attempt_version_id,
            hint_level=command.hint_level,
            intervention_type=command.intervention_type,
            model_adapter=command.model_adapter,
            prompt_version=command.prompt_version,
            result_status=command.result_status,
            created_at=command.now,
        )
        state = (
            TaskState.HINTED
            if command.result_status in {InterventionResult.DELIVERED, InterventionResult.FALLBACK}
            else TaskState.REVIEW_PENDING
        )
        delivered = command.result_status in {
            InterventionResult.DELIVERED,
            InterventionResult.FALLBACK,
        }
        task = self._advance(
            command.now,
            state=state,
            highest_hint_level=(
                max(self.highest_hint_level, command.hint_level)
                if delivered
                else self.highest_hint_level
            ),
            interventions=(*self.interventions, intervention),
        )
        event_type = (
            "ai_intervention_delivered"
            if command.result_status in {InterventionResult.DELIVERED, InterventionResult.FALLBACK}
            else "feedback_evidence_rejected"
        )
        return Transition(
            task,
            (
                task._event(
                    event_type,
                    command.now,
                    {
                        "intervention_id": intervention.intervention_id,
                        "input_attempt_version_id": intervention.input_attempt_version_id,
                        "hint_level": intervention.hint_level,
                        "result_status": intervention.result_status.value,
                        "model_adapter": intervention.model_adapter,
                        "prompt_version": intervention.prompt_version,
                    },
                ),
            ),
        )

    def record_revision(self, command: RecordRevision) -> Transition:
        self._guard_mutation(command.expected_version)
        if any(item.revision_event_id == command.revision_event_id for item in self.revisions):
            self._invalid("revision_id_already_exists")
        attempts = {item.attempt_version_id: item for item in self.attempts}
        before = attempts.get(command.from_attempt_version_id)
        after = attempts.get(command.to_attempt_version_id)
        if before is None or after is None or after.version <= before.version:
            self._invalid("invalid_revision_attempt_chain")
        current_attempt_ids = {item.attempt_version_id for item in self.current_attempts}
        if (
            before.attempt_version_id not in current_attempt_ids
            or after.attempt_version_id not in current_attempt_ids
        ):
            self._invalid("revision_cannot_cross_material_assignments")
        if command.intervention_id is not None:
            intervention = next(
                (
                    item
                    for item in self.interventions
                    if item.intervention_id == command.intervention_id
                ),
                None,
            )
            if (
                intervention is None
                or intervention.input_attempt_version_id != before.attempt_version_id
            ):
                self._invalid("invalid_revision_intervention_chain")
        revision = RevisionEvent(
            revision_event_id=command.revision_event_id,
            task_id=self.task_id,
            from_attempt_version_id=before.attempt_version_id,
            to_attempt_version_id=after.attempt_version_id,
            intervention_id=command.intervention_id,
            result_status=command.result_status,
            created_at=command.now,
        )
        task = self._advance(
            command.now,
            state=TaskState.SAVED,
            revisions=(*self.revisions, revision),
        )
        return Transition(
            task,
            (
                task._event(
                    "revision_saved",
                    command.now,
                    {
                        "revision_event_id": revision.revision_event_id,
                        "from_attempt_version_id": revision.from_attempt_version_id,
                        "to_attempt_version_id": revision.to_attempt_version_id,
                        "intervention_id": revision.intervention_id,
                        "result_status": revision.result_status.value,
                    },
                ),
            ),
        )

    def replace_material(self, command: ReplaceMaterial) -> Transition:
        self._guard_mutation(command.expected_version)
        _require_eligible_material(command.replacement)
        if command.replacement.content_version_id == self.current_material.content_version_id:
            self._invalid("replacement_must_be_a_new_content_version")
        if command.reason_code not in {"material_seen", "content_withdrawn"}:
            self._invalid("invalid_replacement_reason")
        previous = self.material_assignments[-1]
        invalidation = MaterialInvalidation(
            invalidation_id=f"invalidation_{uuid4().hex}",
            assignment_id=previous.assignment_id,
            reason_code=command.reason_code,
            invalidated_at=command.now,
        )
        replacement = MaterialAssignment(
            assignment_id=command.assignment_id,
            material=command.replacement,
            reason_code=command.reason_code,
            eligible_when_assigned=True,
            assigned_at=command.now,
        )
        task = self._advance(
            command.now,
            state=TaskState.READING,
            highest_hint_level=0,
            material_assignments=(*self.material_assignments, replacement),
            material_invalidations=(*self.material_invalidations, invalidation),
        )
        events = (
            task._event(
                "material_seen_reported"
                if command.reason_code == "material_seen"
                else "content_access_blocked",
                command.now,
                {"content_version_id": previous.material.content_version_id},
            ),
            task._event(
                "material_replaced",
                command.now,
                {
                    "from_content_version_id": previous.material.content_version_id,
                    "to_content_version_id": replacement.material.content_version_id,
                    "reason_code": command.reason_code,
                },
            ),
        )
        return Transition(task, events)

    def pause(self, command: PauseTask) -> Transition:
        self._guard_mutation(command.expected_version)
        if self.state is TaskState.PAUSED:
            self._invalid_state("task_already_paused")
        task = self._advance(
            command.now,
            state=TaskState.PAUSED,
            state_before_pause=self.state,
        )
        return Transition(task, (task._event("task_paused", command.now),))

    def resume(self, command: ResumeTask) -> Transition:
        self._guard_mutation(command.expected_version, allow_paused=True)
        if self.state is not TaskState.PAUSED or self.state_before_pause is None:
            self._invalid_state("task_is_not_paused")
        if command.current_rights_status not in {item.value for item in RightsStatus}:
            raise DomainError(
                PublicErrorCode.MATERIAL_REPLACED,
                "content_access_blocked_before_resume",
                self.version,
            )
        task = self._advance(
            command.now,
            state=self.state_before_pause,
            state_before_pause=None,
        )
        return Transition(task, (task._event("task_resumed", command.now),))

    def complete(self, command: CompleteTask) -> Transition:
        self._guard_mutation(command.expected_version)
        missing = self.completion_gaps()
        if missing:
            self._invalid("completion_requirements_missing:" + ",".join(missing))
        task = self._advance(command.now, state=TaskState.COMPLETED)
        return Transition(
            task,
            (
                task._event(
                    "task_completed",
                    command.now,
                    {"highest_hint_level": task.highest_hint_level},
                ),
            ),
        )

    def completion_gaps(self) -> tuple[str, ...]:
        gaps: list[str] = []
        current_attempts = self.current_attempts
        current_attempt_ids = {item.attempt_version_id for item in current_attempts}
        if not current_attempts:
            gaps.append("learner_attempt")
        if self.task_type is TaskType.MATCHED_READING and not self.current_annotations:
            gaps.append("cognitive_annotation")
        for intervention in self._current_interventions():
            if intervention.result_status not in {
                InterventionResult.DELIVERED,
                InterventionResult.FALLBACK,
            }:
                continue
            source = next(
                item
                for item in current_attempts
                if item.attempt_version_id == intervention.input_attempt_version_id
            )
            if not any(item.version > source.version for item in current_attempts):
                gaps.append("learner_output_after_intervention")
                break
        if self.task_type is TaskType.MICRO_EXPRESSION:
            delivered_feedback = [
                item
                for item in self._current_interventions()
                if item.intervention_type.value == "priority_feedback"
                and item.result_status is InterventionResult.DELIVERED
            ]
            current_revisions = [
                item
                for item in self.revisions
                if item.from_attempt_version_id in current_attempt_ids
                and item.to_attempt_version_id in current_attempt_ids
            ]
            if delivered_feedback and not current_revisions:
                gaps.append("learner_revision_after_feedback")
        return tuple(gaps)

    def _required_independence(self) -> AttemptIndependence:
        if not self.current_attempts or not self._has_unanswered_intervention():
            return AttemptIndependence.INDEPENDENT
        latest = self.interventions[-1]
        return (
            AttemptIndependence.HINTED_LOW
            if latest.hint_level <= 2
            else AttemptIndependence.HINTED_HIGH
        )

    def _has_unanswered_intervention(self) -> bool:
        current_attempts = self.current_attempts
        current_interventions = self._current_interventions()
        if not current_interventions or not current_attempts:
            return False
        latest = current_interventions[-1]
        if latest.result_status not in {InterventionResult.DELIVERED, InterventionResult.FALLBACK}:
            return False
        source = next(
            item
            for item in current_attempts
            if item.attempt_version_id == latest.input_attempt_version_id
        )
        return current_attempts[-1].version == source.version

    @property
    def current_attempts(self) -> tuple[Attempt, ...]:
        assigned_at = self.material_assignments[-1].assigned_at
        return tuple(item for item in self.attempts if item.created_at >= assigned_at)

    @property
    def current_annotations(self) -> tuple[Annotation, ...]:
        current_version = self.current_material.content_version_id
        return tuple(
            item for item in self.annotations if item.content_version_id == current_version
        )

    def _current_interventions(self) -> tuple[AiIntervention, ...]:
        attempt_ids = {item.attempt_version_id for item in self.current_attempts}
        return tuple(
            item for item in self.interventions if item.input_attempt_version_id in attempt_ids
        )

    def _guard_mutation(self, expected_version: int, *, allow_paused: bool = False) -> None:
        if expected_version != self.version:
            raise DomainError(
                PublicErrorCode.SESSION_CONFLICT,
                "expected_version_mismatch",
                self.version,
            )
        if self.state is TaskState.COMPLETED:
            self._invalid_state("completed_task_is_immutable")
        if self.state is TaskState.PAUSED and not allow_paused:
            self._invalid_state("paused_task_requires_resume")

    def _advance(self, now: datetime, **changes: object) -> Self:
        if now <= self.updated_at:
            self._invalid("command_time_precedes_current_state")
        return replace(
            self,
            version=self.version + 1,
            updated_at=now,
            **changes,  # type: ignore[arg-type]
        )

    def _event(
        self,
        event_type: str,
        occurred_at: datetime,
        payload: dict[str, str | int | None] | None = None,
    ) -> DomainEvent:
        return DomainEvent(
            event_id=f"event_{uuid4().hex}",
            event_type=event_type,
            aggregate_id=self.task_id,
            aggregate_version=self.version,
            occurred_at=occurred_at,
            payload=payload or {},
        )

    def _invalid(self, reason: str) -> NoReturn:
        raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, reason, self.version)

    def _invalid_state(self, reason: str) -> NoReturn:
        raise DomainError(PublicErrorCode.SESSION_CONFLICT, reason, self.version)


def _hash(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _require_eligible_material(material: MaterialRef) -> None:
    if material.rights_status not in set(RightsStatus):
        raise DomainError(PublicErrorCode.CONTENT_NOT_ELIGIBLE, "content_rights_not_eligible")
    invalid_hash = len(material.content_hash) != 64 or any(
        char not in "0123456789abcdef" for char in material.content_hash
    )
    if invalid_hash:
        raise DomainError(PublicErrorCode.CONTENT_NOT_ELIGIBLE, "invalid_content_hash")


def _require_profile(profile: LearnerProfileSnapshot) -> None:
    if not 0 <= profile.target_score <= 100:
        raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "invalid_target_score")
    if not 30 <= profile.weekly_minutes <= 10080:
        raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "invalid_weekly_minutes")
    if not 10 <= profile.session_minutes <= 180:
        raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "invalid_session_minutes")
    if profile.evidence_count < 0 or profile.confidence_band not in {"low", "medium", "high"}:
        raise DomainError(PublicErrorCode.SAVE_NOT_CONFIRMED, "invalid_profile_evidence")
