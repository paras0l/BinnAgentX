"""Generate a resumable LongCat glossary for the NETEM syllabus vocabulary."""

# ruff: noqa: RUF001

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.request import urlopen

import httpx2
from binnagent_agent.agents.structured_output import load_model_json
from binnagent_api.settings import PROJECT_ROOT, Settings
from pydantic import BaseModel, ConfigDict, Field, model_validator

SOURCE_URL = (
    "https://raw.githubusercontent.com/exam-data/NETEMVocabulary/"
    "master/netem_full_list.json"
)
SOURCE_KEY = "5530考研词汇词频排序表"
BATCH_SIZE = 20
DOCUMENT_SIZE = 200


class Sense(BaseModel):
    model_config = ConfigDict(extra="forbid")

    part_of_speech: str = Field(min_length=1, max_length=24)
    meaning: str = Field(min_length=1, max_length=100)
    exam_note: str = Field(min_length=1, max_length=140)

    @model_validator(mode="before")
    @classmethod
    def migrate_observed_part_of_speech_typo(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        migrated = dict(value)
        typo = migrated.pop("part_of_s_of_speech", None)
        if "part_of_speech" not in migrated and isinstance(typo, str):
            migrated["part_of_speech"] = typo
        return migrated


class Collocation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expression: str = Field(min_length=1, max_length=100)
    meaning: str = Field(min_length=1, max_length=100)

    @model_validator(mode="before")
    @classmethod
    def migrate_observed_translation_key(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        migrated = dict(value)
        translation = migrated.pop("translation", None)
        if "meaning" not in migrated and isinstance(translation, str):
            migrated["meaning"] = translation
        return migrated


class Example(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sentence: str = Field(min_length=8, max_length=260)
    translation: str = Field(min_length=4, max_length=220)


class WordFamilyItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    form: str = Field(min_length=1, max_length=60)
    part_of_speech: str = Field(min_length=1, max_length=24)
    meaning: str = Field(min_length=1, max_length=80)


class VocabularyEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    word: str = Field(min_length=1, max_length=80)
    ipa_uk: str = Field(min_length=1, max_length=80)
    ipa_us: str = Field(min_length=1, max_length=80)
    variants: list[str] = Field(default_factory=list, max_length=10)
    senses: list[Sense] = Field(min_length=1, max_length=6)
    collocations: list[Collocation] = Field(min_length=1, max_length=6)
    example: Example
    word_family: list[WordFamilyItem] = Field(default_factory=list, max_length=6)
    contrast: str = Field(min_length=1, max_length=180)
    memory_tip: str = Field(min_length=1, max_length=160)
    exam_tip: str = Field(min_length=1, max_length=180)

    @model_validator(mode="before")
    @classmethod
    def normalize_observed_key_casing(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        canonical = {
            name.casefold(): name for name in cls.model_fields
        }
        migrated: dict[str, Any] = {}
        for key, item in value.items():
            normalized = canonical.get(str(key).casefold(), str(key))
            if normalized in migrated:
                raise ValueError(f"duplicate field after key normalization: {normalized}")
            migrated[normalized] = item
        return migrated


class VocabularyBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entries: list[VocabularyEntry] = Field(min_length=1, max_length=BATCH_SIZE)

    @model_validator(mode="after")
    def unique_words(self) -> VocabularyBatch:
        words = [entry.word for entry in self.entries]
        if len(words) != len(set(words)):
            raise ValueError("batch contains duplicate words")
        return self


class FlatVocabularyEntry(BaseModel):
    """Provider-facing shape with no nested objects."""

    model_config = ConfigDict(extra="forbid")

    word: str = Field(min_length=1, max_length=80)
    ipa_uk: str = Field(min_length=1, max_length=80)
    ipa_us: str = Field(min_length=1, max_length=80)
    variants: list[str] = Field(default_factory=list, max_length=10)
    senses: list[str] = Field(min_length=1, max_length=4)
    collocations: list[str] = Field(min_length=1, max_length=4)
    example_sentence: str = Field(min_length=8, max_length=260)
    example_translation: str = Field(min_length=4, max_length=220)
    word_family: list[str] = Field(default_factory=list, max_length=4)
    contrast: str = Field(min_length=1, max_length=140)
    memory_tip: str = Field(min_length=1, max_length=120)
    exam_tip: str = Field(min_length=1, max_length=140)

    @model_validator(mode="before")
    @classmethod
    def normalize_key_casing(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        canonical = {name.casefold(): name for name in cls.model_fields}
        migrated: dict[str, Any] = {}
        for key, item in value.items():
            key_text = str(key)
            normalized = canonical.get(key_text.casefold(), key_text)
            if key_text.casefold() == "collections":
                normalized = "collocations"
            if normalized in migrated:
                raise ValueError(f"duplicate field after key normalization: {normalized}")
            migrated[normalized] = item
        return migrated


class FlatVocabularyBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entries: list[FlatVocabularyEntry] = Field(min_length=1, max_length=BATCH_SIZE)


class SourceWord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sequence: int
    frequency: int
    word: str
    source_meaning: str
    alternate_spelling: str | None


class QuotaExhausted(RuntimeError):
    """The provider rejected further work because quota or rate allowance ended."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_ROOT / "output" / "netem-vocabulary",
    )
    parser.add_argument("--source-url", default=SOURCE_URL)
    parser.add_argument("--target-count", type=int, default=5530)
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--max-tokens", type=int, default=6000)
    parser.add_argument("--timeout-seconds", type=float, default=180)
    parser.add_argument("--max-attempts", type=int, default=3)
    parser.add_argument(
        "--passes",
        type=int,
        default=3,
        help="Retry still-missing batches in this many full queue passes.",
    )
    parser.add_argument(
        "--limit-batches",
        type=int,
        help="Generate only this many missing batches (useful for a smoke run).",
    )
    return parser.parse_args()


def load_source(source_path: Path, source_url: str, target_count: int) -> list[SourceWord]:
    source_path.parent.mkdir(parents=True, exist_ok=True)
    if not source_path.exists():
        with urlopen(source_url, timeout=30) as response:
            payload = response.read()
        source_path.write_bytes(payload)
    raw = json.loads(source_path.read_text(encoding="utf-8"))
    rows = raw.get(SOURCE_KEY)
    if not isinstance(rows, list) or len(rows) < target_count:
        raise ValueError(f"source must contain at least {target_count} words")
    words = [
        SourceWord(
            sequence=int(row["序号"]),
            frequency=int(row["词频"]),
            word=str(row["单词"]).strip(),
            source_meaning=str(row["释义"]).strip(),
            alternate_spelling=(
                str(row["其他拼写"]).strip() if row.get("其他拼写") else None
            ),
        )
        for row in rows[:target_count]
    ]
    normalized = [item.word for item in words]
    if len(normalized) != len(set(normalized)):
        raise ValueError("source contains duplicate headwords")
    return words


def chunked[T](items: list[T], size: int) -> list[list[T]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def batch_path(output: Path, words: list[SourceWord]) -> Path:
    return output / ".batches" / f"{words[0].sequence:04d}-{words[-1].sequence:04d}.json"


def markdown_batch_path(output: Path, words: list[SourceWord]) -> Path:
    return output / ".batches" / f"{words[0].sequence:04d}-{words[-1].sequence:04d}.md"


def raw_batch_path(output: Path, words: list[SourceWord]) -> Path:
    return output / ".raw" / f"{words[0].sequence:04d}-{words[-1].sequence:04d}.txt"


def validate_batch(batch: VocabularyBatch, expected: list[SourceWord]) -> VocabularyBatch:
    actual_words = [entry.word for entry in batch.entries]
    expected_words = [item.word for item in expected]
    if actual_words != expected_words:
        raise ValueError(
            f"word mismatch: expected {expected_words!r}, received {actual_words!r}"
        )
    return batch


REQUIRED_MARKDOWN_LABELS = (
    "发音",
    "核心义与考研用法",
    "常用搭配",
    "语境例句",
    "译文",
    "词族/形态",
    "易混辨析",
    "记忆提示",
    "应试提示",
)


def validate_markdown_batch(content: str, expected: list[SourceWord]) -> list[str]:
    value = content.strip()
    if value.startswith("```") and value.endswith("```"):
        lines = value.splitlines()
        value = "\n".join(lines[1:-1]).strip()
    matches = list(re.finditer(r"(?m)^## ([^\n]+)\s*$", value))
    headings = [match.group(1).strip() for match in matches]
    expected_words = [item.word for item in expected]
    if headings != expected_words:
        raise ValueError(
            f"markdown word mismatch: expected {expected_words!r}, received {headings!r}"
        )
    blocks: list[str] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(value)
        block = value[match.start() : end].strip()
        if not 180 <= len(block) <= 2400:
            raise ValueError(
                f"markdown block length invalid for {headings[index]}: {len(block)}"
            )
        for label in REQUIRED_MARKDOWN_LABELS:
            if not re.search(rf"(?m)^- \*\*{re.escape(label)}\*\*[:：]", block):
                raise ValueError(f"markdown label missing for {headings[index]}: {label}")
        blocks.append(block)
    return blocks


def persist_markdown_batch(
    destination: Path,
    content: str,
    words: list[SourceWord],
) -> Path:
    blocks = validate_markdown_batch(content, words)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".tmp")
    temporary.write_text("\n\n".join(blocks) + "\n", encoding="utf-8")
    temporary.replace(destination)
    return destination


def split_compact_field(value: str, parts: int, field_name: str) -> list[str]:
    normalized = value.replace("｜", "||")
    delimiter = "||" if "||" in normalized else "|"
    items = [item.strip() for item in normalized.split(delimiter)]
    if len(items) != parts or any(not item for item in items):
        raise ValueError(f"{field_name} must contain {parts} non-empty parts: {value!r}")
    return items


def expand_flat_batch(batch: FlatVocabularyBatch) -> VocabularyBatch:
    entries: list[VocabularyEntry] = []
    for item in batch.entries:
        senses = [
            Sense(
                part_of_speech=parts[0],
                meaning=parts[1],
                exam_note=parts[2],
            )
            for value in item.senses
            for parts in [split_compact_field(value, 3, "sense")]
        ]
        collocations = [
            Collocation(expression=parts[0], meaning=parts[1])
            for value in item.collocations
            for parts in [split_compact_field(value, 2, "collocation")]
        ]
        word_family = [
            WordFamilyItem(
                form=parts[0],
                part_of_speech=parts[1],
                meaning=parts[2],
            )
            for value in item.word_family
            for parts in [split_compact_field(value, 3, "word_family")]
        ]
        entries.append(
            VocabularyEntry(
                word=item.word,
                ipa_uk=item.ipa_uk,
                ipa_us=item.ipa_us,
                variants=item.variants,
                senses=senses,
                collocations=collocations,
                example=Example(
                    sentence=item.example_sentence,
                    translation=item.example_translation,
                ),
                word_family=word_family,
                contrast=item.contrast,
                memory_tip=item.memory_tip,
                exam_tip=item.exam_tip,
            )
        )
    return VocabularyBatch(entries=entries)


def persist_validated_batch(
    destination: Path,
    content: str,
    words: list[SourceWord],
) -> Path:
    payload = load_model_json(content)
    try:
        parsed = expand_flat_batch(FlatVocabularyBatch.model_validate(payload))
    except ValueError as flat_error:
        try:
            parsed = VocabularyBatch.model_validate(payload)
        except ValueError:
            raise flat_error from None
    validated = validate_batch(parsed, words)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".tmp")
    temporary.write_text(validated.model_dump_json(indent=2), encoding="utf-8")
    temporary.replace(destination)
    return destination


def prompt_for(words: list[SourceWord]) -> tuple[str, str]:
    source = [
        {
            "sequence": item.sequence,
            "word": item.word,
            "alternate_spelling": item.alternate_spelling,
            "reference_meaning": item.source_meaning,
        }
        for item in words
    ]
    system = (
        "你是严谨的考研英语词汇编写专家。为输入中的每个基本词形编写原创、准确、"
        "紧凑且适合考研英语一/二阅读、翻译与写作复习的词条。必须保持输入顺序和拼写，"
        "每词只生成一条。reference_meaning 只是待核对线索，不可盲从。"
        "释义优先覆盖真题常见义和熟词僻义；词性与义项对应；搭配自然；"
        "例句必须原创、自然、有清晰上下文并准确翻译，不得声称是真题原句；"
        "词族只列真实常用形式；无典型近形词时，contrast 写与最易误用结构的区别；"
        "memory_tip 使用可靠词根词缀或语义联想，不编造词源。"
        "英美音标均使用 IPA。所有中文字段简明但有辨识度。"
        "每词只保留 1–4 个有区分度的义项、1–4 个高价值搭配、0–4 个常用词族；"
        "避免同义重复，每条说明尽量控制在 50 个汉字以内。"
        "只输出 Markdown 词条，不要前言、总结、代码围栏或 JSON。"
        "每词必须严格使用以下 10 行结构，所有标签逐字保留：\n"
        "## word\n"
        "- **发音**：英 /IPA/；美 /IPA/\n"
        "- **核心义与考研用法**：词性+核心义；必要时补熟词僻义\n"
        "- **常用搭配**：英文搭配（中文义）；英文搭配（中文义）\n"
        "- **语境例句**：原创英文句\n"
        "- **译文**：准确中文翻译\n"
        "- **词族/形态**：词形（词性，中文义）；没有则写“无常用派生词”\n"
        "- **易混辨析**：与近义词、近形词或易误用结构的区别\n"
        "- **记忆提示**：可靠词根词缀或核心语义联想\n"
        "- **应试提示**：阅读、翻译或写作中的识别/使用提醒\n"
        "word 必须替换为输入中的精确拼写，词条之间空一行。"
    )
    user = (
        f"请生成这 {len(words)} 个词："
        f"{json.dumps(source, ensure_ascii=False, separators=(',', ':'))}"
    )
    return system, user


def longcat_content(payload: Any) -> str:
    if not isinstance(payload, dict):
        raise ValueError("model_response_must_be_an_object")
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise ValueError("model_response_choices_missing")
    message = choices[0].get("message")
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, str) or not content.strip():
        raise ValueError("model_response_content_missing")
    return content


def quota_error(response: httpx2.Response) -> bool:
    if response.status_code in {402, 403}:
        return True
    if response.status_code != 429:
        return False
    detail = response.text.casefold()
    return any(
        marker in detail
        for marker in ("quota", "balance", "credit", "insufficient", "额度", "余额")
    )


async def generate_batch(
    *,
    client: httpx2.AsyncClient,
    settings: Settings,
    words: list[SourceWord],
    output: Path,
    max_tokens: int,
    max_attempts: int,
) -> Path:
    destination = batch_path(output, words)
    if destination.exists():
        saved = VocabularyBatch.model_validate_json(destination.read_text(encoding="utf-8"))
        validate_batch(saved, words)
        return destination
    markdown_destination = markdown_batch_path(output, words)
    if markdown_destination.exists():
        validate_markdown_batch(
            markdown_destination.read_text(encoding="utf-8"),
            words,
        )
        return markdown_destination
    raw_path = raw_batch_path(output, words)
    if raw_path.exists():
        try:
            return persist_markdown_batch(
                markdown_destination,
                raw_path.read_text(encoding="utf-8"),
                words,
            )
        except ValueError:
            pass
    system, user = prompt_for(words)
    payload = {
        "model": settings.longcat_chat_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
            {"role": "user", "content": "只输出 20 个严格按模板排列的 Markdown 词条。"},
        ],
        "stream": False,
        "temperature": 0.15,
        "max_tokens": max_tokens,
        "thinking": {"type": "disabled"},
    }
    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            response = await client.post("/v1/chat/completions", json=payload)
            if quota_error(response):
                raise QuotaExhausted(
                    f"LongCat quota exhausted at words "
                    f"{words[0].sequence}-{words[-1].sequence}: HTTP {response.status_code}"
                )
            response.raise_for_status()
            content = longcat_content(response.json())
            raw_path.parent.mkdir(parents=True, exist_ok=True)
            raw_path.write_text(content, encoding="utf-8")
            return persist_markdown_batch(markdown_destination, content, words)
        except QuotaExhausted:
            raise
        except (httpx2.TransportError, httpx2.HTTPStatusError, ValueError) as exc:
            last_error = exc
            if isinstance(exc, httpx2.HTTPStatusError):
                status = exc.response.status_code
                if status not in {429} and status < 500:
                    raise
            if attempt < max_attempts:
                await asyncio.sleep(min(2**attempt, 8))
    assert last_error is not None
    raise last_error


def markdown_entry(sequence: int, entry: VocabularyEntry) -> str:
    variants = "、".join(entry.variants) if entry.variants else "无"
    senses = "\n".join(
        f"  - **{sense.part_of_speech}** {sense.meaning}；{sense.exam_note}"
        for sense in entry.senses
    )
    collocations = "\n".join(
        f"  - `{item.expression}`：{item.meaning}" for item in entry.collocations
    )
    family = (
        "；".join(
            f"`{item.form}` ({item.part_of_speech}) {item.meaning}"
            for item in entry.word_family
        )
        if entry.word_family
        else "无常用派生词"
    )
    return (
        f"## {sequence}. {entry.word}\n\n"
        f"- **发音**：英 {entry.ipa_uk}；美 {entry.ipa_us}\n"
        f"- **异体/替代拼写**：{variants}\n"
        f"- **核心义与考研用法**：\n{senses}\n"
        f"- **常用搭配**：\n{collocations}\n"
        f"- **语境例句**：{entry.example.sentence}\n"
        f"  - 译：{entry.example.translation}\n"
        f"- **词族/形态**：{family}\n"
        f"- **易混辨析**：{entry.contrast}\n"
        f"- **记忆提示**：{entry.memory_tip}\n"
        f"- **应试提示**：{entry.exam_tip}\n"
    )


def load_completed_sections(
    output: Path, batches: list[list[SourceWord]]
) -> dict[int, str]:
    completed: dict[int, str] = {}
    for words in batches:
        path = batch_path(output, words)
        markdown_path = markdown_batch_path(output, words)
        if path.exists():
            batch = validate_batch(
                VocabularyBatch.model_validate_json(path.read_text(encoding="utf-8")),
                words,
            )
            for source, entry in zip(words, batch.entries, strict=True):
                completed[source.sequence] = markdown_entry(source.sequence, entry)
        elif markdown_path.exists():
            blocks = validate_markdown_batch(
                markdown_path.read_text(encoding="utf-8"),
                words,
            )
            for source, block in zip(words, blocks, strict=True):
                completed[source.sequence] = re.sub(
                    rf"^## {re.escape(source.word)}\s*$",
                    f"## {source.sequence}. {source.word}",
                    block,
                    count=1,
                    flags=re.MULTILINE,
                )
    return completed


def render_documents(
    output: Path,
    words: list[SourceWord],
    batches: list[list[SourceWord]],
    *,
    model: str,
    source_url: str,
) -> int:
    sections = load_completed_sections(output, batches)
    rendered = 0
    for document_words in chunked(words, DOCUMENT_SIZE):
        if not all(item.sequence in sections for item in document_words):
            continue
        start = document_words[0].sequence
        end = document_words[-1].sequence
        title = f"考研大纲词汇精解 {start:04d}-{end:04d}"
        body = [
            f"# {title}",
            "",
            f"> 词表来源：{source_url}",
            f"> 生成模型：{model}；每次请求 {BATCH_SIZE} 词；本卷 {len(document_words)} 词。",
            "> 内容为模型原创学习解释，须在正式出版或高风险使用前进行人工校订。",
            "",
        ]
        body.extend(sections[item.sequence] for item in document_words)
        path = output / f"netem-vocabulary-{start:04d}-{end:04d}.md"
        path.write_text("\n".join(body).rstrip() + "\n", encoding="utf-8")
        rendered += 1
    return rendered


def write_manifest(
    *,
    output: Path,
    words: list[SourceWord],
    batches: list[list[SourceWord]],
    model: str,
    source_url: str,
    status: str,
    error: str | None,
) -> None:
    completed = load_completed_sections(output, batches)
    continuous_word_count = 0
    for sequence in range(1, len(words) + 1):
        if sequence not in completed:
            break
        continuous_word_count = sequence
    completed_document_count = sum(
        1
        for document_words in chunked(words, DOCUMENT_SIZE)
        if all(item.sequence in completed for item in document_words)
    )
    source_path = output / "source" / "netem_full_list.json"
    manifest = {
        "status": status,
        "model_provider": "longcat",
        "model": model,
        "source_url": source_url,
        "source_sha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
        "source_license": "CC BY-NC-SA 4.0",
        "target_word_count": len(words),
        "completed_word_count": len(completed),
        "continuous_word_count": continuous_word_count,
        "batch_size": BATCH_SIZE,
        "document_size": DOCUMENT_SIZE,
        "completed_document_count": completed_document_count,
        "completed_batches": sum(
            1
            for items in batches
            if batch_path(output, items).exists()
            or markdown_batch_path(output, items).exists()
        ),
        "total_batches": len(batches),
        "error": error,
        "updated_at_unix": int(time.time()),
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


async def run(args: argparse.Namespace) -> int:
    if args.concurrency < 1:
        raise ValueError("concurrency must be at least 1")
    if args.passes < 1:
        raise ValueError("passes must be at least 1")
    settings = Settings()
    if settings.model_adapter != "longcat":
        raise RuntimeError(f"expected longcat adapter, got {settings.model_adapter}")
    if settings.longcat_api_key is None:
        raise RuntimeError("longcat_api_key_not_configured")
    args.output.mkdir(parents=True, exist_ok=True)
    source_path = args.output / "source" / "netem_full_list.json"
    words = load_source(source_path, args.source_url, args.target_count)
    batches = chunked(words, BATCH_SIZE)
    initial_missing = [
        items
        for items in batches
        if not batch_path(args.output, items).exists()
        and not markdown_batch_path(args.output, items).exists()
    ]
    selected = (
        initial_missing[: args.limit_batches]
        if args.limit_batches is not None
        else initial_missing
    )
    semaphore = asyncio.Semaphore(args.concurrency)
    headers = {
        "Authorization": f"Bearer {settings.longcat_api_key.get_secret_value()}",
        "Content-Type": "application/json",
    }
    error: str | None = None
    status = "partial" if args.limit_batches is not None and selected else "complete"
    async with httpx2.AsyncClient(
        base_url=settings.longcat_base_url.rstrip("/"),
        headers=headers,
        timeout=args.timeout_seconds,
    ) as client:

        async def bounded(items: list[SourceWord]) -> Path:
            async with semaphore:
                path = await generate_batch(
                    client=client,
                    settings=settings,
                    words=items,
                    output=args.output,
                    max_tokens=args.max_tokens,
                    max_attempts=args.max_attempts,
                )
                print(
                    f"completed {items[0].sequence:04d}-{items[-1].sequence:04d}",
                    flush=True,
                )
                return path

        for pass_number in range(1, args.passes + 1):
            missing = [
                items
                for items in selected
                if not batch_path(args.output, items).exists()
                and not markdown_batch_path(args.output, items).exists()
            ]
            if not missing:
                break
            print(
                f"starting_pass={pass_number} missing_batches={len(missing)}",
                flush=True,
            )
            pass_errors: list[str] = []
            quota_exception: QuotaExhausted | None = None
            for wave in chunked(missing, args.concurrency):
                tasks = [asyncio.create_task(bounded(items)) for items in wave]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for result in results:
                    if isinstance(result, QuotaExhausted):
                        quota_exception = result
                    elif isinstance(result, BaseException):
                        message = f"{type(result).__name__}: {result}"
                        pass_errors.append(message)
                        print(f"batch_failed {message}", flush=True)
                if quota_exception is not None:
                    break
                if any(not isinstance(result, BaseException) for result in results):
                    render_documents(
                        args.output,
                        words,
                        batches,
                        model=settings.longcat_chat_model,
                        source_url=args.source_url,
                    )
            if quota_exception is not None:
                status = "quota_exhausted"
                error = str(quota_exception)
                break
            if pass_errors:
                error = f"{len(pass_errors)} batch failures in pass {pass_number}"
        remaining = [
            items
            for items in selected
            if not batch_path(args.output, items).exists()
            and not markdown_batch_path(args.output, items).exists()
        ]
        if remaining and status != "quota_exhausted":
            status = "failed"
            error = f"{len(remaining)} selected batches remain after {args.passes} passes"
    rendered = render_documents(
        args.output,
        words,
        batches,
        model=settings.longcat_chat_model,
        source_url=args.source_url,
    )
    write_manifest(
        output=args.output,
        words=words,
        batches=batches,
        model=settings.longcat_chat_model,
        source_url=args.source_url,
        status=status,
        error=error,
    )
    completed = len(load_completed_sections(args.output, batches))
    print(
        f"status={status} completed_words={completed}/{len(words)} "
        f"rendered_documents={rendered}",
        flush=True,
    )
    return 0 if status in {"complete", "partial", "quota_exhausted"} else 1


def main() -> None:
    args = parse_args()
    try:
        raise SystemExit(asyncio.run(run(args)))
    except KeyboardInterrupt:
        print("interrupted; completed batch checkpoints are preserved", file=sys.stderr)
        raise SystemExit(130) from None


if __name__ == "__main__":
    main()
