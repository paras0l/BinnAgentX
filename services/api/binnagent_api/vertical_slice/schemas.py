from datetime import datetime
from typing import Annotated, Literal

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
from binnagent_domain.vertical_slice.run import DifficultyRating
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
    delivered_content: Annotated[str, Field(min_length=1, max_length=4000)]
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


class HintRequest(VersionedCommandRequest):
    input_attempt_version_id: Identifier


class AttemptView(BaseModel):
    attempt_version_id: str
    version: int
    text: str
    content_hash: str
    independence: str
    created_at: datetime


class AnnotationSpanView(BaseModel):
    paragraph_id: str
    start: int
    end: int
    text_quote: str


class AnnotationView(BaseModel):
    annotation_id: str
    kind: AnnotationKind
    span: AnnotationSpanView
    user_explanation: str
    created_at: datetime


class InterventionView(BaseModel):
    intervention_id: str
    input_attempt_version_id: str
    hint_level: int
    intervention_type: str
    reason_code: str
    delivered_content: str
    content_hash: str
    result_status: str
    created_at: datetime


class RevisionView(BaseModel):
    revision_event_id: str
    from_attempt_version_id: str
    to_attempt_version_id: str
    intervention_id: str | None
    result_status: str
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
    annotations: list[AnnotationView]
    attempts: list[AttemptView]
    interventions: list[InterventionView]
    revisions: list[RevisionView]
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


class CreateRunRequest(BaseModel):
    learner_profile: ProfileInput


class AdvanceRunRequest(VersionedCommandRequest):
    pass


class DifficultyFeedbackRequest(VersionedCommandRequest):
    rating: DifficultyRating | None = None
    skipped: bool = False


class NextTaskPlaceholderRequest(VersionedCommandRequest):
    planned_task_type: TaskType
    reason_code: Annotated[
        str,
        Field(pattern=r"^(continue_matched_practice|review_priority_gap)$"),
    ]


class CalibrationFallbackRequest(VersionedCommandRequest):
    reason_code: Annotated[
        str,
        Field(pattern=r"^(content_unavailable|technical_recovery)$"),
    ]


class RunTaskRefView(BaseModel):
    task_id: str
    role: str
    task_type: str
    content_version_id: str
    completed: bool
    completed_task_version: int | None
    highest_hint_level: int | None


class MatchDecisionView(BaseModel):
    decision_id: str
    selected_content_version_id: str
    policy_version: str
    conservative: bool
    reason_codes: list[str]


class LearnerRunView(BaseModel):
    workflow_run_id: str
    lifecycle: str
    stage: str
    version: int
    current_task_id: str | None
    task_refs: list[RunTaskRefView]
    match_decisions: list[MatchDecisionView]
    calibration_fallback_approved: bool
    difficulty_feedback_status: str
    difficulty_rating: str | None
    next_task_placeholder_id: str | None
    completion_gaps: list[str]
    replayed: bool = False


class ControlRunReplayView(LearnerRunView):
    event_chain: list[dict[str, object]]


class LearnerParagraphView(BaseModel):
    paragraph_id: str
    text: str


class LearnerQuestionOptionView(BaseModel):
    option_id: str
    text: str


class LearnerReadingQuestionView(BaseModel):
    question_id: str
    prompt: str
    options: list[LearnerQuestionOptionView]


class LearnerReadingMaterialView(BaseModel):
    content_type: Literal["calibration_reading", "matched_reading"]
    content_version_id: str
    title: str
    paragraphs: list[LearnerParagraphView]
    allowed_annotations: list[str]
    question: LearnerReadingQuestionView


class LearnerOutputRequirementView(BaseModel):
    sentence_min: int
    sentence_max: int
    word_min: int
    word_max: int
    language: str


class LearnerExpressionMaterialView(BaseModel):
    content_type: Literal["micro_expression"]
    content_version_id: str
    title: str
    situation: str
    audience: str
    purpose: str
    target_argument_move: str
    optional_active_resource: str
    forbidden_mechanical_use: list[str]
    output_requirement: LearnerOutputRequirementView
    v1_minimum: list[str]


class LearnerWorkspaceView(BaseModel):
    run: LearnerRunView
    task: LearnerTaskView | None
    material: LearnerReadingMaterialView | LearnerExpressionMaterialView | None


class LearnerResumeWorkspaceView(BaseModel):
    available: bool
    workspace: LearnerWorkspaceView | None
