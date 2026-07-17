from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Literal, Protocol

import httpx2
from pydantic import BaseModel, Field, ValidationError

from binnagent_agent.gateways.model import ModelAdapterResponse

ProviderName = Literal["ollama", "deepseek", "longcat"]
ContentType = Literal["calibration_reading", "matched_reading", "micro_expression"]


@dataclass(frozen=True, slots=True)
class ContentGenerationRequest:
    content_type: ContentType
    source_item: dict[str, Any]
    target_content_version_id: str
    random_seed: int | None = None


class _ModelReadabilityDraft(BaseModel):
    prompt: str = Field(min_length=20, max_length=800)
    options: list[str] = Field(min_length=3, max_length=5)
    correct_answer: str = Field(pattern="^[A-E]$")
    hints: list[str] = Field(min_length=4, max_length=4)
    public_explanation: str = Field(min_length=20, max_length=1200)
    common_error_candidates: list[str] = Field(min_length=1, max_length=4)
    evidence_quote: str = Field(min_length=6, max_length=180)
    alternative_evidence_quote: str | None = Field(default=None, max_length=180)


class _ReadingGenerationDraft(BaseModel):
    title: str = Field(min_length=6, max_length=160)
    paragraphs: list[str] = Field(min_length=2, max_length=5)
    main_question: _ModelReadabilityDraft


class _MicroGenerationDraft(BaseModel):
    title: str = Field(min_length=6, max_length=160)
    situation: str = Field(min_length=20, max_length=1200)


def parse_generation_payload(content_type: ContentType, payload: object) -> Any:
    if content_type in {"calibration_reading", "matched_reading"}:
        try:
            return _ReadingGenerationDraft.model_validate(payload)
        except ValidationError as exc:
            raise ValueError("agent reading generation payload invalid") from exc
    try:
        return _MicroGenerationDraft.model_validate(payload)
    except ValidationError as exc:
        raise ValueError("agent micro generation payload invalid") from exc


class ContentGeneratorAdapter(Protocol):
    name: str
    is_remote: bool
    estimated_cost_usd: Decimal

    def generate(self, request: ContentGenerationRequest) -> dict[str, Any]: ...


class _RemoteContentGenerationAdapterBase:
    is_remote = True

    def __init__(
        self,
        *,
        provider: ProviderName,
        base_url: str,
        model: str,
        api_key: str | None,
        estimated_cost_usd: Decimal,
        max_tokens: int,
        timeout_seconds: float,
        transport: httpx2.AsyncBaseTransport | None = None,
    ) -> None:
        self.name: str = provider
        self.estimated_cost_usd = estimated_cost_usd
        self._provider = provider
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._api_key = api_key
        self._max_tokens = max_tokens
        self._timeout_seconds = timeout_seconds
        self._transport = transport

    def generate(self, request: ContentGenerationRequest) -> dict[str, Any]:
        schema = self._prompt_schema(request.content_type)
        payload = self._payload(request, schema)
        raw = self._send(payload)
        return self._parse_content(raw, request.content_type)

    def _payload(self, request: ContentGenerationRequest, schema: dict[str, Any]) -> dict[str, Any]:
        user_prompt = self._user_prompt(request, schema)
        messages: list[dict[str, str]] = [
            {"role": "system", "content": self._system_prompt(request.content_type, schema)},
            {"role": "user", "content": user_prompt},
        ]
        if self._provider == "longcat":
            messages.append(
                {
                    "role": "user",
                    "content": "只输出 JSON 对象, 不要 markdown",
                }
            )
        payload: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "stream": False,
            "temperature": 0.25,
            "max_tokens": self._max_tokens,
        }
        if self._provider == "ollama":
            payload["format"] = schema
            payload["options"] = {"temperature": 0.25, "num_predict": self._max_tokens}
        elif self._provider == "deepseek":
            payload["response_format"] = {"type": "json_object"}
        return payload

    def _send(self, payload: dict[str, Any]) -> ModelAdapterResponse:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        if self._provider != "ollama" and not self._api_key:
            raise RuntimeError(f"{self._provider}_api_key_not_configured")
        with httpx2.Client(
            base_url=self._base_url,
            timeout=self._timeout_seconds,
            headers=headers,
            transport=self._transport,
        ) as client:
            response = client.post(self._path(), json=payload)
            response.raise_for_status()
            return ModelAdapterResponse(
                payload=json.loads(_strip_json_fence(self._content(response.json()))),
                actual_cost_usd=self.estimated_cost_usd,
            )

    def _parse_content(
        self,
        response: ModelAdapterResponse,
        content_type: ContentType,
    ) -> dict[str, Any]:
        parsed = parse_generation_payload(content_type, response.payload)
        return parsed.model_dump()

    def _system_prompt(self, content_type: ContentType, schema: dict[str, Any]) -> str:
        if content_type in {"calibration_reading", "matched_reading"}:
            return "你是阅读内容题目生成器. 只输出 JSON, schema: " + json.dumps(
                schema, ensure_ascii=False, separators=(",", ":")
            )
        return "你是情景任务生成器. 只输出 JSON, schema: " + json.dumps(
            schema, ensure_ascii=False, separators=(",", ":")
        )

    def _user_prompt(self, request: ContentGenerationRequest, schema: dict[str, Any]) -> str:
        content_type = request.content_type
        source = request.source_item
        title = source.get("title", "")
        if content_type in {"calibration_reading", "matched_reading"}:
            paragraphs = source.get("paragraphs", [])
            source_preview = [str(p.get("text", "")) for p in paragraphs if isinstance(p, dict)]
            first_two = "\n---\n".join(source_preview[:2])
            return (
                f"任务类型: {content_type}\n"
                f"原题目标题: {title}\n"
                f"参考文本片段:\n{first_two}\n"
                "请基于该题材生成一篇新英文材料和一道主问题.\n"
                "要求: 只返回严格 JSON, 不解释.\n"
                "可见 schema: "
                f"{json.dumps(schema, ensure_ascii=False, separators=(',', ':'))}\n"
            )
        return (
            f"任务类型: {content_type}\n"
            f"原题目标题: {title}\n"
            "请基于该情景生成一个教学任务场景.\n"
            "可见 schema: "
            f"{json.dumps(schema, ensure_ascii=False, separators=(',', ':'))}.\n"
        )

    def _prompt_schema(self, content_type: ContentType) -> dict[str, Any]:
        if content_type in {"calibration_reading", "matched_reading"}:
            return _ReadingGenerationDraft.model_json_schema()
        return _MicroGenerationDraft.model_json_schema()

    def _path(self) -> str:
        if self._provider == "ollama":
            return "/api/chat"
        if self._provider == "longcat":
            return "/v1/chat/completions"
        return "/chat/completions"

    @staticmethod
    def _content(payload: object) -> str:
        if not isinstance(payload, dict):
            raise ValueError("model_response_must_be_an_object")
        if payload.get("message") is not None:
            message = payload.get("message")
            content = message.get("content") if isinstance(message, dict) else None
            if not isinstance(content, str) or not content.strip():
                raise ValueError("model_response_content_missing")
            return content
        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ValueError("model_response_choices_missing")
        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str) or not content.strip():
            raise ValueError("model_response_content_missing")
        return content


class RemoteContentGenerationAdapter(_RemoteContentGenerationAdapterBase):
    pass


def _strip_json_fence(content: str) -> str:
    value = content.strip()
    if value.startswith("```") and value.endswith("```"):
        lines = value.splitlines()
        if len(lines) >= 3:
            return "\n".join(lines[1:-1]).strip()
    return value
