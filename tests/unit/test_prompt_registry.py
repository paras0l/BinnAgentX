import pytest
from binnagent_agent.prompts import DEFAULT_PROMPT_REGISTRY


def test_default_prompt_registry_is_code_owned_and_renders_declared_variables() -> None:
    prompt = DEFAULT_PROMPT_REGISTRY.render(
        "expression.priority_feedback",
        {
            "learner_attempt": "<learner_attempt>",
            "output_schema": "JSON_SCHEMA",
        },
    )

    assert prompt.prompt_version == "v2"
    assert "<learner_attempt>" in prompt.text
    assert "JSON_SCHEMA" in prompt.text
    assert prompt.model_policy["temperature"] == 0.1


def test_prompt_registry_rejects_missing_runtime_variables() -> None:
    with pytest.raises(ValueError, match="prompt_variables_missing:output_schema"):
        DEFAULT_PROMPT_REGISTRY.render(
            "expression.priority_feedback",
            {"learner_attempt": "draft"},
        )
