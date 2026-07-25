"""Integrity checks and deterministic scoring for offline language Providers."""

from __future__ import annotations

import json
import math
import statistics
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator
from pydantic import BaseModel, ConfigDict


class LanguageProviderBenchmarkReport(BaseModel):
    """Comparable metrics; expert-frozen thresholds remain an external decision."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    provider_id: str
    provider_version: str
    case_count: int
    passed_case_count: int
    status_match_count: int
    semantic_match_count: int
    p50_latency_ms: float
    p95_latency_ms: float
    failures: tuple[str, ...]


def _read_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"expected_json_object:{path}")
    return value


def _fixture_root(repository_root: Path, fixture_directory: Path | None) -> Path:
    return (
        fixture_directory
        or repository_root / "fixtures" / "evaluation" / "language-providers" / "v1"
    )


def validate_language_provider_pack(
    repository_root: Path,
    *,
    fixture_directory: Path | None = None,
) -> list[str]:
    """Validate the benchmark contract plus source and gold character offsets."""

    fixture_root = _fixture_root(repository_root, fixture_directory)
    schema = _read_object(
        repository_root
        / "contracts"
        / "agent-quality"
        / "v1"
        / "language-provider-case.schema.json"
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
            errors.append(f"missing language provider case: {filename}")
            continue
        case = _read_object(path)
        for error in validator.iter_errors(case):
            errors.append(f"{filename} schema: {error.json_path}: {error.message}")
        case_id = case.get("case_id")
        if isinstance(case_id, str):
            if case_id in seen_case_ids:
                errors.append(f"duplicate language provider case id: {case_id}")
            seen_case_ids.add(case_id)
        errors.extend(_validate_case_offsets(filename, case))
    return errors


def score_language_provider_results(
    repository_root: Path,
    results_file: Path,
    *,
    fixture_directory: Path | None = None,
) -> LanguageProviderBenchmarkReport:
    """Score normalized results without invoking a Provider or changing labels."""

    pack_errors = validate_language_provider_pack(
        repository_root,
        fixture_directory=fixture_directory,
    )
    if pack_errors:
        raise ValueError("; ".join(pack_errors))

    fixture_root = _fixture_root(repository_root, fixture_directory)
    manifest = _read_object(fixture_root / "manifest.json")
    result_schema = _read_object(
        repository_root
        / "contracts"
        / "agent-quality"
        / "v1"
        / "language-provider-result.schema.json"
    )
    results = _read_object(results_file)
    result_errors = sorted(
        Draft202012Validator(result_schema).iter_errors(results),
        key=lambda error: list(error.absolute_path),
    )
    if result_errors:
        messages = [f"{error.json_path}: {error.message}" for error in result_errors]
        raise ValueError("; ".join(messages))

    cases = {
        case["case_id"]: case
        for filename in manifest["cases"]
        for case in [_read_object(fixture_root / filename)]
    }
    normalized_results = results["cases"]
    result_by_case: dict[str, dict[str, Any]] = {}
    duplicate_ids: set[str] = set()
    for result in normalized_results:
        case_id = result["case_id"]
        if case_id in result_by_case:
            duplicate_ids.add(case_id)
        result_by_case[case_id] = result

    failures = [f"duplicate result: {case_id}" for case_id in sorted(duplicate_ids)]
    unknown = sorted(set(result_by_case) - set(cases))
    failures.extend(f"unknown result: {case_id}" for case_id in unknown)
    status_matches = 0
    semantic_matches = 0
    passed = 0
    latencies: list[float] = []

    for case_id, case in cases.items():
        result = result_by_case.get(case_id)
        if result is None:
            failures.append(f"{case_id}: missing result")
            continue
        latencies.append(float(result["latency_ms"]))
        expected = case["expected"]
        status_matches_case = result["status"] in expected["acceptable_statuses"]
        if status_matches_case:
            status_matches += 1
        else:
            failures.append(
                f"{case_id}: unexpected status {result['status']!r}; "
                f"expected one of {expected['acceptable_statuses']!r}"
            )

        semantic_matches_case, semantic_failure = _semantic_match(case, result)
        if semantic_matches_case:
            semantic_matches += 1
        elif semantic_failure is not None:
            failures.append(f"{case_id}: {semantic_failure}")
        if status_matches_case and semantic_matches_case:
            passed += 1

    return LanguageProviderBenchmarkReport(
        provider_id=results["provider_id"],
        provider_version=results["provider_version"],
        case_count=len(cases),
        passed_case_count=passed,
        status_match_count=status_matches,
        semantic_match_count=semantic_matches,
        p50_latency_ms=_percentile(latencies, 0.5),
        p95_latency_ms=_percentile(latencies, 0.95),
        failures=tuple(failures),
    )


def _validate_case_offsets(filename: str, case: dict[str, Any]) -> list[str]:
    request = case.get("request")
    if not isinstance(request, dict):
        return []
    selected_text = request.get("selected_text")
    paragraph_context = request.get("paragraph_context")
    if not isinstance(selected_text, str) or not isinstance(paragraph_context, str):
        return []

    errors: list[str] = []
    if case.get("analysis_kind") == "syntax":
        start = request.get("selection_start")
        end = request.get("selection_end")
        if (
            not isinstance(start, int)
            or not isinstance(end, int)
            or paragraph_context[start:end] != selected_text
        ):
            errors.append(f"{filename}: syntax selection does not match paragraph offsets")
        expected = case.get("expected")
        structures = expected.get("required_structures", []) if isinstance(expected, dict) else []
        for index, structure in enumerate(structures):
            structure_start = structure["start"]
            structure_end = structure["end"]
            if selected_text[structure_start:structure_end] != structure["text_quote"]:
                errors.append(f"{filename}: required structure {index} has invalid offsets")
    return errors


def _semantic_match(
    case: dict[str, Any],
    result: dict[str, Any],
) -> tuple[bool, str | None]:
    expected = case["expected"]
    if case["analysis_kind"] == "lexical":
        accepted_sense_ids = expected["accepted_sense_ids"]
        if not accepted_sense_ids:
            if result["status"] == "resolved":
                return False, "ambiguous seed must not be silently resolved"
            return True, None
        if result.get("selected_sense_id") not in accepted_sense_ids:
            return False, "selected sense does not match an accepted sense key"
        required_pos = expected.get("required_part_of_speech")
        if required_pos is not None and result.get("part_of_speech") != required_pos:
            return False, f"part of speech does not match {required_pos!r}"
        return True, None

    selected_text = case["request"]["selected_text"]
    actual_structures = result.get("structures", [])
    for index, structure in enumerate(actual_structures):
        if selected_text[structure["start"] : structure["end"]] != structure["text_quote"]:
            return False, f"provider structure {index} has invalid character offsets"
    actual_keys = {
        (
            structure["start"],
            structure["end"],
            structure["text_quote"],
            structure["label"],
        )
        for structure in actual_structures
    }
    missing = [
        structure["label"]
        for structure in expected["required_structures"]
        if (
            structure["start"],
            structure["end"],
            structure["text_quote"],
            structure["label"],
        )
        not in actual_keys
    ]
    if missing:
        return False, f"missing required structures {missing!r}"
    return True, None


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    if percentile == 0.5:
        return float(statistics.median(values))
    ordered = sorted(values)
    index = max(0, math.ceil(percentile * len(ordered)) - 1)
    return ordered[index]
