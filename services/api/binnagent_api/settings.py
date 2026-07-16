from decimal import Decimal
from functools import lru_cache
from typing import Literal, Self

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="BINNAGENT_",
        extra="ignore",
        case_sensitive=False,
    )

    env: Literal["development", "test", "production"] = "development"
    log_level: str = "INFO"
    timezone: str = "Asia/Shanghai"
    database_url: SecretStr = SecretStr(
        "postgresql+asyncpg://binnagent:binnagent_dev_only@localhost:5432/binnagent"
    )
    learner_identity_adapter: Literal["synthetic", "external"] = "synthetic"
    control_identity_adapter: Literal["synthetic", "external"] = "synthetic"
    control_required_role: str = "developer_reviewer"
    model_adapter: str = "deterministic_fixture"
    enable_remote_model_calls: bool = False
    model_timeout_seconds: int = 20
    model_max_calls_per_slice: int = 3
    model_max_cost_usd_per_slice: Decimal = Decimal("0.20")
    content_manifest: str = "fixtures/content/v1/manifest.json"
    min_content_rights_status: Literal["eligible_dev", "eligible_pilot", "eligible_release"] = (
        "eligible_dev"
    )
    enable_irt_cat: bool = False
    enable_automatic_total_score: bool = False
    enable_predicted_score_gain: bool = False

    @model_validator(mode="after")
    def prevent_unsafe_production_defaults(self) -> Self:
        if self.env != "production":
            return self
        unsafe = [
            self.learner_identity_adapter == "synthetic",
            self.control_identity_adapter == "synthetic",
            self.model_adapter == "deterministic_fixture",
            not self.enable_remote_model_calls,
            self.min_content_rights_status != "eligible_release",
        ]
        if any(unsafe):
            raise ValueError(
                "production cannot use synthetic identity, fixture model, disabled remote "
                "models, or dev content"
            )
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
