from __future__ import annotations

import json
import os
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

from binnagent_agent.agents.content_generator import RemoteContentGenerationAdapter
from binnagent_agent.agents.content_reviewer import RemoteContentReviewerAdapter
from binnagent_agent.observability import LangfuseConfiguration, configure_langfuse
from binnagent_agent.workflows.content_generation import ContentGenerationWorkflow, ProgressCallback
from binnagent_evaluation.content_integrity import validate_content_pack

from binnagent_api.settings import Settings


def build_content_generation_workflow(
    settings: Settings,
    *,
    output_directory: Path,
    pack_id: str,
    pack_version: str,
    progress_callback: ProgressCallback | None = None,
) -> ContentGenerationWorkflow:
    configure_langfuse(
        LangfuseConfiguration(
            enabled=settings.langfuse_enabled,
            public_key=(
                settings.langfuse_public_key.get_secret_value()
                if settings.langfuse_public_key
                else None
            ),
            secret_key=(
                settings.langfuse_secret_key.get_secret_value()
                if settings.langfuse_secret_key
                else None
            ),
            base_url=settings.langfuse_base_url,
            environment=settings.langfuse_environment,
        )
    )
    generator: RemoteContentGenerationAdapter | None = None
    reviewer: RemoteContentReviewerAdapter | None = None
    if settings.model_adapter == "ollama":
        generator = RemoteContentGenerationAdapter(
            provider="ollama",
            base_url=settings.ollama_base_url,
            model=settings.ollama_chat_model,
            api_key=None,
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_generation_max_tokens,
            timeout_seconds=settings.content_generation_timeout_seconds,
        )
        reviewer = RemoteContentReviewerAdapter(
            provider="ollama",
            base_url=settings.ollama_base_url,
            model=settings.ollama_chat_model,
            api_key=None,
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_review_max_tokens,
            timeout_seconds=settings.content_review_timeout_seconds,
        )
    elif settings.model_adapter == "deepseek":
        api_key = (
            settings.deepseek_api_key.get_secret_value() if settings.deepseek_api_key else None
        )
        generator = RemoteContentGenerationAdapter(
            provider="deepseek",
            base_url=settings.deepseek_base_url,
            model=settings.deepseek_chat_model,
            api_key=api_key,
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_generation_max_tokens,
            timeout_seconds=settings.content_generation_timeout_seconds,
        )
        reviewer = RemoteContentReviewerAdapter(
            provider="deepseek",
            base_url=settings.deepseek_base_url,
            model=settings.deepseek_chat_model,
            api_key=api_key,
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_review_max_tokens,
            timeout_seconds=settings.content_review_timeout_seconds,
        )
    elif settings.model_adapter == "longcat":
        api_key = settings.longcat_api_key.get_secret_value() if settings.longcat_api_key else None
        generator = RemoteContentGenerationAdapter(
            provider="longcat",
            base_url=settings.longcat_base_url,
            model=settings.longcat_chat_model,
            api_key=api_key,
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_generation_max_tokens,
            timeout_seconds=settings.content_generation_timeout_seconds,
        )
        reviewer = RemoteContentReviewerAdapter(
            provider="longcat",
            base_url=settings.longcat_base_url,
            model=settings.longcat_chat_model,
            api_key=api_key,
            estimated_cost_usd=settings.model_estimated_cost_usd,
            max_tokens=settings.content_review_max_tokens,
            timeout_seconds=settings.content_review_timeout_seconds,
        )
    return ContentGenerationWorkflow(
        output_directory=output_directory,
        content_generator=generator,
        content_reviewer=reviewer,
        pack_version=pack_version,
        pack_id=pack_id,
        progress_callback=progress_callback,
    )


class ContentPackPublishError(RuntimeError):
    pass


class ContentPackPublisher:
    def __init__(self, *, repository_root: Path, generated_root: Path) -> None:
        self.repository_root = repository_root.resolve()
        self.generated_root = generated_root.resolve()
        self.active_manifest_path = self.generated_root / "manifest.json"

    def publish(self, source_manifest: Path, *, job_id: str) -> Path:
        source_manifest = source_manifest.resolve()
        self._require_child(source_manifest, self.generated_root)
        if source_manifest.name != "manifest.json" or not source_manifest.is_file():
            raise ContentPackPublishError("generated_manifest_missing")

        errors = validate_content_pack(
            self.repository_root,
            content_directory=source_manifest.parent,
        )
        if errors:
            raise ContentPackPublishError(f"generated_pack_invalid: {'; '.join(errors)}")

        manifest = self._read_json(source_manifest)
        raw_items = manifest.get("items")
        if not isinstance(raw_items, list) or not raw_items:
            raise ContentPackPublishError("generated_manifest_items_missing")

        published_items: list[dict[str, Any]] = []
        for raw_entry in raw_items:
            if not isinstance(raw_entry, dict):
                raise ContentPackPublishError("generated_manifest_item_invalid")
            source_item = (source_manifest.parent / str(raw_entry.get("file", ""))).resolve()
            self._require_child(source_item, self.generated_root)
            item = self._read_json(source_item)
            review = item.get("review")
            if not isinstance(review, dict) or review.get("status") != "agent_reviewed":
                raise ContentPackPublishError("generated_pack_not_fully_agent_reviewed")
            entry = dict(raw_entry)
            entry["file"] = source_item.relative_to(self.generated_root).as_posix()
            published_items.append(entry)

        active_manifest = {
            **manifest,
            "source_job_id": job_id,
            "published_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "items": published_items,
        }
        self.generated_root.mkdir(parents=True, exist_ok=True)
        file_descriptor, temporary_name = tempfile.mkstemp(
            prefix="active_manifest_",
            suffix=".json.tmp",
            dir=self.generated_root,
        )
        temporary_path = Path(temporary_name)
        try:
            with os.fdopen(file_descriptor, "w", encoding="utf-8") as handle:
                json.dump(active_manifest, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_path, self.active_manifest_path)
        finally:
            temporary_path.unlink(missing_ok=True)
        return self.active_manifest_path

    def active_job_id(self) -> str | None:
        try:
            manifest = self._read_json(self.active_manifest_path)
        except ContentPackPublishError:
            return None
        value = manifest.get("source_job_id")
        return str(value) if isinstance(value, str) and value else None

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ContentPackPublishError("generated_content_unavailable") from exc
        if not isinstance(value, dict):
            raise ContentPackPublishError("generated_content_invalid")
        return cast(dict[str, Any], value)

    @staticmethod
    def _require_child(path: Path, parent: Path) -> None:
        try:
            path.relative_to(parent)
        except ValueError as exc:
            raise ContentPackPublishError("generated_content_path_outside_root") from exc
