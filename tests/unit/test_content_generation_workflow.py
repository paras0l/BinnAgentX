from __future__ import annotations

import shutil
from decimal import Decimal
from pathlib import Path

from binnagent_agent.agents.content_generator import ContentGenerationRequest
from binnagent_agent.workflows.content_generation import ContentGenerationWorkflow

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_FIXTURE_ROOT = REPO_ROOT / "fixtures/content/v1"


def _build_source_manifest(tmp_path: Path) -> Path:
    target_root = tmp_path / "source"
    target_root.mkdir(parents=True, exist_ok=True)
    source_manifest = json_load(SOURCE_FIXTURE_ROOT / "manifest.json")

    for item in source_manifest["items"]:
        shutil.copy(
            SOURCE_FIXTURE_ROOT / item["file"],
            target_root / item["file"],
        )

    manifest_path = target_root / "manifest.json"
    manifest_path.write_text(json_dump(source_manifest), encoding="utf-8")
    return manifest_path


def json_load(path: Path) -> dict:
    import json

    return json.loads(path.read_text(encoding="utf-8"))


def json_dump(value: object) -> str:
    import json

    return json.dumps(value, ensure_ascii=False, indent=2)


class FakeSuccessfulGenerator:
    name = "fake_generator"
    is_remote = False
    estimated_cost_usd = Decimal("0")

    def __init__(self) -> None:
        self.calls: list[tuple[str, int | None]] = []

    def generate(self, request: ContentGenerationRequest) -> dict:
        self.calls.append((request.content_type, request.random_seed))
        if request.content_type in {"calibration_reading", "matched_reading"}:
            return {
                "title": f"AI generated {request.content_type} title",
                "paragraphs": [
                    (
                        "An updated passage first paragraph demonstrates how a system can "
                        "be rebalanced."
                    ),
                    (
                        "Second paragraph explains the effect and why the new rule "
                        "works in practice."
                    ),
                    (
                        "Third paragraph gives a concrete example and a measurable "
                        "outcome."
                    ),
                ],
                "main_question": {
                    "prompt": (
                        "Which sentence best describes the impact of the new policy on "
                        "resource use?"
                    ),
                    "options": [
                        "It increased total resources.",
                        "It made existing resources easier to share.",
                        "It removed all restrictions.",
                        "It created more expensive rooms.",
                    ],
                    "correct_answer": "B",
                    "hints": [
                        "Find the central change.",
                        "Compare claimed outcomes.",
                        "Ignore unmentioned options.",
                        "Choose the exact conclusion from the text.",
                    ],
                    "public_explanation": (
                        "The passage says the policy did not increase total "
                        "space but reduced waste."
                    ),
                    "common_error_candidates": [
                        "Confusing availability with total quantity.",
                        "Adding details not stated in the passage.",
                    ],
                    "evidence_quote": (
                        "Second paragraph explains the effect and why the new rule "
                        "works in practice."
                    ),
                },
            }
        return {
            "title": "AI generated micro expression scenario",
            "situation": (
                "A learner keeps overusing a translation tool and copies each "
                "result as final answer, "
                "so the learner misses practicing inference and structure."
            ),
        }


class FailingGenerator:
    name = "failing_generator"
    is_remote = False
    estimated_cost_usd = Decimal("0")

    def generate(self, request: ContentGenerationRequest) -> dict:
        raise RuntimeError("mocked failure")


def test_workflow_runs_with_ai_generator_and_validates_output(tmp_path: Path) -> None:
    source_manifest = _build_source_manifest(tmp_path)
    workflow = ContentGenerationWorkflow(
        source_manifest=source_manifest,
        output_directory=tmp_path / "generated",
        pack_version="v1",
        pack_id="agent_generated_content_pack_test",
        content_generator=FakeSuccessfulGenerator(),
    )

    result = workflow.run(seed=123)

    assert result.errors == []
    assert result.item_count == 6
    assert result.manifest_path.exists()
    manifest = json_load(result.manifest_path)
    assert manifest["items"][0]["content_hash"] != ""
    first_item = json_load(result.manifest_path.parent / manifest["items"][0]["file"])
    assert first_item["title"].startswith("AI generated")


def test_workflow_falls_back_to_deterministic_when_generator_fails(tmp_path: Path) -> None:
    source_manifest = _build_source_manifest(tmp_path)
    workflow = ContentGenerationWorkflow(
        source_manifest=source_manifest,
        output_directory=tmp_path / "generated",
        pack_version="v1",
        pack_id="agent_generated_content_pack_test",
        content_generator=FailingGenerator(),
    )

    result = workflow.run(seed=456)

    assert result.errors == []
    manifest = json_load(result.manifest_path)
    assert manifest["items"]
    first_item = json_load(result.manifest_path.parent / manifest["items"][0]["file"])
    assert first_item["title"].startswith("AI-Generated:")
