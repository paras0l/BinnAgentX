from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from binnagent_api.apps import create_control_app, create_learner_app
from binnagent_api.database import dispose_engine, get_engine


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await dispose_engine()


def create_app() -> FastAPI:
    root = FastAPI(
        title="BinnAgent API",
        version="0.1.0",
        docs_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )

    @root.get("/health/live", tags=["health"])
    async def live() -> dict[str, str]:
        return {"service": "binnagent-api", "status": "ok"}

    @root.get("/health/ready", tags=["health"])
    async def ready() -> JSONResponse:
        try:
            async with get_engine().connect() as connection:
                await connection.execute(text("SELECT 1"))
        except Exception:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={"status": "not_ready", "code": "TEMPORARY_UNAVAILABLE"},
            )
        return JSONResponse(content={"service": "binnagent-api", "status": "ready"})

    root.mount("/learner", create_learner_app())
    root.mount("/control", create_control_app())
    return root


app = create_app()


def run() -> None:
    uvicorn.run(
        "binnagent_api.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        access_log=False,
    )
