from __future__ import annotations

import shutil
from decimal import Decimal
from pathlib import Path

import pytest
from binnagent_agent.agents.content_generator import ContentGenerationRequest
from binnagent_agent.agents.content_reviewer import (
    ContentQualityScores,
    ContentReviewRequest,
    ContentReviewResult,
)
from binnagent_agent.workflows.content_generation import (
    ContentGenerationWorkflow,
    ContentGeneratorError,
)

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
            paragraphs = [
                ("An updated passage first paragraph demonstrates how a system can be rebalanced."),
                ("Second paragraph explains the effect and why the new rule works in practice."),
                ("Third paragraph gives a concrete example and a measurable outcome."),
            ]
            if len(request.source_item.get("paragraphs", [])) == 4:
                paragraphs.append(
                    "A final paragraph connects the example to a broader learning principle."
                )
            question_common = {
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
                    "The passage says the policy improved how existing resources were shared."
                ),
                "common_error_candidates": [
                    "Confusing availability with total quantity.",
                    "Adding details not stated in the passage.",
                ],
                "evidence_quote": (
                    "Second paragraph explains the effect and why the new rule works in practice."
                ),
            }
            return {
                "title": f"AI generated {request.content_type} title",
                "paragraphs": paragraphs,
                "question_bank": [
                    {
                        **question_common,
                        "question_type": "vocabulary_in_context",
                        "difficulty_tier": "foundation",
                        "prompt": (
                            "Which option best captures the contextual meaning of rebalanced?"
                        ),
                    },
                    {
                        **question_common,
                        "question_type": "grammar_cloze",
                        "difficulty_tier": "foundation",
                        "prompt": (
                            "Which form best completes the sentence about how the rule works?"
                        ),
                    },
                    {
                        **question_common,
                        "question_type": "main_idea",
                        "difficulty_tier": "standard",
                        "prompt": "Which sentence best describes the impact of the new policy?",
                    },
                    {
                        **question_common,
                        "question_type": "inference",
                        "difficulty_tier": "advanced",
                        "prompt": (
                            "Which broader conclusion is most strongly supported by the passage?"
                        ),
                    },
                ],
                "grammar_challenges": [
                    {
                        "paragraph_index": 0,
                        "correct_text": "updated passage",
                        "incorrect_text": "update passage",
                        "error_type": "modifier form",
                        "hint": "Check the form before the noun.",
                    },
                    {
                        "paragraph_index": 1,
                        "correct_text": "works in practice",
                        "incorrect_text": "work in practice",
                        "error_type": "subject verb agreement",
                        "hint": "Match the verb to its subject.",
                    },
                ],
                "parallel_reconstruction_prompt": (
                    "Explain the same policy effect in a different resource-sharing context."
                ),
                "parallel_reconstruction_criteria": [
                    "Names the policy change",
                    "Explains the measurable result",
                ],
                "transferable_expressions": [
                    {
                        "expression": "works in practice",
                        "appropriate_when": "describing an applied result",
                        "avoid_when": "no implementation evidence is available",
                    }
                ],
            }
        return {
            "title": "AI generated micro expression scenario",
            "situation": (
                "A learner keeps overusing a translation tool and copies each "
                "result as final answer, "
                "so the learner misses practicing inference and structure."
            ),
            "audience": "A classmate preparing for an English exam",
            "purpose": "Recommend a safer sequence for using assistance",
            "target_argument_move": "Acknowledge a benefit, set a limit, and sequence actions",
            "optional_active_resource": "Support should enter after an independent attempt.",
            "forbidden_mechanical_use": ["Do not write the learner's final response"],
            "v1_minimum": ["States one benefit", "Gives a clear sequence"],
            "priority_feedback_checks": [
                {
                    "check_id": "sequence",
                    "signal_terms": ["before", "then"],
                    "feedback": (
                        "Make the order explicit while keeping every sentence in your own wording."
                    ),
                }
            ],
            "priority_feedback_fallback": (
                "Check whether the benefit, limit, and next action each have a clear role."
            ),
            "v2_success": ["The sequence is explicit", "The learner keeps their own wording"],
            "parallel_transfer": (
                "Apply the same reasoning to a writing assistant, using two to four sentences."
            ),
        }


class FailingGenerator:
    name = "failing_generator"
    is_remote = False
    estimated_cost_usd = Decimal("0")

    def generate(self, request: ContentGenerationRequest) -> dict:
        raise RuntimeError("mocked failure")


class WrongGrammarParagraphGenerator(FakeSuccessfulGenerator):
    def generate(self, request: ContentGenerationRequest) -> dict:
        payload = super().generate(request)
        if request.content_type in {"calibration_reading", "matched_reading"}:
            payload["grammar_challenges"][0]["paragraph_index"] = 2
        return payload


class FlakyGenerator(FakeSuccessfulGenerator):
    def generate(self, request: ContentGenerationRequest) -> dict:
        if not self.calls:
            self.calls.append((request.content_type, request.random_seed))
            raise RuntimeError("temporary model failure")
        return super().generate(request)


class FakeApprovingReviewer:
    name = "fake_judge"
    is_remote = False
    estimated_cost_usd = Decimal("0")

    def __init__(self) -> None:
        self.calls: list[ContentReviewRequest] = []

    def review(self, request: ContentReviewRequest) -> ContentReviewResult:
        self.calls.append(request)
        return ContentReviewResult(
            verdict="approve",
            scores=ContentQualityScores(
                factual_coherence=5,
                answerability=5,
                evidence_grounding=5,
                difficulty_alignment=4,
                question_diversity=5,
                hint_progression=4,
                language_quality=5,
            ),
            issues=[],
            summary=(
                "The candidate is coherent, answerable, diverse, and ready for development use."
            ),
            limitations=["LLM judge approval still requires sampled human audit"],
        )


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
    assert first_item["review"]["status"] == "agent_generated_unreviewed"
    assert first_item["review"]["reviewer_role"] == "agent_generator"


def test_workflow_requires_explicit_opt_in_for_deterministic_fallback(tmp_path: Path) -> None:
    source_manifest = _build_source_manifest(tmp_path)
    workflow = ContentGenerationWorkflow(
        source_manifest=source_manifest,
        output_directory=tmp_path / "generated",
        pack_version="v1",
        pack_id="agent_generated_content_pack_test",
        content_generator=FailingGenerator(),
        allow_deterministic_fallback=True,
    )

    result = workflow.run(seed=456)

    assert result.errors == []
    manifest = json_load(result.manifest_path)
    assert manifest["items"]
    first_item = json_load(result.manifest_path.parent / manifest["items"][0]["file"])
    assert first_item["title"].startswith("AI-Generated:")


def test_workflow_fails_when_generator_is_unavailable_by_default(tmp_path: Path) -> None:
    source_manifest = _build_source_manifest(tmp_path)
    workflow = ContentGenerationWorkflow(
        source_manifest=source_manifest,
        output_directory=tmp_path / "generated",
    )

    with pytest.raises(ContentGeneratorError, match="content generator disabled"):
        workflow.run(seed=7)


def test_workflow_locates_grammar_quote_when_model_paragraph_index_is_wrong(
    tmp_path: Path,
) -> None:
    source_manifest = _build_source_manifest(tmp_path)
    workflow = ContentGenerationWorkflow(
        source_manifest=source_manifest,
        output_directory=tmp_path / "generated",
        content_generator=WrongGrammarParagraphGenerator(),
    )

    result = workflow.run(seed=8)

    assert result.errors == []
    manifest = json_load(result.manifest_path)
    first_item = json_load(result.manifest_path.parent / manifest["items"][0]["file"])
    assert first_item["grammar_challenges"][0]["paragraph_id"] == "calibration_a_p1"


def test_workflow_retries_a_transient_generation_failure(tmp_path: Path) -> None:
    source_manifest = _build_source_manifest(tmp_path)
    generator = FlakyGenerator()
    workflow = ContentGenerationWorkflow(
        source_manifest=source_manifest,
        output_directory=tmp_path / "generated",
        content_generator=generator,
    )

    result = workflow.run(seed=9)

    assert result.errors == []
    assert len(generator.calls) == 7


def test_workflow_rejects_generated_article_that_copies_source_span(tmp_path: Path) -> None:
    source_manifest = _build_source_manifest(tmp_path)
    workflow = ContentGenerationWorkflow(
        source_manifest=source_manifest,
        output_directory=tmp_path / "generated",
    )
    source_item = json_load(source_manifest.parent / "calibration_reading_a.json")

    with pytest.raises(ContentGeneratorError, match="repeats a 12-word source span"):
        workflow._assert_original_enough(source_item, source_item)


def test_workflow_promotes_candidates_approved_by_review_agent(tmp_path: Path) -> None:
    source_manifest = _build_source_manifest(tmp_path)
    reviewer = FakeApprovingReviewer()
    workflow = ContentGenerationWorkflow(
        source_manifest=source_manifest,
        output_directory=tmp_path / "generated",
        content_generator=FakeSuccessfulGenerator(),
        content_reviewer=reviewer,
    )

    result = workflow.run(seed=10)

    assert result.errors == []
    assert result.agent_reviewed_count == 6
    assert len(reviewer.calls) == 6
    manifest = json_load(result.manifest_path)
    first_item = json_load(result.manifest_path.parent / manifest["items"][0]["file"])
    assert first_item["review"]["status"] == "agent_reviewed"
    assert first_item["review"]["judge_report"]["verdict"] == "approve"
    assert first_item["question_bank"][0]["question_type"] == "vocabulary_in_context"
