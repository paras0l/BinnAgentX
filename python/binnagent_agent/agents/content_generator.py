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
ReadingQuestionType = Literal[
    "vocabulary_in_context",
    "grammar_cloze",
    "detail_comprehension",
    "main_idea",
    "inference",
    "rhetorical_purpose",
    "sentence_insertion",
    "paragraph_logic",
    "evidence_reasoning",
]
DifficultyTier = Literal["foundation", "standard", "advanced"]


@dataclass(frozen=True, slots=True)
class ContentGenerationRequest:
    content_type: ContentType
    source_item: dict[str, Any]
    target_content_version_id: str
    random_seed: int | None = None
    review_feedback: tuple[str, ...] = ()


class _ModelReadabilityDraft(BaseModel):
    question_type: ReadingQuestionType
    difficulty_tier: DifficultyTier
    prompt: str = Field(min_length=20, max_length=800)
    options: list[str] = Field(min_length=3, max_length=5)
    correct_answer: str = Field(pattern="^[A-E]$")
    hints: list[str] = Field(min_length=4, max_length=4)
    public_explanation: str = Field(min_length=20, max_length=1200)
    common_error_candidates: list[str] = Field(min_length=1, max_length=4)
    evidence_quote: str = Field(min_length=6, max_length=1000)
    alternative_evidence_quote: str | None = Field(default=None, max_length=1000)


class _GeneratedGrammarChallenge(BaseModel):
    paragraph_index: int = Field(ge=0, le=4)
    correct_text: str = Field(min_length=2, max_length=400)
    incorrect_text: str = Field(min_length=2, max_length=400)
    error_type: str = Field(min_length=2, max_length=80)
    hint: str = Field(min_length=4, max_length=200)


class _GeneratedTransferableExpression(BaseModel):
    expression: str = Field(min_length=2, max_length=200)
    appropriate_when: str = Field(min_length=4, max_length=300)
    avoid_when: str = Field(min_length=4, max_length=300)


class _ReadingGenerationDraft(BaseModel):
    title: str = Field(min_length=6, max_length=160)
    paragraphs: list[str] = Field(min_length=2, max_length=5)
    question_bank: list[_ModelReadabilityDraft] = Field(min_length=4, max_length=6)
    grammar_challenges: list[_GeneratedGrammarChallenge] = Field(min_length=2, max_length=4)
    parallel_reconstruction_prompt: str = Field(min_length=20, max_length=800)
    parallel_reconstruction_criteria: list[str] = Field(min_length=2, max_length=8)
    transferable_expressions: list[_GeneratedTransferableExpression] = Field(
        min_length=1, max_length=4
    )


class _GeneratedPriorityCheck(BaseModel):
    check_id: str = Field(pattern=r"^[a-z][a-z0-9_]{2,31}$")
    signal_terms: list[str] = Field(min_length=1, max_length=8)
    feedback: str = Field(min_length=20, max_length=500)


class _MicroGenerationDraft(BaseModel):
    title: str = Field(min_length=6, max_length=160)
    situation: str = Field(min_length=20, max_length=1200)
    audience: str = Field(min_length=2, max_length=200)
    purpose: str = Field(min_length=2, max_length=300)
    target_argument_move: str = Field(min_length=2, max_length=300)
    optional_active_resource: str = Field(min_length=1, max_length=200)
    forbidden_mechanical_use: list[str] = Field(min_length=1, max_length=4)
    v1_minimum: list[str] = Field(min_length=2, max_length=5)
    priority_feedback_checks: list[_GeneratedPriorityCheck] = Field(min_length=1, max_length=4)
    priority_feedback_fallback: str = Field(min_length=20, max_length=500)
    v2_success: list[str] = Field(min_length=2, max_length=5)
    parallel_transfer: str = Field(min_length=20, max_length=800)


def parse_generation_payload(
    content_type: ContentType, payload: object
) -> _ReadingGenerationDraft | _MicroGenerationDraft:
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
        elif self._provider == "longcat":
            payload["thinking"] = {"type": "enabled"}
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
            role = (
                "考研英语阅读材料与题目生成器。生成全新的英文文章, 不得复述或拼接参考文本。"
                "题目必须可由新文章回答; evidence_quote 必须逐字出现在新文章某一段; "
                "每条 evidence_quote 优先截取12到30个英文词, 不要解释或改写原文; "
                "一次生成4到6道可复用题目, 覆盖 foundation、standard、advanced 三档, "
                "并至少包含词义/语法基础题与推断/篇章逻辑高阶题; "
                "每个 grammar_challenge.correct_text 必须逐字出现在指定 paragraph_index; "
                "grammar_challenge 的 correct_text 和 incorrect_text 应尽量控制在 120 字符内; "
                "提示从方向提醒逐步升级到最小明确线索, 不得在 H1/H2 直接泄露答案。"
                "只输出 JSON。Schema: "
            )
        else:
            role = (
                "考研英语表达训练材料生成器。生成一个全新的、可由学习者独立完成的英文表达任务。"
                "任务要有清晰受众、目的、论证动作、最低要求、单项反馈检查和迁移任务; "
                "不得生成成品答案。只输出 JSON。Schema: "
            )
        return role + json.dumps(schema, ensure_ascii=False, separators=(",", ":"))

    def _user_prompt(self, request: ContentGenerationRequest, schema: dict[str, Any]) -> str:
        content_type = request.content_type
        source = request.source_item
        title = source.get("title", "")
        if content_type in {"calibration_reading", "matched_reading"}:
            paragraphs = source.get("paragraphs", [])
            source_preview = [str(p.get("text", "")) for p in paragraphs if isinstance(p, dict)]
            difficulty = source.get("difficulty", {})
            return (
                f"任务类型: {content_type}\n"
                f"随机种子: {request.random_seed}\n"
                f"仅用于题材标签的原题目标题: {title}\n"
                f"目标段落数: {len(source_preview)}\n"
                f"目标词数约: {difficulty.get('word_count', 300)}\n"
                f"目标词汇负荷: {difficulty.get('vocabulary_load', 'moderate')}\n"
                f"目标句法负荷: {difficulty.get('syntax_load', 'moderate')}\n"
                f"目标篇章关系: {difficulty.get('discourse_relations', [])}\n"
                "请生成完整的新英文材料、4到6道分层题目及各自四级提示、至少两项语法挑战、"
                "一个平行重构任务和可迁移表达。paragraphs 数量必须等于目标段落数。\n"
                "foundation 优先 vocabulary_in_context、grammar_cloze、detail_comprehension; "
                "standard 可用 main_idea、detail_comprehension、evidence_reasoning; "
                "advanced 优先 inference、rhetorical_purpose、sentence_insertion、"
                "paragraph_logic、evidence_reasoning。不要把同一道题换措辞重复。\n"
                "你看不到源正文; 必须独立构思新人物、新案例、新数据和新论证路径。\n"
                f"上一轮审核意见: {list(request.review_feedback) or '无'}\n"
                "要求: 只返回严格 JSON, 不解释。\n"
                "可见 schema: "
                f"{json.dumps(schema, ensure_ascii=False, separators=(',', ':'))}\n"
            )
        return (
            f"任务类型: {content_type}\n"
            f"随机种子: {request.random_seed}\n"
            f"原题目标题: {title}\n"
            f"参考论证动作: {source.get('target_argument_move', '')}\n"
            "请生成一个新情境和完整表达训练定义; 保留训练难度, 不得复用原情境或代写答案。\n"
            f"上一轮审核意见: {list(request.review_feedback) or '无'}\n"
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
