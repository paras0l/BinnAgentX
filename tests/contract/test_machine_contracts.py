from __future__ import annotations

import json
from pathlib import Path
from typing import Any, cast

from binnagent_evaluation.content_integrity import validate_content_pack
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def read_json(path: Path) -> dict[str, Any] | list[Any]:
    return cast(dict[str, Any] | list[Any], json.loads(path.read_text(encoding="utf-8")))


def assert_valid(
    instance: object, schema: dict[str, Any], registry: Registry | None = None
) -> None:
    errors = sorted(
        Draft202012Validator(schema, registry=registry or Registry()).iter_errors(instance),
        key=lambda error: tuple(str(part) for part in error.absolute_path),
    )
    assert not errors, "\n".join(f"{error.json_path}: {error.message}" for error in errors)


def test_first_experience_analytics_examples_follow_frozen_contract() -> None:
    root = REPOSITORY_ROOT / "contracts/analytics/first-experience/v1"
    event_schema = read_json(root / "first-experience-event.schema.json")
    batch_schema = read_json(root / "first-experience-event-batch.schema.json")
    examples = read_json(root / "examples.valid.json")
    assert isinstance(event_schema, dict)
    assert isinstance(batch_schema, dict)
    assert isinstance(examples, list)
    schema_id = event_schema["$id"]
    assert isinstance(schema_id, str)
    registry = Registry().with_resource(schema_id, Resource.from_contents(event_schema))

    assert_valid(examples, batch_schema, registry)
    assert len(examples) == 32
    assert len({event["event_name"] for event in examples}) == 32


def test_vertical_slice_example_follows_domain_contract() -> None:
    root = REPOSITORY_ROOT / "contracts/domain/vertical-slice/v0.1"
    schema = read_json(root / "vertical-slice-state.schema.json")
    example = read_json(root / "example.valid.json")
    assert isinstance(schema, dict)

    assert_valid(example, schema)


def test_content_pack_schema_hashes_counts_and_evidence_spans() -> None:
    assert validate_content_pack(REPOSITORY_ROOT) == []


def test_fixed_scenario_suite_is_complete_and_unique() -> None:
    schema = read_json(REPOSITORY_ROOT / "contracts/scenarios/v1/scenario-suite.schema.json")
    suite = read_json(REPOSITORY_ROOT / "fixtures/scenarios/v1/scenarios.json")
    assert isinstance(schema, dict)
    assert isinstance(suite, dict)
    assert_valid(suite, schema)

    scenarios = suite["scenarios"]
    assert isinstance(scenarios, list)
    assert len(scenarios) == 25
    assert len({scenario["scenario_id"] for scenario in scenarios}) == 25
    assert {
        category: sum(item["category"] == category for item in scenarios)
        for category in (
            "normal",
            "boundary",
            "failure",
            "security",
        )
    } == {"normal": 5, "boundary": 7, "failure": 8, "security": 5}
