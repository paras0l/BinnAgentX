import pytest
from binnagent_agent.agents.knowledge_extractor import (
    KnowledgeExtraction,
    create_knowledge_extractor,
)
from binnagent_agent.workflows.context_lab import ContextLabWorkflow
from binnagent_agent.workflows.expression_lab import ExpressionLabWorkflow
from binnagent_api import knowledge_extraction_service
from binnagent_api.knowledge_extraction_service import enrich_review_contexts
from binnagent_api.settings import get_settings
from binnagent_evaluation.trajectory import evaluate_trajectory
from pydantic_ai.models.test import TestModel


def test_context_workflow_plans_word_analysis_without_http_state() -> None:
    plan = ContextLabWorkflow().plan_annotation_analysis(
        learner_question="这个词在这里是什么意思?",
        selected_text="account for",
        paragraph_context="Several factors account for the result.",
    )

    assert plan.selection_scope == "word_or_phrase"
    assert plan.fallback_focus == "vocabulary"


def test_expression_workflow_deduplicates_memory() -> None:
    plan = ExpressionLabWorkflow().plan_review(
        draft="The evidence should be checked first.",
        explicit_assets=(("Evidence", "claim before detail"),),
        recalled_memories=(("Evidence", "claim before detail"),),
    )

    assert plan.recent_assets == (("Evidence", "claim before detail"),)


@pytest.mark.asyncio
async def test_pydantic_ai_extractor_returns_typed_output() -> None:
    agent = create_knowledge_extractor(
        TestModel(
            custom_output_text=(
                '{"items":[{"kind":"grammar","source_title":"Concession note",'
                '"title":"Although concession","summary":"Although introduces a concession '
                'before the main claim.","review_cue":"Find the main claim after although."}]}'
            )
        )
    )

    result = await agent.run("Although introduces a concession before the main claim.")

    assert result.output.items
    assert result.output.items[0].kind in {
        "vocabulary",
        "grammar",
        "writing_expression",
        "reading_skill",
    }


@pytest.mark.asyncio
async def test_longcat_enriches_context_through_native_structured_adapter(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class StubLongCatAdapter:
        async def extract(self, _: str) -> KnowledgeExtraction:
            return KnowledgeExtraction.model_validate(
                {
                    "items": [
                        {
                            "kind": "grammar",
                            "source_title": "Concession note",
                            "title": "Although concession",
                            "summary": "Although introduces a concession before the main claim.",
                            "review_cue": "Find the main claim after the concessive clause.",
                        }
                    ]
                }
            )

    monkeypatch.setenv("BINNAGENT_MODEL_ADAPTER", "longcat")
    monkeypatch.setattr(
        knowledge_extraction_service,
        "longcat_knowledge_adapter",
        lambda _: StubLongCatAdapter(),
    )
    monkeypatch.setattr(knowledge_extraction_service, "model_from_settings", lambda _: None)
    get_settings.cache_clear()
    contexts = (
        {
            "kind": "grammar",
            "title": "Concession note",
            "excerpt": "Although introduces a concession.",
        },
    )

    enriched, called, reason = await enrich_review_contexts(contexts)

    assert enriched[0]["excerpt"].startswith(contexts[0]["excerpt"])
    assert "Review cue:" in enriched[0]["excerpt"]
    assert called is True
    assert reason is None
    get_settings.cache_clear()


def test_trajectory_evaluation_checks_order_and_budget() -> None:
    evaluation = evaluate_trajectory(
        ("memory.recall", "model.generate", "validator.accept", "evidence.persist"),
        allowed_steps=frozenset(
            {"memory.recall", "model.generate", "validator.accept", "evidence.persist"}
        ),
        required_order=("memory.recall", "model.generate", "validator.accept", "evidence.persist"),
        max_model_calls=1,
    )

    assert evaluation.passed
