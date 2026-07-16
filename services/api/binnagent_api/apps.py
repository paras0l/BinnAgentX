from typing import Annotated

from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.errors import DomainError
from fastapi import Depends, FastAPI, Request, status
from fastapi.responses import JSONResponse

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice.repository import TaskNotFoundError
from binnagent_api.vertical_slice.routes import control_router, learner_router
from binnagent_api.vertical_slice.run_repository import RunNotFoundError
from binnagent_api.vertical_slice.run_routes import control_run_router, learner_run_router


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

    learner.include_router(learner_router)
    learner.include_router(learner_run_router)
    _register_error_handlers(learner)
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

    control.include_router(control_router)
    control.include_router(control_run_router)
    _register_error_handlers(control)
    return control


def _register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error(_: Request, exc: DomainError) -> JSONResponse:
        status_code = (
            status.HTTP_409_CONFLICT
            if exc.code is PublicErrorCode.SESSION_CONFLICT
            else status.HTTP_422_UNPROCESSABLE_CONTENT
        )
        return JSONResponse(
            status_code=status_code,
            content={
                "code": exc.code.value,
                "reason": exc.reason,
                "current_version": exc.current_version,
            },
        )

    @app.exception_handler(TaskNotFoundError)
    async def task_not_found(_: Request, exc: TaskNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"code": "TASK_NOT_FOUND", "task_id": exc.task_id},
        )

    @app.exception_handler(RunNotFoundError)
    async def run_not_found(_: Request, exc: RunNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "code": "RUN_NOT_FOUND",
                "workflow_run_id": exc.workflow_run_id,
            },
        )
