import pytest
from binnagent_api.settings import Settings
from pydantic import ValidationError


def test_production_rejects_synthetic_defaults() -> None:
    with pytest.raises(ValidationError, match="production cannot use synthetic"):
        Settings(env="production")


def test_spike_high_impact_features_default_off() -> None:
    settings = Settings(env="test")

    assert settings.enable_irt_cat is False
    assert settings.enable_automatic_total_score is False
    assert settings.enable_predicted_score_gain is False
    assert settings.content_generation_output_directory == "fixtures/content/v1/generated"
    assert settings.content_generation_manifest == "fixtures/content/v1/generated/manifest.json"
    assert settings.content_generation_max_tokens == 16000
    assert settings.content_review_max_tokens == 8000
    assert settings.enable_remote_model_calls is False


def test_auto_model_adapter_prefers_configured_remote_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BINNAGENT_MODEL_ADAPTER", "auto")
    monkeypatch.setenv("BINNAGENT_ENABLE_REMOTE_MODEL_CALLS", "true")
    monkeypatch.setenv("BINNAGENT_DEEPSEEK_API_KEY", "test-key")
    monkeypatch.delenv("BINNAGENT_LONGCAT_API_KEY", raising=False)

    settings = Settings(env="test", _env_file=None)

    assert settings.model_adapter == "deepseek"
    assert settings.enable_remote_model_calls is True
