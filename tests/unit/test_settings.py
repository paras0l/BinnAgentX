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
    assert settings.enable_remote_model_calls is False
