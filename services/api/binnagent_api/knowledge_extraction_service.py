"""Governed PydanticAI extraction used by personalized material generation."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, cast

from binnagent_agent.agents.knowledge_extractor import (
    LongCatKnowledgeAdapter,
    create_knowledge_extractor,
)
from binnagent_agent.observability import observe
from binnagent_domain.model_errors import ModelBalanceError, provider_balance_error_from
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from binnagent_api.learner_usage import (
    ensure_model_usage_available,
    provider_token_usage,
    record_model_usage,
)
from binnagent_api.settings import Settings, get_settings

logger = logging.getLogger("binnagent.knowledge_extraction")


async def enrich_review_contexts(
    contexts: tuple[dict[str, Any], ...],
) -> tuple[tuple[dict[str, Any], ...], bool, str | None]:
    """Enrich untrusted excerpts without allowing model output to change asset identity."""

    settings = get_settings()
    model = model_from_settings(settings)
    longcat = longcat_knowledge_adapter(settings)
    if (model is None and longcat is None) or not contexts:
        return contexts, False, None
    source = "\n\n".join(
        f"<note source_title={item['title']!r} kind={item['kind']!r}>\n{item['excerpt']}\n</note>"
        for item in contexts
    )
    await ensure_model_usage_available()
    try:
        with observe(
            "knowledge.review_context.extract",
            as_type="agent",
            input=source,
            metadata={
                "project_key": "binnagentx",
                "operation": "knowledge_review_context_extraction",
                "provider": settings.model_adapter,
                "context_count": len(contexts),
            },
            model=_model_name(settings),
        ) as observation:
            if longcat is not None:
                output = await longcat.extract(source)
            else:
                if model is None:
                    raise RuntimeError("knowledge_extraction_model_missing")
                result = await asyncio.wait_for(
                    create_knowledge_extractor(model).run(source),
                    timeout=settings.model_timeout_seconds,
                )
                output = result.output
            if observation is not None:
                observation.update(output=output.model_dump(mode="json"))
            input_tokens, output_tokens, counting_method = provider_token_usage(
                {}, request_payload=source, output=output.model_dump_json()
            )
            await record_model_usage(
                provider=settings.model_adapter,
                model=_model_name(settings),
                operation="knowledge_review_context_extraction",
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=settings.model_estimated_cost_usd,
                counting_method=counting_method,
            )
    except ModelBalanceError:
        raise
    except Exception as exc:
        balance_error = provider_balance_error_from(exc, provider=settings.model_adapter)
        if balance_error is not None:
            raise balance_error from exc
        error_code = f"{type(exc).__name__}:{str(exc)[:80]}"
        logger.warning("knowledge extraction fallback: %s", error_code)
        return contexts, False, error_code

    by_title = {str(item["title"]): item for item in contexts}
    additions: dict[str, list[str]] = {}
    for item in output.items:
        if item.source_title not in by_title:
            continue
        additions.setdefault(item.source_title, []).append(
            f"{item.summary} Review cue: {item.review_cue}"
        )
    enriched = tuple(
        {
            **context,
            "excerpt": " ".join(
                [str(context["excerpt"]), *additions.get(str(context["title"]), [])]
            )[:1200],
        }
        for context in contexts
    )
    return enriched, True, None


def longcat_knowledge_adapter(settings: Settings) -> LongCatKnowledgeAdapter | None:
    if (
        not settings.enable_remote_model_calls
        or settings.model_adapter != "longcat"
        or settings.longcat_api_key is None
    ):
        return None
    return LongCatKnowledgeAdapter(
        base_url=settings.longcat_base_url,
        model=settings.longcat_chat_model,
        api_key=settings.longcat_api_key.get_secret_value(),
        max_tokens=max(settings.model_max_tokens, 4000),
        timeout_seconds=max(settings.model_timeout_seconds, 30),
    )


def model_from_settings(settings: Settings) -> Model | None:
    if not settings.enable_remote_model_calls or settings.model_adapter == "deterministic_fixture":
        return None
    api_key: str | None
    if settings.model_adapter == "ollama":
        base_url = settings.ollama_base_url.rstrip("/") + "/v1"
        model_name = settings.ollama_chat_model
        api_key = "ollama-local"
    elif settings.model_adapter == "deepseek":
        base_url = settings.deepseek_base_url
        model_name = settings.deepseek_chat_model
        api_key = (
            settings.deepseek_api_key.get_secret_value() if settings.deepseek_api_key else None
        )
    else:
        base_url = settings.longcat_base_url
        model_name = settings.longcat_chat_model
        api_key = settings.longcat_api_key.get_secret_value() if settings.longcat_api_key else None
    if api_key is None:
        return None
    provider = OpenAIProvider(base_url=base_url, api_key=api_key)
    return OpenAIChatModel(cast(Any, model_name), provider=provider)


def _model_name(settings: Settings) -> str:
    if settings.model_adapter == "ollama":
        return settings.ollama_chat_model
    if settings.model_adapter == "deepseek":
        return settings.deepseek_chat_model
    return settings.longcat_chat_model
