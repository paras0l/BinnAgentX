"""Conservative write-time denoising for learning-asset note bodies."""

# ruff: noqa: RUF001

from __future__ import annotations

import re
import unicodedata
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

_SPACE_RUN = re.compile(r"[^\S\n]+")
_MARKDOWN_PREFIX = re.compile(r"^(?:>\s*|[-*+]\s+|\d+[.)]\s+)+")
_IGNORABLE_TRANSPORT_CHARACTERS = frozenset({"\u200b", "\ufeff"})

# These blocks are emitted by the reading UI as interaction guidance. They
# describe what the learner should do next, not the reusable knowledge being
# captured. Keep the list exact so user-authored content is not summarized or
# rewritten by a heuristic.
_READING_UI_BOILERPLATE = frozenset(
    {
        "回到自己的判断，按这个帮助层级形成一个新的亲自输出版本。",
        "训练中主动记录的思考笔记。",
    }
)


class AssetCaptureRole(StrEnum):
    SOURCE_QUOTE = "source_quote"
    LEARNER_INTERPRETATION = "learner_interpretation"
    AGENT_HINT = "agent_hint"
    DIAGNOSIS = "diagnosis"
    REUSABLE_RULE = "reusable_rule"
    EXAMPLE = "example"
    NEXT_CHECK = "next_check"


class AssetCaptureSegment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    segment_id: str = Field(min_length=1, max_length=128)
    role: AssetCaptureRole
    content: str = Field(min_length=1, max_length=4_000)
    origin: Literal["source", "learner", "agent"]
    hint_level: Annotated[int, Field(ge=1, le=4)] | None = None

    @model_validator(mode="after")
    def hint_level_belongs_to_agent_hint(self) -> AssetCaptureSegment:
        if self.hint_level is not None and self.role is not AssetCaptureRole.AGENT_HINT:
            raise ValueError("asset_capture_hint_level_requires_agent_hint")
        if self.role is AssetCaptureRole.AGENT_HINT and self.origin != "agent":
            raise ValueError("asset_capture_agent_hint_origin_invalid")
        return self


class LearningAssetCapture(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["learning-asset-capture/v1"]
    segments: list[AssetCaptureSegment] = Field(min_length=1, max_length=24)

    @model_validator(mode="after")
    def segment_ids_are_unique(self) -> LearningAssetCapture:
        ids = [segment.segment_id for segment in self.segments]
        if len(ids) != len(set(ids)):
            raise ValueError("asset_capture_segment_ids_must_be_unique")
        if sum(len(segment.content) for segment in self.segments) > 12_000:
            raise ValueError("asset_capture_content_too_long")
        return self


class AssetWriteDecision(StrEnum):
    KEEP = "KEEP"
    SPLIT = "SPLIT"
    NOOP = "NOOP"
    REVIEW = "REVIEW"


class AssetCaptureProjection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: AssetWriteDecision
    retained_segment_ids: list[str]
    reason_codes: list[str]
    content: str | None
    highest_hint_level: Annotated[int, Field(ge=1, le=4)] | None = None


def denoise_asset_content(value: str | None) -> str | None:
    """Remove transport noise and exact repetition without rewriting meaning.

    Quotes, labels, ordering, and the learner's original wording are preserved.
    The function deliberately avoids fuzzy semantic merging: consolidation
    requires evidence and provenance that are unavailable at this ingress edge.
    """

    if value is None:
        return None
    normalized = _normalize_transport_text(value)
    if not normalized:
        return None

    kept_blocks: list[str] = []
    seen_blocks: set[str] = set()
    for raw_block in re.split(r"\n\s*\n", normalized):
        block = _normalize_block(raw_block)
        if not block:
            continue
        fingerprint = _fingerprint(block)
        if fingerprint in _READING_UI_BOILERPLATE or fingerprint in seen_blocks:
            continue
        seen_blocks.add(fingerprint)
        kept_blocks.append(block)

    return "\n\n".join(kept_blocks) or None


def project_asset_capture(capture: LearningAssetCapture) -> AssetCaptureProjection:
    """Produce a provenance-preserving projection and conservative write decision."""

    retained: list[AssetCaptureSegment] = []
    seen: set[str] = set()
    reason_codes: list[str] = []
    for segment in capture.segments:
        content = denoise_asset_content(segment.content)
        if content is None:
            reason_codes.append("empty_or_ui_boilerplate_removed")
            continue
        fingerprint = _fingerprint(content)
        if fingerprint in seen:
            reason_codes.append("exact_duplicate_segment_removed")
            continue
        seen.add(fingerprint)
        retained.append(segment.model_copy(update={"content": content}))

    if not retained:
        return AssetCaptureProjection(
            decision=AssetWriteDecision.NOOP,
            retained_segment_ids=[],
            reason_codes=list(dict.fromkeys([*reason_codes, "no_reusable_content"])),
            content=None,
        )

    knowledge_segments = [
        segment
        for segment in retained
        if segment.role
        in {
            AssetCaptureRole.LEARNER_INTERPRETATION,
            AssetCaptureRole.DIAGNOSIS,
            AssetCaptureRole.REUSABLE_RULE,
            AssetCaptureRole.EXAMPLE,
        }
    ]
    reusable_rules = [
        segment for segment in retained if segment.role is AssetCaptureRole.REUSABLE_RULE
    ]
    only_supported = all(
        segment.role in {AssetCaptureRole.AGENT_HINT, AssetCaptureRole.NEXT_CHECK}
        for segment in retained
    )
    if only_supported:
        decision = AssetWriteDecision.REVIEW
        reason_codes.append("agent_support_without_independent_learner_claim")
    elif len(reusable_rules) > 1:
        decision = AssetWriteDecision.SPLIT
        reason_codes.append("multiple_reusable_rules_detected")
    elif not knowledge_segments:
        decision = AssetWriteDecision.REVIEW
        reason_codes.append("source_evidence_without_reusable_claim")
    else:
        decision = AssetWriteDecision.KEEP
        reason_codes.append("provenance_preserving_projection")

    highest_hint_level = max(
        (segment.hint_level for segment in retained if segment.hint_level is not None),
        default=None,
    )
    return AssetCaptureProjection(
        decision=decision,
        retained_segment_ids=[segment.segment_id for segment in retained],
        reason_codes=list(dict.fromkeys(reason_codes)),
        content=_render_segments(retained),
        highest_hint_level=highest_hint_level,
    )


def render_raw_asset_capture(capture: LearningAssetCapture) -> str:
    """Render the untouched capture for an owner-visible before/after comparison."""

    return _render_segments(capture.segments)


def _normalize_transport_text(value: str) -> str:
    value = unicodedata.normalize("NFC", value).replace("\r\n", "\n").replace("\r", "\n")
    characters: list[str] = []
    for character in value:
        if character in {"\n", "\t"}:
            characters.append(character)
            continue
        if character == "\N{NO-BREAK SPACE}":
            characters.append(" ")
            continue
        category = unicodedata.category(character)
        if category != "Cc" and character not in _IGNORABLE_TRANSPORT_CHARACTERS:
            characters.append(character)
    return "".join(characters).strip()


def _normalize_block(value: str) -> str:
    lines: list[str] = []
    previous_fingerprint: str | None = None
    for raw_line in value.splitlines():
        line = _SPACE_RUN.sub(" ", raw_line).strip()
        if not line:
            continue
        fingerprint = _fingerprint(line)
        if fingerprint == previous_fingerprint:
            continue
        lines.append(line)
        previous_fingerprint = fingerprint
    return "\n".join(lines)


def _fingerprint(value: str) -> str:
    lines = []
    for line in value.splitlines():
        semantic_line = _MARKDOWN_PREFIX.sub("", line.strip())
        lines.append(_SPACE_RUN.sub(" ", semantic_line))
    return "\n".join(lines).strip().casefold()


def _render_segments(segments: list[AssetCaptureSegment]) -> str:
    labels = {
        AssetCaptureRole.SOURCE_QUOTE: "原文证据",
        AssetCaptureRole.LEARNER_INTERPRETATION: "我的解释",
        AssetCaptureRole.AGENT_HINT: "学习提示",
        AssetCaptureRole.DIAGNOSIS: "卡点诊断",
        AssetCaptureRole.REUSABLE_RULE: "可迁移规则",
        AssetCaptureRole.EXAMPLE: "例句",
        AssetCaptureRole.NEXT_CHECK: "下次自查",
    }
    blocks: list[str] = []
    for segment in segments:
        content = segment.content
        if segment.role is AssetCaptureRole.SOURCE_QUOTE:
            content = "\n".join(f"> {line}" for line in content.splitlines())
        hint_suffix = f" · H{segment.hint_level}" if segment.hint_level is not None else ""
        blocks.append(f"## {labels[segment.role]}{hint_suffix}\n\n{content}")
    return "\n\n".join(blocks)
