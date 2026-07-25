"""Provider-neutral lexical and syntax analysis with cache and abstention."""

from __future__ import annotations

import hashlib
import json
from enum import StrEnum
from typing import Annotated, Protocol

from pydantic import BaseModel, ConfigDict, Field, model_validator


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class AnalysisStatus(StrEnum):
    RESOLVED = "resolved"
    ABSTAINED = "abstained"
    REVIEW_REQUIRED = "review_required"


class LexicalAnalysisRequest(_StrictModel):
    lemma: str = Field(min_length=1, max_length=120)
    selected_text: str = Field(min_length=1, max_length=240)
    paragraph_context: str = Field(min_length=1, max_length=5000)
    locale: str = Field(default="zh-CN", min_length=2, max_length=20)


class LexicalSenseCandidate(_StrictModel):
    sense_id: str = Field(min_length=1, max_length=160)
    part_of_speech: str = Field(min_length=1, max_length=48)
    gloss: str = Field(min_length=1, max_length=800)
    collocations: tuple[str, ...] = ()
    confidence: Annotated[float, Field(ge=0, le=1)]


class LexicalProvider(Protocol):
    provider_id: str
    provider_version: str

    def lookup(self, request: LexicalAnalysisRequest) -> tuple[LexicalSenseCandidate, ...]: ...


class LexicalAnalysisResult(_StrictModel):
    status: AnalysisStatus
    provider_id: str
    provider_version: str
    cache_key: str = Field(pattern=r"^[0-9a-f]{64}$")
    selected_sense: LexicalSenseCandidate | None = None
    alternatives: tuple[LexicalSenseCandidate, ...] = ()
    reason_code: str

    @model_validator(mode="after")
    def resolved_requires_selected_sense(self) -> LexicalAnalysisResult:
        if self.status is AnalysisStatus.RESOLVED and self.selected_sense is None:
            raise ValueError("resolved_lexical_analysis_requires_sense")
        if self.status is not AnalysisStatus.RESOLVED and self.selected_sense is not None:
            raise ValueError("unresolved_lexical_analysis_cannot_select_sense")
        return self


class TextOffset(_StrictModel):
    start: Annotated[int, Field(ge=0)]
    end: Annotated[int, Field(gt=0)]
    text_quote: str = Field(min_length=1)
    label: str = Field(min_length=1, max_length=120)

    @model_validator(mode="after")
    def ordered(self) -> TextOffset:
        if self.end <= self.start:
            raise ValueError("language_span_end_must_follow_start")
        return self


class TranslationAlignment(_StrictModel):
    source: TextOffset
    translated_text: str = Field(min_length=1, max_length=1000)


class SyntaxProviderOutput(_StrictModel):
    structures: tuple[TextOffset, ...] = Field(min_length=1)
    translation: str | None = Field(default=None, max_length=2000)
    translation_alignment: tuple[TranslationAlignment, ...] = ()
    alternatives: tuple[str, ...] = ()
    confidence: Annotated[float, Field(ge=0, le=1)]


class SyntaxAnalysisRequest(_StrictModel):
    selected_text: str = Field(min_length=1, max_length=5000)
    paragraph_context: str = Field(min_length=1, max_length=10000)
    selection_start: Annotated[int, Field(ge=0)]
    selection_end: Annotated[int, Field(gt=0)]
    locale: str = Field(default="zh-CN", min_length=2, max_length=20)

    @model_validator(mode="after")
    def selection_matches_context(self) -> SyntaxAnalysisRequest:
        if self.selection_end <= self.selection_start:
            raise ValueError("syntax_selection_end_must_follow_start")
        if self.selection_end > len(self.paragraph_context):
            raise ValueError("syntax_selection_out_of_context")
        if self.paragraph_context[self.selection_start : self.selection_end] != self.selected_text:
            raise ValueError("syntax_selection_quote_mismatch")
        return self


class SyntaxProvider(Protocol):
    provider_id: str
    provider_version: str

    def parse(self, request: SyntaxAnalysisRequest) -> SyntaxProviderOutput: ...


class SyntaxAnalysisResult(_StrictModel):
    status: AnalysisStatus
    provider_id: str
    provider_version: str
    cache_key: str = Field(pattern=r"^[0-9a-f]{64}$")
    structures: tuple[TextOffset, ...] = ()
    translation: str | None = None
    translation_alignment: tuple[TranslationAlignment, ...] = ()
    alternatives: tuple[str, ...] = ()
    confidence: Annotated[float, Field(ge=0, le=1)] | None = None
    reason_code: str


class LanguageAnalysisCache(Protocol):
    def get(self, key: str) -> dict[str, object] | None: ...

    def put(self, key: str, value: dict[str, object]) -> None: ...


class InMemoryLanguageAnalysisCache:
    def __init__(self) -> None:
        self._values: dict[str, dict[str, object]] = {}

    def get(self, key: str) -> dict[str, object] | None:
        value = self._values.get(key)
        return None if value is None else dict(value)

    def put(self, key: str, value: dict[str, object]) -> None:
        self._values.setdefault(key, dict(value))


def language_analysis_cache_key(
    analysis_kind: str,
    request: BaseModel,
    *,
    provider_id: str,
    provider_version: str,
) -> str:
    payload = {
        "analysis_kind": analysis_kind,
        "provider_id": provider_id,
        "provider_version": provider_version,
        "request": request.model_dump(mode="json"),
    }
    serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode()).hexdigest()


def analyze_lexical(
    request: LexicalAnalysisRequest,
    provider: LexicalProvider,
    cache: LanguageAnalysisCache,
    *,
    confidence_threshold: float = 0.8,
    ambiguity_margin: float = 0.08,
) -> LexicalAnalysisResult:
    key = language_analysis_cache_key(
        "lexical",
        request,
        provider_id=provider.provider_id,
        provider_version=provider.provider_version,
    )
    cached = cache.get(key)
    if cached is not None:
        return LexicalAnalysisResult.model_validate(cached)

    candidates = tuple(
        sorted(provider.lookup(request), key=lambda item: item.confidence, reverse=True)
    )
    if not candidates:
        result = LexicalAnalysisResult(
            status=AnalysisStatus.ABSTAINED,
            provider_id=provider.provider_id,
            provider_version=provider.provider_version,
            cache_key=key,
            reason_code="lexical_provider_no_candidate",
        )
    elif candidates[0].confidence < confidence_threshold:
        result = LexicalAnalysisResult(
            status=AnalysisStatus.REVIEW_REQUIRED,
            provider_id=provider.provider_id,
            provider_version=provider.provider_version,
            cache_key=key,
            alternatives=candidates,
            reason_code="lexical_confidence_below_threshold",
        )
    elif (
        len(candidates) > 1
        and candidates[0].confidence - candidates[1].confidence < ambiguity_margin
    ):
        result = LexicalAnalysisResult(
            status=AnalysisStatus.REVIEW_REQUIRED,
            provider_id=provider.provider_id,
            provider_version=provider.provider_version,
            cache_key=key,
            alternatives=candidates,
            reason_code="lexical_sense_ambiguous",
        )
    else:
        result = LexicalAnalysisResult(
            status=AnalysisStatus.RESOLVED,
            provider_id=provider.provider_id,
            provider_version=provider.provider_version,
            cache_key=key,
            selected_sense=candidates[0],
            alternatives=candidates[1:],
            reason_code="lexical_sense_resolved",
        )
    cache.put(key, result.model_dump(mode="json"))
    return result


def analyze_syntax(
    request: SyntaxAnalysisRequest,
    provider: SyntaxProvider,
    cache: LanguageAnalysisCache,
    *,
    confidence_threshold: float = 0.8,
) -> SyntaxAnalysisResult:
    key = language_analysis_cache_key(
        "syntax",
        request,
        provider_id=provider.provider_id,
        provider_version=provider.provider_version,
    )
    cached = cache.get(key)
    if cached is not None:
        return SyntaxAnalysisResult.model_validate(cached)

    output = provider.parse(request)
    offsets_valid = all(
        _offset_matches(offset, request.selected_text) for offset in output.structures
    )
    alignment_valid = all(
        _offset_matches(alignment.source, request.selected_text)
        for alignment in output.translation_alignment
    )
    if not offsets_valid:
        result = SyntaxAnalysisResult(
            status=AnalysisStatus.ABSTAINED,
            provider_id=provider.provider_id,
            provider_version=provider.provider_version,
            cache_key=key,
            confidence=output.confidence,
            reason_code="syntax_span_invalid",
        )
    elif not alignment_valid or (
        output.translation is not None and not output.translation_alignment
    ):
        result = SyntaxAnalysisResult(
            status=AnalysisStatus.REVIEW_REQUIRED,
            provider_id=provider.provider_id,
            provider_version=provider.provider_version,
            cache_key=key,
            structures=output.structures,
            alternatives=output.alternatives,
            confidence=output.confidence,
            reason_code="translation_alignment_unverified",
        )
    elif output.confidence < confidence_threshold:
        result = SyntaxAnalysisResult(
            status=AnalysisStatus.REVIEW_REQUIRED,
            provider_id=provider.provider_id,
            provider_version=provider.provider_version,
            cache_key=key,
            structures=output.structures,
            translation=output.translation,
            translation_alignment=output.translation_alignment,
            alternatives=output.alternatives,
            confidence=output.confidence,
            reason_code="syntax_confidence_below_threshold",
        )
    else:
        result = SyntaxAnalysisResult(
            status=AnalysisStatus.RESOLVED,
            provider_id=provider.provider_id,
            provider_version=provider.provider_version,
            cache_key=key,
            structures=output.structures,
            translation=output.translation,
            translation_alignment=output.translation_alignment,
            alternatives=output.alternatives,
            confidence=output.confidence,
            reason_code="syntax_resolved",
        )
    cache.put(key, result.model_dump(mode="json"))
    return result


def _offset_matches(offset: TextOffset, selected_text: str) -> bool:
    return (
        offset.end <= len(selected_text)
        and selected_text[offset.start : offset.end] == offset.text_quote
    )
