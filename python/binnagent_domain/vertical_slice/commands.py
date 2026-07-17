from dataclasses import dataclass
from datetime import datetime

from binnagent_domain.vertical_slice.models import (
    AnnotationKind,
    AttemptIndependence,
    InterventionResult,
    InterventionType,
    LearnerProfileSnapshot,
    MaterialRef,
    RevisionResult,
    TaskType,
    TextSpan,
)


@dataclass(frozen=True, slots=True)
class CreateTask:
    task_id: str
    workflow_run_id: str
    task_type: TaskType
    learner_profile: LearnerProfileSnapshot
    material: MaterialRef
    assignment_id: str
    now: datetime


@dataclass(frozen=True, slots=True)
class AddAnnotation:
    expected_version: int
    annotation_id: str
    kind: AnnotationKind
    span: TextSpan
    user_explanation: str
    now: datetime


@dataclass(frozen=True, slots=True)
class SaveAttempt:
    expected_version: int
    attempt_version_id: str
    text: str
    independence: AttemptIndependence
    now: datetime


@dataclass(frozen=True, slots=True)
class RecordIntervention:
    expected_version: int
    intervention_id: str
    input_attempt_version_id: str
    hint_level: int
    intervention_type: InterventionType
    model_adapter: str
    prompt_version: str
    reason_code: str
    delivered_content: str
    result_status: InterventionResult
    now: datetime


@dataclass(frozen=True, slots=True)
class RecordRevision:
    expected_version: int
    revision_event_id: str
    from_attempt_version_id: str
    to_attempt_version_id: str
    intervention_id: str | None
    result_status: RevisionResult
    now: datetime


@dataclass(frozen=True, slots=True)
class ReplaceMaterial:
    expected_version: int
    assignment_id: str
    replacement: MaterialRef
    reason_code: str
    now: datetime


@dataclass(frozen=True, slots=True)
class PauseTask:
    expected_version: int
    now: datetime


@dataclass(frozen=True, slots=True)
class ResumeTask:
    expected_version: int
    current_rights_status: str
    now: datetime


@dataclass(frozen=True, slots=True)
class CompleteTask:
    expected_version: int
    now: datetime


@dataclass(frozen=True, slots=True)
class EndTaskEarly:
    expected_version: int
    now: datetime
