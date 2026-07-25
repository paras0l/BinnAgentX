"""Integrity validation for versioned Agent quality gold cases."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


def _read_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"expected_json_object:{path}")
    return value


def validate_agent_quality_pack(
    repository_root: Path,
    *,
    fixture_directory: Path | None = None,
) -> list[str]:
    """Return deterministic fixture errors without changing expert labels."""

    fixture_root = (
        fixture_directory or repository_root / "fixtures" / "evaluation" / "agent-quality" / "v1"
    )
    schema = _read_object(
        repository_root / "contracts" / "agent-quality" / "v1" / "gold-case.schema.json"
    )
    manifest = _read_object(fixture_root / "manifest.json")
    raw_cases = manifest.get("cases")
    if not isinstance(raw_cases, list):
        return ["manifest cases must be a list"]

    validator = Draft202012Validator(schema)
    errors: list[str] = []
    seen_case_ids: set[str] = set()
    for filename in raw_cases:
        if not isinstance(filename, str):
            errors.append("manifest case filename must be a string")
            continue
        path = fixture_root / filename
        if not path.is_file():
            errors.append(f"missing quality case: {filename}")
            continue
        case = _read_object(path)
        for error in validator.iter_errors(case):
            errors.append(f"{filename} schema: {error.json_path}: {error.message}")
        case_id = case.get("case_id")
        if isinstance(case_id, str):
            if case_id in seen_case_ids:
                errors.append(f"duplicate quality case id: {case_id}")
            seen_case_ids.add(case_id)
    return errors
