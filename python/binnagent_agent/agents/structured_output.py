"""Strict-first parsing for model-authored structured output."""

from __future__ import annotations

import json
from typing import Any

import json_repair


def load_model_json(content: str) -> Any:
    """Parse valid JSON directly and repair syntax only before contract validation."""

    value = _strip_json_fence(content)
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return json_repair.loads(value, skip_json_loads=True)


def _strip_json_fence(content: str) -> str:
    value = content.strip()
    if value.startswith("```") and value.endswith("```"):
        lines = value.splitlines()
        if len(lines) >= 3:
            return "\n".join(lines[1:-1]).strip()
    return value
