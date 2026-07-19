from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Annotated

from binnagent_agent.agents.content_generator import RemoteContentGenerationAdapter
from binnagent_agent.agents.content_reviewer import RemoteContentReviewerAdapter
from binnagent_agent.workflows.content_generation import (
    ContentGenerationWorkflow,
    ContentGeneratorError,
)
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
    content_generator = None
    content_reviewer = None
    if settings.model_adapter == "ollama":
        content_generator = RemoteContentGenerationAdapter(
            provider="ollama",
            base_url=settings.ollama_base_url,
            model=settings.ollama_chat_model,
            api_key=None,
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_generation_max_tokens,
            timeout_seconds=settings.content_generation_timeout_seconds,
        )
        content_reviewer = RemoteContentReviewerAdapter(
            provider="ollama",
            base_url=settings.ollama_base_url,
            model=settings.ollama_chat_model,
            api_key=None,
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_review_max_tokens,
            timeout_seconds=settings.content_review_timeout_seconds,
        )
    elif settings.model_adapter == "deepseek":
        content_generator = RemoteContentGenerationAdapter(
            provider="deepseek",
            base_url=settings.deepseek_base_url,
            model=settings.deepseek_chat_model,
            api_key=(
                settings.deepseek_api_key.get_secret_value() if settings.deepseek_api_key else None
            ),
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_generation_max_tokens,
            timeout_seconds=settings.content_generation_timeout_seconds,
        )
        content_reviewer = RemoteContentReviewerAdapter(
            provider="deepseek",
            base_url=settings.deepseek_base_url,
            model=settings.deepseek_chat_model,
            api_key=(
                settings.deepseek_api_key.get_secret_value() if settings.deepseek_api_key else None
            ),
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_review_max_tokens,
            timeout_seconds=settings.content_review_timeout_seconds,
        )
    elif settings.model_adapter == "longcat":
        content_generator = RemoteContentGenerationAdapter(
            provider="longcat",
            base_url=settings.longcat_base_url,
            model=settings.longcat_chat_model,
            api_key=(
                settings.longcat_api_key.get_secret_value() if settings.longcat_api_key else None
            ),
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_generation_max_tokens,
            timeout_seconds=settings.content_generation_timeout_seconds,
        )
        content_reviewer = RemoteContentReviewerAdapter(
            provider="longcat",
            base_url=settings.longcat_base_url,
            model=settings.longcat_chat_model,
            api_key=(
                settings.longcat_api_key.get_secret_value() if settings.longcat_api_key else None
            ),
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_review_max_tokens,
            timeout_seconds=settings.content_review_timeout_seconds,
        )
    workflow = ContentGenerationWorkflow(
        output_directory=Path(settings.content_generation_output_directory),
        content_generator=content_generator,
        content_reviewer=content_reviewer,
        pack_version="v1",
        pack_id=f"agent_generated_content_pack_{settings.env}",
    )
    try:
        result = await asyncio.to_thread(workflow.run, seed=seed)
    except ContentGeneratorError as exc:
        return {
            "status": "generation_failed",
            "pack_id": f"agent_generated_content_pack_{settings.env}",
            "pack_version": "v1",
            "manifest_path": "",
            "item_count": 0,
            "agent_reviewed_count": 0,
            "validation_errors": [str(exc)],
        }

    if result.errors:
        return {
            "status": "validation_failed",
            "pack_id": result.pack_id,
            "pack_version": result.pack_version,
            "manifest_path": str(result.manifest_path),
            "item_count": 0,
            "agent_reviewed_count": 0,
            "validation_errors": result.errors,
        }

    return {
        "status": "generated",
        "pack_id": result.pack_id,
        "pack_version": result.pack_version,
        "manifest_path": str(result.manifest_path),
        "item_count": result.item_count,
        "agent_reviewed_count": getattr(result, "agent_reviewed_count", 0),
        "validation_errors": result.errors,
    }
