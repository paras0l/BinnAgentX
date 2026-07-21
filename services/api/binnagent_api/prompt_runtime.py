"""Resolve BinnAgentX active Prompt versions for live Agent model calls."""

from __future__ import annotations

from typing import Any

import sqlalchemy as sa
from binnagent_agent.prompts import (
    DEFAULT_PROMPT_REGISTRY,
    PromptDefinition,
    RenderedPrompt,
)
from sqlalchemy.exc import SQLAlchemyError

from binnagent_api.database import get_engine
from binnagent_api.vertical_slice import tables

_PROJECT_KEY = "binnagentx"


class DatabasePromptRuntime:
    async def resolve(self, prompt_id: str, variables: dict[str, Any]) -> RenderedPrompt:
        try:
            async with get_engine().connect() as connection:
                row = (
                    (
                        await connection.execute(
                            sa.select(tables.control_prompts).where(
                                tables.control_prompts.c.project_key == _PROJECT_KEY,
                                tables.control_prompts.c.prompt_id == prompt_id,
                                tables.control_prompts.c.status == "active",
                            )
                        )
                    )
                    .mappings()
                    .one_or_none()
                )
        except SQLAlchemyError:
            row = None
        if row is None:
            return DEFAULT_PROMPT_REGISTRY.render(prompt_id, variables)
        rendered = PromptDefinition(
            prompt_id=str(row["prompt_id"]),
            prompt_version=str(row["prompt_version"]),
            owner=str(row["owner"]),
            purpose=str(row["purpose"]),
            template_text=str(row["template_text"]),
            variables=tuple(str(item) for item in row["variables"]),
            model_policy=dict(row["model_policy"]),
        ).render(variables)
        return RenderedPrompt(
            prompt_id=rendered.prompt_id,
            prompt_version=rendered.prompt_version,
            text=rendered.text,
            model_policy=rendered.model_policy,
            source="database",
        )


prompt_runtime = DatabasePromptRuntime()
