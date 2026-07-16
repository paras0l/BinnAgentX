from typing import Annotated

from fastapi import Depends, FastAPI

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.settings import get_settings


def create_learner_app() -> FastAPI:
    learner = FastAPI(
        title="BinnAgent Learner API",
        version="0.1.0",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    @learner.get("/v1/meta", tags=["meta"])
    async def learner_meta() -> dict[str, object]:
        return {
            "product": "BinnAgent 考研英语",
            "exam_tracks": ["english_1", "english_2"],
            "terminal": "desktop_web_only",
            "progress_evidence_policy": "delayed_independent_required_for_stable_claims",
        }

    return learner


def create_control_app() -> FastAPI:
    control = FastAPI(
        title="BinnAgent Control API",
        version="0.1.0",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    @control.get("/v1/meta", tags=["meta"])
    async def control_meta(
        identity: Annotated[ControlIdentity, Depends(require_control_identity)],
    ) -> dict[str, object]:
        settings = get_settings()
        return {
            "environment": settings.env,
            "role": identity.role,
            "model_adapter": settings.model_adapter,
            "feature_gates": {
                "irt_cat": settings.enable_irt_cat,
                "automatic_total_score": settings.enable_automatic_total_score,
                "predicted_score_gain": settings.enable_predicted_score_gain,
            },
        }

    return control
