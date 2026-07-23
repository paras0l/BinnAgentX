"""Learner-facing current profile assessment."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel

from binnagent_api.database import get_engine
from binnagent_api.learner_auth import LearnerIdentity
from binnagent_api.learner_level_service import latest_level_assessment

learner_profile_router = APIRouter(prefix="/v1/profile", tags=["learner-profile"])


class CurrentLevelView(BaseModel):
    status: Literal["insufficient_evidence", "ready"]
    overall_level: str | None
    dimensions: dict[str, str]
    confidence_band: str
    evidence_count: int


@learner_profile_router.get("/current-level", response_model=CurrentLevelView)
async def get_current_level(request: Request) -> CurrentLevelView:
    identity: LearnerIdentity = request.state.learner_identity
    async with get_engine().connect() as connection:
        assessment = await latest_level_assessment(connection, identity.learner_id)
    if assessment is None:
        return CurrentLevelView(
            status="insufficient_evidence",
            overall_level=None,
            dimensions={},
            confidence_band="low",
            evidence_count=0,
        )
    return CurrentLevelView(
        status="ready",
        overall_level=assessment.overall_level,
        dimensions=assessment.dimensions.model_dump(),
        confidence_band=assessment.confidence_band,
        evidence_count=assessment.evidence_count,
    )
