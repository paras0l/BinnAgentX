from enum import StrEnum


class EvidenceLevel(StrEnum):
    ATTEMPTED = "attempted"
    COMPLETED_THIS_TIME = "completed_this_time"
    INDEPENDENT_NEW_MATERIAL = "independent_new_material"
    DELAYED_INDEPENDENT = "delayed_independent"


def can_describe_stable_mastery(level: EvidenceLevel) -> bool:
    """Keep immediate completion separate from delayed independent evidence."""
    return level is EvidenceLevel.DELAYED_INDEPENDENT
