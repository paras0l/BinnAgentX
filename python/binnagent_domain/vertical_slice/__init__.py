"""Framework-independent domain model for the first learning vertical slice."""

from binnagent_domain.vertical_slice.aggregate import LearningTask
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
from binnagent_domain.vertical_slice.models import (
    ActorType,
    AnnotationKind,
    AttemptIndependence,
    DifficultyStatus,
    ExamTrack,
    FeedbackDensity,
    InterventionResult,
    InterventionType,
    MaterialRef,
    RightsStatus,
    SelfReportedLevel,
    TaskState,
    TaskType,
)

__all__ = [
    "ActorType",
    "AddAnnotation",
    "AnnotationKind",
    "AttemptIndependence",
    "CompleteTask",
    "CreateTask",
    "DifficultyStatus",
    "DomainError",
    "ExamTrack",
    "FeedbackDensity",
    "InterventionResult",
    "InterventionType",
    "LearningTask",
    "MaterialRef",
    "PauseTask",
    "RecordIntervention",
    "RecordRevision",
    "ReplaceMaterial",
    "ResumeTask",
    "RightsStatus",
    "SaveAttempt",
    "SelfReportedLevel",
    "TaskState",
    "TaskType",
]
