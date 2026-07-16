from dataclasses import dataclass
from typing import Annotated

from fastapi import Header, HTTPException, status

from binnagent_api.settings import get_settings


@dataclass(frozen=True, slots=True)
class ControlIdentity:
    role: str


def require_control_identity(
    role: Annotated[str | None, Header(alias="X-BinnAgent-Control-Role")] = None,
) -> ControlIdentity:
    required_role = get_settings().control_required_role
    if role != required_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "control access denied"},
        )
    return ControlIdentity(role=role)
