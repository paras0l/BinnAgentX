from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from types import MappingProxyType

type JsonScalar = str | int | float | bool | None


@dataclass(frozen=True, slots=True)
class DomainEvent:
    event_id: str
    event_type: str
    aggregate_id: str
    aggregate_version: int
    occurred_at: datetime
    payload: Mapping[str, JsonScalar]

    def __post_init__(self) -> None:
        object.__setattr__(self, "payload", MappingProxyType(dict(self.payload)))
