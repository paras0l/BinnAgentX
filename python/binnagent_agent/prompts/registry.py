"""Versioned, project-local Prompt definitions and deterministic rendering."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field

_PROMPT_ID = r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$"
_PROMPT_VERSION = r"^v[1-9][0-9]*$"
_VARIABLE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")


class PromptDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    prompt_id: str = Field(pattern=_PROMPT_ID, max_length=160)
    prompt_version: str = Field(pattern=_PROMPT_VERSION, max_length=32)
    owner: str = Field(min_length=1, max_length=80)
    purpose: str = Field(min_length=8, max_length=500)
    template_text: str = Field(min_length=20, max_length=20000)
    variables: tuple[str, ...] = ()
    model_policy: dict[str, Any] = Field(default_factory=dict)

    def render(self, values: dict[str, Any]) -> RenderedPrompt:
        declared = set(self.variables)
        used = set(_VARIABLE.findall(self.template_text))
        missing = sorted(declared - values.keys())
        undeclared = sorted(used - declared)
        if missing:
            raise ValueError(f"prompt_variables_missing:{','.join(missing)}")
        if undeclared:
            raise ValueError(f"prompt_variables_undeclared:{','.join(undeclared)}")
        rendered = _VARIABLE.sub(lambda match: str(values[match.group(1)]), self.template_text)
        return RenderedPrompt(
            prompt_id=self.prompt_id,
            prompt_version=self.prompt_version,
            text=rendered,
            model_policy=dict(self.model_policy),
            source="code",
        )


@dataclass(frozen=True, slots=True)
class RenderedPrompt:
    prompt_id: str
    prompt_version: str
    text: str
    model_policy: dict[str, Any]
    source: str


class PromptRuntimePort(Protocol):
    async def resolve(self, prompt_id: str, variables: dict[str, Any]) -> RenderedPrompt: ...


class PromptRegistry:
    def __init__(self, definitions: tuple[PromptDefinition, ...]) -> None:
        self._definitions = {item.prompt_id: item for item in definitions}
        if len(self._definitions) != len(definitions):
            raise ValueError("duplicate_prompt_id")

    def list(self) -> tuple[PromptDefinition, ...]:
        return tuple(self._definitions.values())

    def get(self, prompt_id: str) -> PromptDefinition:
        try:
            return self._definitions[prompt_id]
        except KeyError as exc:
            raise KeyError(f"unknown_prompt:{prompt_id}") from exc

    def render(self, prompt_id: str, variables: dict[str, Any]) -> RenderedPrompt:
        return self.get(prompt_id).render(variables)
