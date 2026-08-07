"""Learner-facing model usage summary."""

from fastapi import APIRouter, Request

from binnagent_api.learner_auth import LearnerIdentity
from binnagent_api.learner_usage import LearnerUsageView, learner_usage

learner_usage_router = APIRouter(prefix="/v1/usage", tags=["learner-usage"])


@learner_usage_router.get("", response_model=LearnerUsageView)
async def get_current_usage(request: Request) -> LearnerUsageView:
    identity: LearnerIdentity = request.state.learner_identity
    return await learner_usage(identity.learner_id)
