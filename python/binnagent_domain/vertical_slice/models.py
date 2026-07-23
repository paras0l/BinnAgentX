from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class ExamTrack(StrEnum):
    ENGLISH_1 = "english_1"
    ENGLISH_2 = "english_2"


class SelfReportedLevel(StrEnum):
    WEAK = "weak"
    DEVELOPING = "developing"
    STEADY = "steady"
    UNKNOWN = "unknown"


class FeedbackDensity(StrEnum):
    MINIMAL = "minimal"
    STANDARD = "standard"
    DETAILED = "detailed"


class RightsStatus(StrEnum):
    ELIGIBLE_DEV = "eligible_dev"
    ELIGIBLE_PILOT = "eligible_pilot"
    ELIGIBLE_RELEASE = "eligible_release"


class DifficultyStatus(StrEnum):
    UNCALIBRATED = "uncalibrated"
    PILOT_ESTIMATE = "pilot_estimate"
    CALIBRATED = "calibrated"


class TaskType(StrEnum):
    CALIBRATION_READING = "calibration_reading"
    MATCHED_READING = "matched_reading"
    MICRO_EXPRESSION = "micro_expression"


class TaskState(StrEnum):
    READING = "reading"
    DRAFTING = "drafting"
    SUBMITTING = "submitting"
    SAVED = "saved"
    HINTED = "hinted"
    REVISION_REQUIRED = "revision_required"
    REVIEW_PENDING = "review_pending"
    PAUSED = "paused"
    COMPLETED = "completed"
    ENDED_EARLY = "ended_early"
    RECOVERABLE_ERROR = "recoverable_error"


class AnnotationKind(StrEnum):
    VOCABULARY = "vocabulary"
    GRAMMAR = "grammar"
    CLAIM = "claim"
    EVIDENCE = "evidence"
    LOGIC = "logic"
    UNCERTAIN = "uncertain"
    REUSABLE_EXPRESSION = "reusable_expression"


class AttemptIndependence(StrEnum):
    INDEPENDENT = "independent"
    HINTED_LOW = "hinted_low"
    HINTED_HIGH = "hinted_high"


class InterventionType(StrEnum):
    TASK_RESTATEMENT = "task_restatement"
    LOCAL_HINT = "local_hint"
    CANDIDATE_COMPARISON = "candidate_comparison"
    MINIMAL_EXAMPLE = "minimal_example"
    PRIORITY_FEEDBACK = "priority_feedback"


class InterventionResult(StrEnum):
    DELIVERED = "delivered"
    REJECTED = "rejected"
    FALLBACK = "fallback"
    REVIEW_PENDING = "review_pending"


class RevisionResult(StrEnum):
    CANDIDATE_IMPROVED = "candidate_improved"
    UNCHANGED = "unchanged"
    NEEDS_REVIEW = "needs_review"


class ActorType(StrEnum):
    LEARNER = "learner"
    SYSTEM = "system"
    MODEL = "model"
    DEVELOPER_REVIEWER = "developer_reviewer"


@dataclass(frozen=True, slots=True)
class LearnerProfileSnapshot:
    learner_snapshot_id: str
    exam_track: ExamTrack
    target_score: int
    weekly_minutes: int
    self_reported_level: SelfReportedLevel
    prior_exam_seen: bool
    session_minutes: int
    feedback_density: FeedbackDensity
    timed: bool
    evidence_count: int
    confidence_band: str
    created_at: datetime
    current_level: str | None = None
    level_assessment_id: str | None = None


@dataclass(frozen=True, slots=True)
class MaterialRef:
    content_id: str
    content_version_id: str
    content_hash: str
    rights_status: RightsStatus
    difficulty_status: DifficultyStatus


@dataclass(frozen=True, slots=True)
class TextSpan:
    paragraph_id: str
    start: int
    end: int
    text_quote: str
    text_hash: str


@dataclass(frozen=True, slots=True)
class Annotation:
    annotation_id: str
    task_id: str
    content_version_id: str
    kind: AnnotationKind
    span: TextSpan
    user_explanation: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class Attempt:
    attempt_version_id: str
    task_id: str
    version: int
    text: str
    content_hash: str
    independence: AttemptIndependence
    created_at: datetime


@dataclass(frozen=True, slots=True)
class AiIntervention:
    intervention_id: str
    task_id: str
    input_attempt_version_id: str
    hint_level: int
    intervention_type: InterventionType
    model_adapter: str
    prompt_version: str
    reason_code: str
    delivered_content: str
    content_hash: str
    result_status: InterventionResult
    created_at: datetime


@dataclass(frozen=True, slots=True)
class RevisionEvent:
    revision_event_id: str
    task_id: str
    from_attempt_version_id: str
    to_attempt_version_id: str
    intervention_id: str | None
    result_status: RevisionResult
    created_at: datetime


@dataclass(frozen=True, slots=True)
class MaterialAssignment:
    assignment_id: str
    material: MaterialRef
    reason_code: str
    eligible_when_assigned: bool
    assigned_at: datetime


@dataclass(frozen=True, slots=True)
class MaterialInvalidation:
    invalidation_id: str
    assignment_id: str
    reason_code: str
    invalidated_at: datetime
