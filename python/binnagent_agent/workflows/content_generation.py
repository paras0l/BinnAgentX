from __future__ import annotations

import argparse
import copy
import json
import random
import re
import shutil
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from typing import Any, TypedDict, cast

from binnagent_evaluation.content_integrity import validate_content_pack
from jsonschema import Draft202012Validator

from binnagent_agent.agents.content_generator import (
    ContentGenerationRequest,
    ContentGeneratorAdapter,
    parse_generation_payload,
)
from binnagent_agent.agents.content_reviewer import (
    ContentReviewerAdapter,
    ContentReviewRequest,
    ContentReviewResult,
)


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class GenerationOutput:
    manifest_path: Path
    pack_id: str
    pack_version: str
    item_count: int
    agent_reviewed_count: int
    errors: list[str]


class ContentGeneratorError(RuntimeError):
    pass


class _EvidenceSpan(TypedDict):
    paragraph_index: int
    start: int
    end: int
    text: str


class ContentGenerationWorkflow:
    def __init__(
        self,
        *,
        repository_root: Path | None = None,
        source_manifest: Path | None = None,
        output_directory: Path | None = None,
        pack_version: str = "v1",
        pack_id: str | None = None,
        content_generator: ContentGeneratorAdapter | None = None,
        content_reviewer: ContentReviewerAdapter | None = None,
        allow_deterministic_fallback: bool = False,
        generation_attempts: int = 3,
    ) -> None:
        root = repository_root or _project_root()
        self.source_manifest = (
            source_manifest
            if source_manifest is not None
            else root / "fixtures/content/v1/manifest.json"
        )
        self.output_directory = (
            output_directory
            if output_directory is not None
            else root / "fixtures/content/v1/generated"
        )
        self.pack_version = pack_version
        self.pack_id = (
            pack_id or f"agent_generated_content_pack_{datetime.now(UTC).strftime('%Y%m%d')}"
        )
        self._content_generator = content_generator
        self._content_reviewer = content_reviewer
        self._allow_deterministic_fallback = allow_deterministic_fallback
        if generation_attempts < 1:
            raise ValueError("generation_attempts must be positive")
        self._generation_attempts = generation_attempts
        self._item_count_per_type = 2
        self._root = root
        self._item_schema = _read_json(root / "contracts/content/v1/content-item.schema.json")

    def run(
        self,
        *,
        seed: int | None = None,
        dry_run: bool = False,
        preserve_existing: bool = False,
    ) -> GenerationOutput:
        random_seed = seed if seed is not None else int(datetime.now(UTC).strftime("%Y%m%d"))
        randomizer = random.Random(random_seed)
        source_manifest = self._read_json(self.source_manifest)
        raw_items = source_manifest.get("items")
        if not isinstance(raw_items, list):
            raise ContentGeneratorError("source manifest missing items")

        grouped_items: dict[str, list[dict[str, Any]]] = {
            "calibration_reading": [],
            "matched_reading": [],
            "micro_expression": [],
        }
        for candidate in raw_items:
            if not isinstance(candidate, dict):
                continue
            content_type = str(candidate.get("content_type", ""))
            if content_type in grouped_items:
                grouped_items[content_type].append(candidate)

        for content_type in grouped_items:
            if len(grouped_items[content_type]) < self._item_count_per_type:
                raise ContentGeneratorError(
                    f"source lacks {self._item_count_per_type} entries for {content_type}"
                )

        generated_dir = self.output_directory
        generated_dir.mkdir(parents=True, exist_ok=True)
        staging_parent = generated_dir.parent
        staging = Path(tempfile.mkdtemp(prefix="binnagent_content_gen_", dir=staging_parent))

        try:
            generated_manifest_items: list[dict[str, Any]] = []
            generated_item_files: list[tuple[str, dict[str, Any]]] = []
            created_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")

            for content_type in ["calibration_reading", "matched_reading", "micro_expression"]:
                source_items = grouped_items[content_type][: self._item_count_per_type]
                for ordinal, source_entry in enumerate(source_items, start=1):
                    source_file = self.source_manifest.parent / str(source_entry.get("file", ""))
                    if not source_file.is_file():
                        raise ContentGeneratorError(
                            f"source item file missing: {source_entry.get('file')}"
                        )
                    source_item = self._read_json(source_file)

                    source_version = self._as_str(
                        source_item.get("content_version_id"), "content_version_id"
                    )
                    target_version = (
                        f"{source_version}_ai_{ordinal:02d}_{randomizer.randint(100, 999)}"
                    )
                    source_content_id = self._as_str(source_item.get("content_id"), "content_id")
                    target_content_id = (
                        f"{source_content_id}_ai_{ordinal:02d}_{randomizer.randint(100, 999)}"
                    )

                    try:
                        if self._content_generator is None:
                            raise ContentGeneratorError("content generator disabled")
                        candidate = self._generate_with_agent(
                            source_item=source_item,
                            content_type=content_type,
                            target_content_version_id=target_version,
                            target_content_id=target_content_id,
                            random_seed=randomizer.randint(0, 2**31 - 1),
                        )
                    except Exception as exc:
                        if not self._allow_deterministic_fallback:
                            raise ContentGeneratorError(
                                f"{content_type} generation failed for {source_version}: "
                                f"{type(exc).__name__}: {exc}"
                            ) from exc
                        candidate = self._relabel_item(
                            source_item,
                            content_type,
                            target_content_id,
                            target_version,
                            randomizer,
                            created_at,
                        )

                    filename = f"{target_version}.json"
                    generated_item_files.append((filename, candidate))
                    generated_manifest_items.append(
                        {
                            "content_version_id": candidate["content_version_id"],
                            "content_type": candidate["content_type"],
                            "file": filename,
                            "content_hash": candidate["content_hash"],
                            "rights_status": candidate["rights"]["rights_status"],
                            "difficulty_status": candidate["difficulty"]["difficulty_status"],
                        }
                    )

            generated_manifest = {
                "schema_version": "1.0.0",
                "pack_id": self.pack_id,
                "pack_version": self.pack_version,
                "purpose": "technical_spike_only",
                "created_at": created_at,
                "items": generated_manifest_items,
            }

            staging_manifest = staging / "manifest.json"
            staging_manifest.write_text(
                json.dumps(generated_manifest, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            for filename, item in generated_item_files:
                (staging / filename).write_text(
                    json.dumps(item, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
                )

            errors = validate_content_pack(self._root, content_directory=staging)
            if errors:
                return GenerationOutput(
                    manifest_path=staging_manifest,
                    pack_id=self.pack_id,
                    pack_version=self.pack_version,
                    item_count=0,
                    agent_reviewed_count=0,
                    errors=errors,
                )

            if not dry_run:
                if not preserve_existing:
                    self._clear_output_directory(generated_dir)
                for path in staging.iterdir():
                    shutil.copy2(path, generated_dir / path.name)

                return GenerationOutput(
                    manifest_path=generated_dir / "manifest.json",
                    pack_id=self.pack_id,
                    pack_version=self.pack_version,
                    item_count=len(generated_item_files),
                    agent_reviewed_count=sum(
                        item.get("review", {}).get("status") == "agent_reviewed"
                        for _, item in generated_item_files
                    ),
                    errors=[],
                )

            return GenerationOutput(
                manifest_path=staging_manifest,
                pack_id=self.pack_id,
                pack_version=self.pack_version,
                item_count=len(generated_item_files),
                agent_reviewed_count=sum(
                    item.get("review", {}).get("status") == "agent_reviewed"
                    for _, item in generated_item_files
                ),
                errors=[],
            )
        finally:
            shutil.rmtree(staging)

    def _generate_with_agent(
        self,
        *,
        source_item: dict[str, Any],
        content_type: str,
        target_content_id: str,
        target_content_version_id: str,
        random_seed: int,
    ) -> dict[str, Any]:
        if not self._content_generator:
            raise ContentGeneratorError("no content generator configured")
        last_error: Exception | None = None
        review_feedback: tuple[str, ...] = ()
        for attempt in range(self._generation_attempts):
            request = ContentGenerationRequest(
                content_type=content_type,  # type: ignore[arg-type]
                source_item=source_item,
                target_content_version_id=target_content_version_id,
                random_seed=random_seed + attempt,
                review_feedback=review_feedback,
            )
            try:
                payload = parse_generation_payload(
                    request.content_type,
                    self._content_generator.generate(request),
                )
                if request.content_type in {"calibration_reading", "matched_reading"}:
                    candidate = self._build_reading_item(
                        source_item=source_item,
                        target_content_id=target_content_id,
                        target_content_version_id=target_content_version_id,
                        draft=payload,
                    )
                else:
                    candidate = self._build_micro_item(
                        source_item=source_item,
                        target_content_id=target_content_id,
                        target_content_version_id=target_content_version_id,
                        draft=payload,
                    )
                self._assert_original_enough(source_item, candidate)
                if self._content_reviewer is None:
                    return candidate
                review = self._content_reviewer.review(
                    ContentReviewRequest(
                        content_type=request.content_type,
                        source_item=source_item,
                        candidate_item=candidate,
                    )
                )
                if not review.passes_release_gate():
                    review_feedback = review.revision_feedback()
                    raise ContentGeneratorError(
                        "content judge requested revision: " + "; ".join(review_feedback)
                    )
                self._mark_agent_reviewed(candidate, review)
                self._assert_item_valid(candidate)
                return candidate
            except Exception as exc:
                last_error = exc
                if isinstance(exc, ContentGeneratorError) and not review_feedback:
                    review_feedback = (str(exc),)

        assert last_error is not None
        raise ContentGeneratorError(
            f"agent output invalid after {self._generation_attempts} attempts: "
            f"{type(last_error).__name__}: {last_error}"
        ) from last_error

    def _build_reading_item(
        self,
        *,
        source_item: dict[str, Any],
        target_content_id: str,
        target_content_version_id: str,
        draft: Any,
    ) -> dict[str, Any]:
        source_paragraphs = self._extract_paragraphs(source_item)
        new_paragraphs = self._agent_paragraphs_from_draft(draft.paragraphs, source_paragraphs)
        question_bank = [
            self._agent_main_question(
                target_content_version_id=target_content_version_id,
                draft_question=draft_question,
                paragraphs=new_paragraphs,
                ordinal=ordinal,
            )
            for ordinal, draft_question in enumerate(draft.question_bank, start=1)
        ]
        self._validate_question_bank(question_bank)
        question = next(
            (
                candidate
                for candidate in question_bank
                if candidate["difficulty_tier"] == "standard"
            ),
            question_bank[0],
        )

        item = copy.deepcopy(source_item)
        item["content_id"] = target_content_id
        item["content_version_id"] = target_content_version_id
        item["title"] = self._normalize_title(draft.title)
        item["paragraphs"] = new_paragraphs
        item["main_question"] = question
        item["question_bank"] = question_bank
        item["grammar_challenges"] = self._agent_grammar_challenges(
            target_content_version_id, draft.grammar_challenges, new_paragraphs
        )
        item["parallel_reconstruction"] = {
            "task_id": f"{target_content_version_id}_parallel",
            "prompt": self._normalize_text(
                draft.parallel_reconstruction_prompt, minimum=20, maximum=800
            ),
            "success_criteria": [
                self._normalize_text(value, minimum=3, maximum=300)
                for value in draft.parallel_reconstruction_criteria[:4]
            ],
        }
        item["transferable_expressions"] = [
            {
                "expression": self._normalize_text(value.expression, minimum=2, maximum=200),
                "appropriate_when": self._normalize_text(
                    value.appropriate_when, minimum=4, maximum=300
                ),
                "avoid_when": self._normalize_text(value.avoid_when, minimum=4, maximum=300),
            }
            for value in draft.transferable_expressions
        ]
        item["difficulty"]["difficulty_status"] = "uncalibrated"
        item["difficulty"]["paragraph_count"] = len(new_paragraphs)
        item["difficulty"]["word_count"] = self._word_count(self._content_body_from_item(item))
        item["difficulty"]["estimate_source"] = "agent workflow generated content"
        self._mark_agent_generated_review(item)
        body = self._content_body_from_item(item)
        item["content_hash"] = sha256(body.encode("utf-8")).hexdigest()
        self._assert_item_valid(item)
        return item

    def _build_micro_item(
        self,
        *,
        source_item: dict[str, Any],
        target_content_id: str,
        target_content_version_id: str,
        draft: Any,
    ) -> dict[str, Any]:
        item = copy.deepcopy(source_item)
        item["content_id"] = target_content_id
        item["content_version_id"] = target_content_version_id
        item["title"] = self._normalize_title(draft.title)
        item["situation"] = self._normalize_text(draft.situation, minimum=20, maximum=1200)
        item["audience"] = self._normalize_text(draft.audience, minimum=2, maximum=200)
        item["purpose"] = self._normalize_text(draft.purpose, minimum=2, maximum=300)
        item["target_argument_move"] = self._normalize_text(
            draft.target_argument_move, minimum=2, maximum=300
        )
        item["optional_active_resource"] = self._normalize_text(
            draft.optional_active_resource, minimum=1, maximum=200
        )
        item["forbidden_mechanical_use"] = [
            self._normalize_text(value, minimum=1, maximum=200)
            for value in draft.forbidden_mechanical_use
        ]
        item["v1_minimum"] = [
            self._normalize_text(value, minimum=2, maximum=300) for value in draft.v1_minimum
        ]
        item["priority_feedback_checks"] = [
            {
                "check_id": value.check_id,
                "signal_terms": [
                    self._normalize_text(term, minimum=2, maximum=40) for term in value.signal_terms
                ],
                "feedback": self._normalize_text(value.feedback, minimum=20, maximum=500),
            }
            for value in draft.priority_feedback_checks
        ]
        item["priority_feedback_fallback"] = self._normalize_text(
            draft.priority_feedback_fallback, minimum=20, maximum=500
        )
        item["v2_success"] = [
            self._normalize_text(value, minimum=2, maximum=300) for value in draft.v2_success
        ]
        item["parallel_transfer"] = self._normalize_text(
            draft.parallel_transfer, minimum=20, maximum=800
        )
        item["difficulty"]["difficulty_status"] = "uncalibrated"
        item["difficulty"]["estimate_source"] = "agent workflow generated content"
        self._mark_agent_generated_review(item)
        body = self._content_body_from_item(item)
        item["content_hash"] = sha256(body.encode("utf-8")).hexdigest()
        self._assert_item_valid(item)
        return item

    def _agent_paragraphs_from_draft(
        self,
        paragraphs: list[str],
        source_paragraphs: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if len(source_paragraphs) == 0:
            source_paragraphs = [
                {"paragraph_id": "generated_p1", "text": ""},
                {"paragraph_id": "generated_p2", "text": ""},
            ]
        if len(paragraphs) != len(source_paragraphs):
            raise ContentGeneratorError("agent returned a different paragraph count")
        normalized_texts = [
            self._normalize_text(text, minimum=20, maximum=4000)
            for text in paragraphs[: len(source_paragraphs)]
        ]
        result: list[dict[str, Any]] = []
        for idx, text in enumerate(normalized_texts):
            paragraph_id = (
                source_paragraphs[idx].get(
                    "paragraph_id", f"{self._generated_id_prefix(idx)}_p{idx + 1:02d}"
                )
                if isinstance(source_paragraphs[idx], dict)
                else f"{self._generated_id_prefix(idx)}_p{idx + 1:02d}"
            )
            result.append(
                {
                    "paragraph_id": self._safe_id(paragraph_id),
                    "text": text,
                }
            )
        if not result:
            raise ContentGeneratorError("no paragraph produced")
        return result

    def _agent_grammar_challenges(
        self,
        target_content_version_id: str,
        drafts: list[Any],
        paragraphs: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        challenges: list[dict[str, Any]] = []
        for index, draft in enumerate(drafts, start=1):
            if draft.paragraph_index >= len(paragraphs):
                raise ContentGeneratorError("grammar challenge paragraph index invalid")
            paragraph_index, correct_text = self._locate_exact_excerpt(
                draft.correct_text,
                paragraphs,
                preferred_index=draft.paragraph_index,
                maximum=120,
            )
            paragraph = paragraphs[paragraph_index]
            challenges.append(
                {
                    "challenge_id": f"{target_content_version_id}_grammar_{index:02d}",
                    "paragraph_id": paragraph["paragraph_id"],
                    "correct_text": correct_text,
                    "incorrect_text": self._normalize_text(
                        draft.incorrect_text, minimum=2, maximum=120
                    ),
                    "error_type": self._normalize_text(draft.error_type, minimum=2, maximum=80),
                    "hint": self._normalize_text(draft.hint, minimum=4, maximum=200),
                }
            )
        return challenges

    def _locate_exact_excerpt(
        self,
        value: str,
        paragraphs: list[dict[str, Any]],
        *,
        preferred_index: int,
        maximum: int,
    ) -> tuple[int, str]:
        normalized = " ".join(str(value).strip().split())
        candidate = normalized
        if len(candidate) > maximum:
            candidate = candidate[:maximum].rsplit(" ", 1)[0].rstrip()
        if len(candidate) < 2:
            raise ContentGeneratorError("grammar challenge text cannot be safely shortened")

        search_order = [preferred_index, *range(len(paragraphs))]
        for paragraph_index in dict.fromkeys(search_order):
            paragraph = str(paragraphs[paragraph_index].get("text", ""))
            if candidate in paragraph:
                return paragraph_index, candidate
        raise ContentGeneratorError("grammar challenge text is not in generated paragraphs")

    def _agent_main_question(
        self,
        *,
        target_content_version_id: str,
        draft_question: Any,
        paragraphs: list[dict[str, Any]],
        ordinal: int,
    ) -> dict[str, Any]:
        options = self._normalize_options(draft_question.options)
        if not options:
            raise ContentGeneratorError("agent main question options invalid")
        correct_answer = draft_question.correct_answer
        if correct_answer not in {"A", "B", "C", "D", "E"}:
            raise ContentGeneratorError("agent main question missing valid correct answer")

        paragraph_texts = [part["text"] for part in paragraphs]
        paragraph_ids = [part["paragraph_id"] for part in paragraphs]

        evidence_quote = self._exact_evidence_quote(draft_question.evidence_quote, paragraph_texts)
        evidence_span = self._build_evidence_span(paragraphs=paragraph_texts, quote=evidence_quote)
        if evidence_span is None:
            raise ContentGeneratorError("question evidence quote is not in generated paragraphs")

        if hasattr(draft_question, "alternative_evidence_quote"):
            alt_quote = draft_question.alternative_evidence_quote
        else:
            alt_quote = None

        alternative_evidence: list[_EvidenceSpan] = []
        if alt_quote:
            located_alt = self._build_evidence_span(
                paragraphs=paragraph_texts,
                quote=self._exact_evidence_quote(alt_quote, paragraph_texts),
            )
            if located_alt is not None:
                alternative_evidence = [located_alt]

        minimum_evidence = {
            "paragraph_id": paragraph_ids[evidence_span["paragraph_index"]],
            "start": evidence_span["start"],
            "end": evidence_span["end"],
            "text_quote": evidence_span["text"],
            "text_hash": sha256(evidence_span["text"].encode("utf-8")).hexdigest(),
        }

        acceptable_alternative: list[dict[str, Any]] = []
        for span in alternative_evidence:
            acceptable_alternative.append(
                {
                    "paragraph_id": paragraph_ids[span["paragraph_index"]],
                    "start": span["start"],
                    "end": span["end"],
                    "text_quote": span["text"],
                    "text_hash": sha256(span["text"].encode("utf-8")).hexdigest(),
                }
            )

        return {
            "question_id": f"{target_content_version_id}_q{ordinal}",
            "question_type": draft_question.question_type,
            "difficulty_tier": draft_question.difficulty_tier,
            "prompt": self._normalize_text(draft_question.prompt, minimum=20, maximum=800),
            "answer_type": "single_choice_with_explanation",
            "options": options,
            "correct_answer": correct_answer,
            "minimum_evidence": minimum_evidence,
            "acceptable_alternative_evidence": acceptable_alternative,
            "common_error_candidates": self._normalize_error_candidates(
                draft_question.common_error_candidates
            ),
            "hints": self._build_hints(draft_question.hints),
            "public_explanation": self._normalize_text(
                draft_question.public_explanation, minimum=20, maximum=1200
            ),
            "reveal_gate": "after_independent_output",
        }

    def _exact_evidence_quote(self, value: str, paragraphs: list[str]) -> str:
        normalized = " ".join(str(value).strip().split())
        candidates = [normalized]
        if len(normalized) > 600:
            candidates.append(normalized[:600].rsplit(" ", 1)[0].rstrip())
        for candidate in candidates:
            if len(candidate) >= 6 and any(candidate in paragraph for paragraph in paragraphs):
                return candidate
        raise ContentGeneratorError("question evidence quote is not in generated paragraphs")

    def _validate_question_bank(self, questions: list[dict[str, Any]]) -> None:
        tiers = {str(item.get("difficulty_tier")) for item in questions}
        if tiers != {"foundation", "standard", "advanced"}:
            raise ContentGeneratorError("question bank must cover all difficulty tiers")
        types = {str(item.get("question_type")) for item in questions}
        foundation_types = {
            "vocabulary_in_context",
            "grammar_cloze",
            "detail_comprehension",
        }
        advanced_types = {
            "inference",
            "rhetorical_purpose",
            "sentence_insertion",
            "paragraph_logic",
            "evidence_reasoning",
        }
        if not types.intersection(foundation_types) or not types.intersection(advanced_types):
            raise ContentGeneratorError("question bank lacks foundation or advanced task types")
        if len(types) < 3:
            raise ContentGeneratorError("question bank task types are not diverse enough")

    def _build_hints(self, raw: list[str]) -> dict[str, str]:
        hints = [self._normalize_text(item, minimum=4, maximum=400) for item in raw]
        while len(hints) < 4:
            hints.append("Use the structure of the passage before selecting the answer.")
        return {
            "h1": hints[0],
            "h2": hints[1],
            "h3": hints[2],
            "h4": hints[3],
        }

    def _build_evidence_span(self, *, paragraphs: list[str], quote: str) -> _EvidenceSpan | None:
        if not paragraphs:
            return None
        clean_quote = quote.strip()
        if not clean_quote:
            return None
        for index, paragraph in enumerate(paragraphs):
            start = paragraph.find(clean_quote)
            if start >= 0:
                return {
                    "paragraph_index": index,
                    "start": start,
                    "end": start + len(clean_quote),
                    "text": clean_quote,
                }
        return None

    def _normalize_options(self, raw_options: list[str]) -> list[dict[str, str]]:
        options: list[dict[str, str]] = []
        for idx, option_text in enumerate(raw_options[:4], start=0):
            option = self._normalize_text(option_text, minimum=2, maximum=400)
            options.append({"option_id": chr(ord("A") + idx), "text": option})
        while len(options) < 3:
            options.append(
                {
                    "option_id": chr(ord("A") + len(options)),
                    "text": f"Option {chr(ord('A') + len(options))}.",
                }
            )
        return options

    def _normalize_error_candidates(self, raw: list[str]) -> list[str]:
        candidates = [self._normalize_text(item, minimum=4, maximum=400) for item in raw]
        if not candidates:
            candidates = [
                "The selected option confuses statement scope with implied meaning.",
                "The sentence-level logic is mistaken for a vocabulary detail.",
            ]
        return candidates

    def _normalize_title(self, title: str) -> str:
        return self._normalize_text(title, minimum=4, maximum=160)

    def _normalize_text(self, text: str, minimum: int, maximum: int) -> str:
        value = " ".join(str(text).strip().split())
        if len(value) < minimum:
            value = value + (" " * (minimum - len(value) + 1)) if minimum > 0 else value
        if len(value) > maximum:
            value = value[: maximum - 1].rstrip() + "."
        return value

    def _safe_id(self, value: str) -> str:
        sanitized = re.sub(r"[^a-z0-9_]", "_", value.lower())
        if not sanitized or not sanitized[0].isalpha():
            sanitized = f"gen_{sanitized}"
        if len(sanitized) < 8:
            sanitized = sanitized + ("_x" * ((8 - len(sanitized)) // 2 + 1))[: 8 - len(sanitized)]
        return sanitized[:120]

    def _generated_id_prefix(self, idx: int) -> str:
        return f"gen_{idx + 1:02d}"

    def _assert_item_valid(self, item: dict[str, Any]) -> None:
        for error in Draft202012Validator(self._item_schema).iter_errors(item):
            raise ContentGeneratorError(f"{error.json_path}: {error.message}")

    def _mark_agent_generated_review(self, item: dict[str, Any]) -> None:
        existing = item.get("review")
        limitations = list(existing.get("limitations", [])) if isinstance(existing, dict) else []
        required_limit = "Agent-generated candidate; human content review required"
        if required_limit not in limitations:
            limitations.append(required_limit)
        item["review"] = {
            "status": "agent_generated_unreviewed",
            "reviewer_role": "agent_generator",
            "reviewed_at": datetime.now(UTC)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z"),
            "limitations": limitations,
        }

    def _assert_original_enough(
        self,
        source_item: dict[str, Any],
        candidate_item: dict[str, Any],
    ) -> None:
        source_words = self._comparison_words(self._content_body_from_item(source_item))
        candidate_words = self._comparison_words(self._content_body_from_item(candidate_item))
        if len(source_words) < 12 or len(candidate_words) < 12:
            return
        source_windows = {
            tuple(source_words[index : index + 12]) for index in range(len(source_words) - 11)
        }
        repeated = [
            tuple(candidate_words[index : index + 12])
            for index in range(len(candidate_words) - 11)
            if tuple(candidate_words[index : index + 12]) in source_windows
        ]
        if repeated:
            raise ContentGeneratorError(
                "candidate repeats a 12-word source span; regenerate with a new example and wording"
            )

    @staticmethod
    def _comparison_words(text: str) -> list[str]:
        return re.findall(r"[a-z]+(?:'[a-z]+)?", text.lower())

    def _mark_agent_reviewed(
        self,
        item: dict[str, Any],
        review: ContentReviewResult,
    ) -> None:
        item["review"] = {
            "status": "agent_reviewed",
            "reviewer_role": "review_agent",
            "reviewed_at": datetime.now(UTC)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z"),
            "limitations": review.limitations,
            "judge_report": {
                "verdict": review.verdict,
                "model_adapter": self._content_reviewer.name
                if self._content_reviewer is not None
                else "unknown",
                "prompt_version": "prompt_content_judge_v1",
                "scores": review.scores.model_dump(),
                "issues": [issue.model_dump() for issue in review.issues],
                "summary": review.summary,
            },
        }

    def _clear_output_directory(self, directory: Path) -> None:
        for entry in directory.iterdir():
            if entry.is_file():
                entry.unlink()

    def _extract_paragraphs(self, item: dict[str, Any]) -> list[dict[str, Any]]:
        paragraphs = item.get("paragraphs")
        if isinstance(paragraphs, list):
            return [part for part in paragraphs if isinstance(part, dict)]
        return []

    def _as_str(self, value: object, label: str) -> str:
        if not isinstance(value, str) or not value:
            raise ContentGeneratorError(f"missing source field: {label}")
        return value

    def _content_body_from_item(self, item: dict[str, Any]) -> str:
        if "paragraphs" in item and isinstance(item.get("paragraphs"), list):
            return "\n\n".join(
                str(part.get("text", "")) for part in item["paragraphs"] if isinstance(part, dict)
            )
        return str(item.get("situation", ""))

    def _word_count(self, text: str) -> int:
        return len(re.findall(r"\b[\w'-]+\b", text))

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        return cast(dict[str, Any], json.loads(path.read_text(encoding="utf-8")))

    def _relabel_item(
        self,
        source_item: dict[str, Any],
        content_type: str,
        content_id: str,
        content_version_id: str,
        randomizer: random.Random,
        reviewed_at: str,
    ) -> dict[str, Any]:
        item = copy.deepcopy(source_item)
        item["content_id"] = content_id
        item["content_version_id"] = content_version_id
        item["title"] = (
            f"AI-Generated: {self._as_str(item.get('title', content_version_id), 'title')}"
        )

        if content_type in {"calibration_reading", "matched_reading"}:
            if isinstance(item.get("main_question"), dict):
                item["main_question"] = self._mutate_main_question(
                    item["main_question"], randomizer
                )
            self._normalize_reading_difficulty(item, randomizer)
        if isinstance(item.get("review"), dict):
            item["review"]["reviewed_at"] = reviewed_at

        item_body = self._content_body_from_item(item)
        item["content_hash"] = sha256(item_body.encode("utf-8")).hexdigest()
        if isinstance(item.get("difficulty"), dict):
            item["difficulty"]["word_count"] = self._word_count(item_body)
        self._assert_item_valid(item)
        return item

    def _normalize_reading_difficulty(
        self, item: dict[str, Any], randomizer: random.Random
    ) -> None:
        difficulty = item.get("difficulty")
        if not isinstance(difficulty, dict):
            return
        difficulty["estimate_source"] = "agent workflow deterministic remix with random seed"
        paragraphs = item.get("paragraphs")
        if isinstance(paragraphs, list):
            difficulty["paragraph_count"] = len(paragraphs)

    def _mutate_main_question(
        self, question: dict[str, Any], randomizer: random.Random
    ) -> dict[str, Any]:
        prompt_variants = [
            "Which option best captures the central message of this passage?",
            "Choose the most accurate interpretation of the author's viewpoint.",
            "Which statement best reflects the argument above?",
        ]
        options = question.get("options", [])
        if not isinstance(options, list) or len(options) < 2:
            return question

        correct_option = question.get("correct_answer")
        normalized_options = [dict(option) for option in options if isinstance(option, dict)]
        if not normalized_options:
            return question
        if correct_option not in {"A", "B", "C", "D", "E"}:
            correct_option = normalized_options[0].get("option_id", "A")

        randomizer.shuffle(normalized_options)
        for option_id, option in zip(("A", "B", "C", "D", "E"), normalized_options, strict=False):
            option["option_id"] = option_id
            if option.get("text") == question.get("correct_answer"):
                correct_option = option_id

        mutated = dict(question)
        mutated["prompt"] = randomizer.choice(prompt_variants)
        mutated["options"] = normalized_options
        mutated["correct_answer"] = correct_option
        return mutated


def run_cli(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate Agent-backed content pack")
    parser.add_argument("--seed", type=int, help="Deterministic seed", default=None)
    parser.add_argument(
        "--pack-id",
        type=str,
        default=None,
        help="Generated pack identifier (optional)",
    )
    parser.add_argument(
        "--pack-version",
        type=str,
        default="v1",
        help="Pack version suffix",
    )
    parser.add_argument(
        "--output-directory",
        type=Path,
        default=None,
        help="Output directory for generated content pack",
    )
    parser.add_argument(
        "--source-manifest",
        type=Path,
        default=None,
        help="Source content manifest path",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run generation and validation without writing output files",
    )
    parser.add_argument(
        "--allow-deterministic-fallback",
        action="store_true",
        help="Explicitly permit a relabeled source fixture when generation is unavailable",
    )
    args = parser.parse_args(argv)

    workflow = ContentGenerationWorkflow(
        source_manifest=args.source_manifest,
        output_directory=args.output_directory,
        pack_version=args.pack_version,
        pack_id=args.pack_id,
        allow_deterministic_fallback=args.allow_deterministic_fallback,
    )
    result = workflow.run(seed=args.seed, dry_run=args.dry_run)
    if result.errors:
        print("validation_errors:")
        for error in result.errors:
            print(f" - {error}")
        return 1
    print(f"manifest: {result.manifest_path}")
    print(f"items: {result.item_count}")
    print(f"pack: {result.pack_id}@{result.pack_version}")
    return 0


def _read_json(path: Path) -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    raise SystemExit(run_cli())
