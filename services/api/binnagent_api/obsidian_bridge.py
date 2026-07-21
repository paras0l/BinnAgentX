"""Desktop-local boundary for the BinnAgent-managed Obsidian directory.

Run this process on the user's desktop, never in Docker. API containers call it
through ``host.docker.internal``; this is the only process allowed to invoke
the user's GUI application's constrained CLI.
"""

from __future__ import annotations

import secrets
from typing import Annotated

import uvicorn
from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from binnagent_api.knowledge_vault import KnowledgeVaultError, ObsidianCliKnowledgeVault
from binnagent_api.settings import get_settings


class CreateNoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(min_length=1, max_length=128)
    kind: str = Field(min_length=1, max_length=32)
    title: str = Field(min_length=1, max_length=240)
    tags: list[str] = Field(default_factory=list, max_length=12)
    source_type: str = Field(min_length=1, max_length=32)
    source_task_id: str | None = Field(default=None, max_length=128)
    initial_content: str | None = Field(default=None, max_length=12_000)


class OpenNoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    relative_path: str = Field(min_length=1, max_length=600)


def create_obsidian_bridge() -> FastAPI:
    settings = get_settings()
    if not settings.obsidian_bridge_token:
        raise RuntimeError("BINNAGENT_OBSIDIAN_BRIDGE_TOKEN is required")
    expected_token = settings.obsidian_bridge_token.get_secret_value()
    vault = ObsidianCliKnowledgeVault(settings)
    app = FastAPI(title="BinnAgent Obsidian Bridge", docs_url=None, openapi_url=None)

    def require_token(authorization: Annotated[str | None, Header()] = None) -> None:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        if not secrets.compare_digest(authorization.removeprefix("Bearer "), expected_token):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    @app.get("/v1/status")
    async def bridge_status(
        authorization: Annotated[str | None, Header()] = None,
    ) -> dict[str, object]:
        require_token(authorization)
        current = await vault.status()
        return {"connected": current.connected, "detail": current.detail}

    @app.post("/v1/notes")
    async def create_note(
        body: CreateNoteRequest,
        authorization: Annotated[str | None, Header()] = None,
    ) -> dict[str, str]:
        require_token(authorization)
        try:
            created = await vault.create_note_skeleton(
                asset_id=body.asset_id,
                kind=body.kind,
                title=body.title,
                tags=tuple(body.tags),
                source_type=body.source_type,
                source_task_id=body.source_task_id,
                initial_content=body.initial_content,
            )
        except KnowledgeVaultError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.code
            ) from exc
        return {
            "document_id": created.document_id,
            "relative_path": created.relative_path,
            "document_uri": created.document_uri,
            "content_hash": created.content_hash,
        }

    @app.post("/v1/notes/open", status_code=status.HTTP_204_NO_CONTENT)
    async def open_note(
        body: OpenNoteRequest,
        authorization: Annotated[str | None, Header()] = None,
    ) -> None:
        require_token(authorization)
        try:
            await vault.open_note(body.relative_path)
        except KnowledgeVaultError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.code
            ) from exc

    return app


def run() -> None:
    uvicorn.run(create_obsidian_bridge(), host="127.0.0.1", port=8787, access_log=False)
