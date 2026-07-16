from datetime import datetime
from typing import Annotated

from binnagent_domain.vertical_slice.models import (
    AnnotationKind,
    AttemptIndependence,
    ExamTrack,
    FeedbackDensity,
    InterventionResult,
    InterventionType,
    RevisionResult,
    SelfReportedLevel,
    TaskType,
)
from pydantic import BaseModel, Field

Identifier = Annotated[str, Field(pattern=r"^[a-z][a-z0-9_]{7,127}$")]
Sha256 = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class ProfileInput(BaseModel):
    exam_track: ExamTrack
    target_score: Annotated[int, Field(ge=0, le=100)]
    weekly_minutes: Annotated[int, Field(ge=30, le=10080)]
    self_reported_level: SelfReportedLevel
    prior_exam_seen: bool
    session_minutes: Annotated[int, Field(ge=10, le=180)]
    feedback_density: FeedbackDensity
    timed: bool
    evidence_count: Annotated[int, Field(ge=0)] = 0
    confidence_band: Annotated[str, Field(pattern=r"^(low|medium|high)$")] = "low"


class CreateTaskRequest(BaseModel):
    task_type: TaskType
    learner_profile: ProfileInput


class SpanInput(BaseModel):
    paragraph_id: Identifier
    start: Annotated[int, Field(ge=0)]
    end: Annotated[int, Field(ge=1)]
    text_quote: Annotated[str, Field(min_length=1, max_length=1000)]
    text_hash: Sha256


class AnnotationRequest(BaseModel):
    expected_version: Annotated[int, Field(ge=1)]
    kind: AnnotationKind
    span: SpanInput
    user_explanation: Annotated[str, Field(min_length=1, max_length=2000)]


class AttemptRequest(BaseModel):
    expected_version: Annotated[int, Field(ge=1)]
    text: Annotated[str, Field(min_length=1, max_length=20000)]
    independence: AttemptIndependence


class InterventionRequest(BaseModel):
    expected_version: Annotated[int, Field(ge=1)]
    input_attempt_version_id: Identifier
    hint_level: Annotated[int, Field(ge=1, le=4)]
    intervention_type: InterventionType
    model_adapter: Annotated[str, Field(pattern=r"^[a-z][a-z0-9_-]{1,63}$")]
    prompt_version: Identifier
    result_status: InterventionResult
    reason_code: Annotated[str, Field(pattern=r"^[a-z][a-z0-9_]{2,63}$")]


class RevisionRequest(BaseModel):
    expected_version: Annotated[int, Field(ge=1)]
    from_attempt_version_id: Identifier
    to_attempt_version_id: Identifier
    intervention_id: Identifier | None = None
    result_status: RevisionResult


class VersionedCommandRequest(BaseModel):
    expected_version: Annotated[int, Field(ge=1)]


class AttemptView(BaseModel):
    attempt_version_id: str
    version: int
    text: str
    content_hash: str
    independence: str
    created_at: datetime


class LearnerTaskView(BaseModel):
    task_id: str
    workflow_run_id: str
    task_type: str
    state: str
    version: int
    highest_hint_level: int
    current_content_version_id: str
    annotation_count: int
    attempts: list[AttemptView]
    intervention_count: int
    revision_count: int
    completion_gaps: list[str]
    replayed: bool = False


class ControlReplayView(BaseModel):
    task_id: str
    workflow_run_id: str
    state: str
    version: int
    evidence_counts: dict[str, int]
    event_chain: list[dict[str, object]]
