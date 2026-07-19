from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal, Self

from pydantic import AliasChoices, Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]
LEGACY_ENV_FILE = PROJECT_ROOT.parent / "BinnAgent" / ".env"


def compatible_field(name: str, legacy_name: str | None = None, **kwargs: Any) -> Any:
    aliases = [f"BINNAGENT_{name}"]
    if legacy_name is not None:
        aliases.append(f"BINN_{legacy_name}")
    return Field(validation_alias=AliasChoices(*aliases), **kwargs)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # The sibling project is a local compatibility source. A target-project .env wins.
        env_file=(LEGACY_ENV_FILE, PROJECT_ROOT / ".env"),
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
    learner_identity_adapter: Literal["synthetic", "session"] = "session"
    control_identity_adapter: Literal["synthetic", "external"] = "synthetic"
    control_required_role: str = "developer_reviewer"

    session_cookie_name: str = "binnagent_session"
    session_ttl_seconds: int = 60 * 60 * 24 * 30
    bootstrap_invite_code: SecretStr = compatible_field(
        "BOOTSTRAP_INVITE_CODE",
        "BOOTSTRAP_INVITE_CODE",
        default=SecretStr("BINN-LOCAL-FIRST"),
    )
    email_delivery_mode: Literal["console", "smtp"] = compatible_field(
        "EMAIL_DELIVERY_MODE", "EMAIL_DELIVERY_MODE", default="console"
    )
    email_verification_secret: SecretStr = compatible_field(
        "EMAIL_VERIFICATION_SECRET",
        "EMAIL_VERIFICATION_SECRET",
        default=SecretStr("local-email-verification-secret-change-me"),
    )
    experience_code_secret: SecretStr = compatible_field(
        "EXPERIENCE_CODE_SECRET",
        "EXPERIENCE_CODE_SECRET",
        default=SecretStr("local-experience-code-secret-change-me"),
    )
    email_verification_code_ttl_seconds: int = compatible_field(
        "EMAIL_VERIFICATION_CODE_TTL_SECONDS",
        "EMAIL_VERIFICATION_CODE_TTL_SECONDS",
        default=600,
    )
    email_verification_token_ttl_seconds: int = compatible_field(
        "EMAIL_VERIFICATION_TOKEN_TTL_SECONDS",
        "EMAIL_VERIFICATION_TOKEN_TTL_SECONDS",
        default=600,
    )
    email_verification_resend_seconds: int = compatible_field(
        "EMAIL_VERIFICATION_RESEND_SECONDS",
        "EMAIL_VERIFICATION_RESEND_SECONDS",
        default=60,
    )
    email_verification_max_attempts: int = compatible_field(
        "EMAIL_VERIFICATION_MAX_ATTEMPTS",
        "EMAIL_VERIFICATION_MAX_ATTEMPTS",
        default=5,
    )
    smtp_host: str | None = compatible_field("SMTP_HOST", "SMTP_HOST", default=None)
    smtp_port: int = compatible_field("SMTP_PORT", "SMTP_PORT", default=587)
    smtp_username: str | None = compatible_field("SMTP_USERNAME", "SMTP_USERNAME", default=None)
    smtp_password: SecretStr | None = compatible_field(
        "SMTP_PASSWORD", "SMTP_PASSWORD", default=None
    )
    smtp_from_address: str = compatible_field(
        "SMTP_FROM_ADDRESS", "SMTP_FROM_ADDRESS", default="no-reply@binnagent.local"
    )
    smtp_starttls: bool = compatible_field("SMTP_STARTTLS", "SMTP_STARTTLS", default=True)
    smtp_use_ssl: bool = compatible_field("SMTP_USE_SSL", "SMTP_USE_SSL", default=False)

    model_adapter: Literal["auto", "deterministic_fixture", "ollama", "deepseek", "longcat"] = (
        Field(
            default="auto",
            validation_alias=AliasChoices(
                "BINNAGENT_MODEL_ADAPTER",
                "BINNAGENT_MODEL_PROVIDER",
                "BINN_MODEL_PROVIDER",
            ),
        )
    )
    enable_remote_model_calls: bool | None = None
    model_timeout_seconds: int = 20
    model_max_calls_per_slice: int = 3
    model_max_cost_usd_per_slice: Decimal = Decimal("0.20")
    model_estimated_cost_usd: Decimal = Decimal("0.02")
    model_max_tokens: int = 900
    content_generation_timeout_seconds: int = 180
    content_generation_max_tokens: int = 16000
    content_review_timeout_seconds: int = 180
    content_review_max_tokens: int = 8000
    content_worker_poll_seconds: float = 2.0
    ollama_base_url: str = compatible_field(
        "OLLAMA_BASE_URL", "OLLAMA_BASE_URL", default="http://localhost:11434"
    )
    ollama_chat_model: str = compatible_field(
        "OLLAMA_CHAT_MODEL", "OLLAMA_CHAT_MODEL", default="gemma4:e2b"
    )
    deepseek_base_url: str = compatible_field(
        "DEEPSEEK_BASE_URL", "DEEPSEEK_BASE_URL", default="https://api.deepseek.com"
    )
    deepseek_api_key: SecretStr | None = compatible_field(
        "DEEPSEEK_API_KEY", "DEEPSEEK_API_KEY", default=None
    )
    deepseek_chat_model: str = compatible_field(
        "DEEPSEEK_CHAT_MODEL", "DEEPSEEK_CHAT_MODEL", default="deepseek-v4-flash"
    )
    longcat_base_url: str = compatible_field(
        "LONGCAT_BASE_URL", "LONGCAT_BASE_URL", default="https://api.longcat.chat/openai"
    )
    longcat_api_key: SecretStr | None = compatible_field(
        "LONGCAT_API_KEY", "LONGCAT_API_KEY", default=None
    )
    longcat_chat_model: str = compatible_field(
        "LONGCAT_CHAT_MODEL", "LONGCAT_CHAT_MODEL", default="LongCat-2.0"
    )

    content_manifest: str = "fixtures/content/v1/manifest.json"
    content_generation_output_directory: str = "fixtures/content/v1/generated"
    content_generation_manifest: str = "fixtures/content/v1/generated/manifest.json"
    min_content_rights_status: Literal["eligible_dev", "eligible_pilot", "eligible_release"] = (
        "eligible_dev"
    )
    enable_irt_cat: bool = False
    enable_automatic_total_score: bool = False
    enable_predicted_score_gain: bool = False

    @model_validator(mode="after")
    def resolve_remote_default_and_prevent_unsafe_production(self) -> Self:
        if self.model_adapter == "auto":
            if self.deepseek_api_key:
                self.model_adapter = "deepseek"
            elif self.longcat_api_key:
                self.model_adapter = "longcat"
            else:
                self.model_adapter = "ollama"
        if self.enable_remote_model_calls is None:
            self.enable_remote_model_calls = self.model_adapter != "deterministic_fixture"
        if self.env != "production":
            return self
        unsafe = [
            self.learner_identity_adapter != "session",
            self.control_identity_adapter == "synthetic",
            self.model_adapter == "deterministic_fixture",
            not self.enable_remote_model_calls,
            self.min_content_rights_status != "eligible_release",
            self.email_delivery_mode != "smtp",
            self.email_verification_secret.get_secret_value()
            == "local-email-verification-secret-change-me",
            self.experience_code_secret.get_secret_value()
            == "local-experience-code-secret-change-me",
            self.bootstrap_invite_code.get_secret_value() == "BINN-LOCAL-FIRST",
        ]
        if any(unsafe):
            raise ValueError(
                "production cannot use synthetic identities and requires a remote model, "
                "release content, SMTP, and non-default auth secrets"
            )
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
