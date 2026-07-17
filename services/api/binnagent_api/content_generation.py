from __future__ import annotations

from pathlib import Path
from typing import Annotated

from binnagent_agent.workflows.content_generation import ContentGenerationWorkflow
from fastapi import APIRouter, Depends

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.settings import get_settings

content_generation_router = APIRouter(prefix="/v1", tags=["content-generation"])


@content_generation_router.post("/content-generation/jobs")
async def run_content_generation_job(
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
    seed: int | None = None,
) -> dict[str, object]:
    del identity
    settings = get_settings()
    workflow = ContentGenerationWorkflow(
        output_directory=Path(settings.content_generation_output_directory),
        pack_version="v1",
        pack_id=f"agent_generated_content_pack_{settings.env}",
    )
    result = workflow.run(seed=seed)

    if result.errors:
        return {
            "status": "validation_failed",
            "pack_id": result.pack_id,
            "pack_version": result.pack_version,
            "manifest_path": str(result.manifest_path),
            "item_count": 0,
            "validation_errors": result.errors,
        }

    return {
        "status": "generated",
        "pack_id": result.pack_id,
        "pack_version": result.pack_version,
        "manifest_path": str(result.manifest_path),
        "item_count": result.item_count,
        "validation_errors": result.errors,
    }
