from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Literal, Protocol

import httpx2
from pydantic import BaseModel, Field

from binnagent_agent.agents.content_generator import ContentType, ProviderName
from binnagent_agent.observability import observe


class ContentQualityScores(BaseModel):
    factual_coherence: int = Field(ge=1, le=5)
    answerability: int = Field(ge=1, le=5)
    evidence_grounding: int = Field(ge=1, le=5)
    difficulty_alignment: int = Field(ge=1, le=5)
    question_diversity: int = Field(ge=1, le=5)
    hint_progression: int = Field(ge=1, le=5)
    language_quality: int = Field(ge=1, le=5)


class ContentReviewIssue(BaseModel):
    severity: Literal["critical", "high", "medium", "low"]
    field_path: str = Field(min_length=1, max_length=200)
    explanation: str = Field(min_length=8, max_length=600)
    required_fix: str = Field(min_length=8, max_length=600)


class ContentReviewResult(BaseModel):
    verdict: Literal["approve", "revise", "reject"]
    scores: ContentQualityScores
    issues: list[ContentReviewIssue] = Field(default_factory=list, max_length=8)
    summary: str = Field(min_length=20, max_length=800)
    limitations: list[str] = Field(min_length=1, max_length=6)

    def passes_release_gate(self, minimum_score: int = 4) -> bool:
        scores = self.scores.model_dump().values()
        blocking_issue = any(item.severity in {"critical", "high"} for item in self.issues)
        return (
            self.verdict == "approve"
            and not blocking_issue
            and all(int(value) >= minimum_score for value in scores)
        )

    def revision_feedback(self) -> tuple[str, ...]:
        feedback = [
            f"{item.field_path}: {item.required_fix}"
            for item in self.issues
            if item.severity in {"critical", "high", "medium"}
        ]
        if not feedback:
            feedback.append(self.summary)
        return tuple(feedback[:6])


@dataclass(frozen=True, slots=True)
class ContentReviewRequest:
    content_type: ContentType
    source_item: dict[str, Any]
    candidate_item: dict[str, Any]


class ContentReviewerAdapter(Protocol):
    name: str
    is_remote: bool
    estimated_cost_usd: Decimal

    def review(self, request: ContentReviewRequest) -> ContentReviewResult: ...


class RemoteContentReviewerAdapter:
    is_remote = True
    prompt_version = "prompt_content_judge_v1"

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
        transport: httpx2.BaseTransport | None = None,
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

    def review(self, request: ContentReviewRequest) -> ContentReviewResult:
        schema = ContentReviewResult.model_json_schema()
        payload: dict[str, Any] = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": self._system_prompt(schema)},
                {"role": "user", "content": self._user_prompt(request)},
            ],
            "stream": False,
            "temperature": 0.1,
            "max_tokens": self._max_tokens,
        }
        if self._provider == "ollama":
            payload["format"] = schema
            payload["options"] = {"temperature": 0.1, "num_predict": self._max_tokens}
        elif self._provider == "longcat":
            payload["thinking"] = {"type": "enabled"}
        elif self._provider == "deepseek":
            payload["response_format"] = {"type": "json_object"}

        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        if self._provider != "ollama" and not self._api_key:
            raise RuntimeError(f"{self._provider}_api_key_not_configured")
        with observe(
            "content.reviewer",
            as_type="generation",
            input=payload.get("messages"),
            metadata={"provider": self._provider, "agent_role": "review_agent"},
            model=self._model,
            model_parameters={
                "temperature": payload.get("temperature"),
                "max_tokens": payload.get("max_tokens"),
            },
        ) as observation:
            with httpx2.Client(
                base_url=self._base_url,
                timeout=self._timeout_seconds,
                headers=headers,
                transport=self._transport,
            ) as client:
                response = client.post(self._path(), json=payload)
                response.raise_for_status()
                content = self._final_content(response.json())
            if observation is not None:
                observation.update(output=content)
        return _parse_review_result(content)

    @staticmethod
    def _system_prompt(schema: dict[str, Any]) -> str:
        return (
            "你是独立的考研英语内容审核 Agent, 不参与生成。允许在内部充分推理, 但最终只输出"
            "JSON 审核报告。逐项检查文章或表达任务的事实自洽、语言自然度、题目是否唯一可答、"
            "答案与逐字证据是否一致、H1-H4 是否逐步加深、难度是否匹配、题型是否真正多样。"
            "阅读材料必须同时包含基础题与高阶题, 不能用换措辞伪造题型多样性。发现答案不唯一、"
            "证据不支持答案、明显复制源材料或教学边界失守时必须 revise 或 reject。"
            "approve 仅用于所有分数至少4且无 high/critical issue。Schema: "
            + json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
        )

    @staticmethod
    def _user_prompt(request: ContentReviewRequest) -> str:
        source_reference = {
            "title": request.source_item.get("title"),
            "paragraphs": request.source_item.get("paragraphs"),
            "difficulty": request.source_item.get("difficulty"),
            "target_argument_move": request.source_item.get("target_argument_move"),
        }
        candidate = dict(request.candidate_item)
        candidate.pop("review", None)
        return (
            f"内容类型: {request.content_type}\n"
            "源材料只用于检查是否过度复用和难度对齐, 不代表正确答案。\n"
            f"源材料摘要: {json.dumps(source_reference, ensure_ascii=False)}\n"
            f"待审候选: {json.dumps(candidate, ensure_ascii=False)}\n"
            "请独立审核并只返回最终 JSON。"
        )

    def _path(self) -> str:
        if self._provider == "ollama":
            return "/api/chat"
        if self._provider == "longcat":
            return "/v1/chat/completions"
        return "/chat/completions"

    @staticmethod
    def _final_content(payload: object) -> str:
        if not isinstance(payload, dict):
            raise ValueError("model_response_must_be_an_object")
        message = payload.get("message")
        if not isinstance(message, dict):
            choices = payload.get("choices")
            if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
                raise ValueError("model_response_choices_missing")
            message = choices[0].get("message")
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str) or not content.strip():
            raise ValueError("model_response_content_missing")
        return content


def _strip_json_fence(content: str) -> str:
    value = content.strip()
    if value.startswith("```") and value.endswith("```"):
        lines = value.splitlines()
        if len(lines) >= 3:
            return "\n".join(lines[1:-1]).strip()
    return value


def _parse_review_result(content: str) -> ContentReviewResult:
    payload = json.loads(_strip_json_fence(content))
    if not isinstance(payload, dict):
        raise ValueError("review_response_must_be_an_object")
    summary = payload.get("summary")
    if isinstance(summary, str):
        payload["summary"] = summary[:800]
    limitations = payload.get("limitations")
    if isinstance(limitations, list):
        payload["limitations"] = [str(value)[:600] for value in limitations[:6]]
    issues = payload.get("issues")
    if isinstance(issues, list):
        normalized_issues: list[object] = []
        for raw_issue in issues[:8]:
            if not isinstance(raw_issue, dict):
                normalized_issues.append(raw_issue)
                continue
            issue = dict(raw_issue)
            for field, maximum in (
                ("field_path", 200),
                ("explanation", 600),
                ("required_fix", 600),
            ):
                value = issue.get(field)
                if isinstance(value, str):
                    issue[field] = value[:maximum]
            normalized_issues.append(issue)
        payload["issues"] = normalized_issues
    return ContentReviewResult.model_validate(payload)
