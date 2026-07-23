import json
import re
from hashlib import sha256
from pathlib import Path
from typing import Any, NoReturn

from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.grammar_challenge import (
    GrammarChallenge,
    project_grammar_error,
    select_grammar_challenge,
)
from binnagent_domain.vertical_slice.matching import (
    ExpressionMaterialCandidate,
    MaterialCandidate,
)
from binnagent_domain.vertical_slice.models import (
    DifficultyStatus,
    ExamTrack,
    LearnerProfileSnapshot,
    MaterialRef,
    RightsStatus,
    SelfReportedLevel,
    TaskType,
    TextSpan,
)

from binnagent_api.settings import get_settings

_CONTENT_TYPE = {
    TaskType.CALIBRATION_READING: "calibration_reading",
    TaskType.MATCHED_READING: "matched_reading",
    TaskType.MICRO_EXPRESSION: "micro_expression",
}
_RIGHTS_RANK = {
    RightsStatus.ELIGIBLE_DEV: 1,
    RightsStatus.ELIGIBLE_PILOT: 2,
    RightsStatus.ELIGIBLE_RELEASE: 3,
}


class LocalContentCatalog:
    """Read-only adapter for the versioned development content pack."""

    def _manifest_candidates(self) -> tuple[Path, ...]:
        settings = get_settings()
        paths = (
            Path(settings.content_generation_manifest),
            Path(settings.content_manifest),
        )
        return tuple(dict.fromkeys(paths).keys())

    def _compatible_manifest_candidates(self) -> tuple[Path, ...]:
        settings = get_settings()
        generated_root = Path(settings.content_generation_output_directory)
        paths = [*self._manifest_candidates()]
        packs_root = generated_root / "packs"
        if packs_root.is_dir():
            paths.extend(sorted(packs_root.glob("*/manifest.json"), reverse=True))
        return tuple(dict.fromkeys(paths).keys())

    def _active_manifest_items(self) -> tuple[Path, list[dict[str, Any]]]:
        for manifest_path in self._manifest_candidates():
            items = self._safe_read_manifest_items(manifest_path)
            if items is not None:
                return manifest_path.parent, items
        self._not_eligible("content_manifest_items_missing")

    def _safe_read_manifest_items(self, manifest_path: Path) -> list[dict[str, Any]] | None:
        try:
            manifest = self._read_json(manifest_path)
        except DomainError:
            return None

        items = manifest.get("items")
        if not isinstance(items, list):
            return None

        raw_entries = [item for item in items if isinstance(item, dict)]
        if not raw_entries:
            return None

        parent = manifest_path.parent
        for entry in raw_entries:
            filename = str(entry.get("file", ""))
            item_path = parent / filename
            if not filename or not item_path.is_file():
                return None
            try:
                item = self._read_json(item_path)
            except DomainError:
                return None
            review = item.get("review")
            if not isinstance(review, dict) or review.get("status") not in {
                "agent_reviewed",
                "developer_reviewed",
            }:
                return None

        return [dict(entry, _manifest_dir=str(parent)) for entry in raw_entries]

    def _active_content_entry(self, content_version_id: str) -> dict[str, Any] | None:
        _, manifest_items = self._active_manifest_items()
        for entry in manifest_items:
            if str(entry.get("content_version_id")) == content_version_id:
                return entry
        return None

    def first_for(self, task_type: TaskType) -> MaterialRef:
        candidates = self._eligible_entries(task_type)
        if not candidates:
            self._not_eligible("no_eligible_material_for_task_type")
        return self._material(candidates[0])

    def material_at(self, task_type: TaskType, index: int) -> MaterialRef:
        candidates = self._eligible_entries(task_type)
        if index < 0 or index >= len(candidates):
            self._not_eligible("required_material_ordinal_unavailable")
        return self._material(candidates[index])

    def material_by_version(self, content_version_id: str) -> MaterialRef:
        entry = self._entry(content_version_id)
        if entry is None or not self._eligible(entry):
            self._not_eligible("selected_material_is_not_eligible")
        return self._material(entry)

    def learner_item(self, content_version_id: str) -> dict[str, Any]:
        """Return an eligible source item for an API presenter to redact."""
        entry = self._entry(content_version_id)
        if entry is None or not self._eligible(entry):
            self._not_eligible("selected_material_is_not_eligible")
        self._material(entry)
        item_path = self._resolve_entry_path(entry)
        if item_path is None:
            self._not_eligible("selected_material_is_not_eligible")
        return self._read_json(item_path)

    def reading_question_for(
        self,
        content_version_id: str,
        task_id: str,
        profile: LearnerProfileSnapshot,
    ) -> dict[str, Any]:
        item = self.learner_item(content_version_id)
        raw_bank = item.get("question_bank")
        if not isinstance(raw_bank, list) or not raw_bank:
            main = item.get("main_question")
            if not isinstance(main, dict):
                self._not_eligible("approved_reading_question_unavailable")
            return main
        bank = [question for question in raw_bank if isinstance(question, dict)]
        if not bank:
            self._not_eligible("approved_reading_question_unavailable")
        target_tier = self._target_question_tier(profile)
        tier_order = {
            "foundation": ("foundation", "standard", "advanced"),
            "standard": ("standard", "foundation", "advanced"),
            "advanced": ("advanced", "standard", "foundation"),
        }[target_tier]
        for tier in tier_order:
            candidates = [question for question in bank if question.get("difficulty_tier") == tier]
            if candidates:
                digest = sha256(f"{task_id}:{content_version_id}:{tier}".encode()).digest()
                return candidates[int.from_bytes(digest[:4]) % len(candidates)]
        self._not_eligible("approved_reading_question_unavailable")

    @staticmethod
    def _target_question_tier(profile: LearnerProfileSnapshot) -> str:
        if profile.current_level in {"foundation", "developing"}:
            return "foundation" if profile.confidence_band == "low" else "standard"
        if profile.current_level == "independent":
            return "standard"
        if profile.current_level == "advanced":
            return "advanced"
        if (
            profile.self_reported_level
            in {
                SelfReportedLevel.WEAK,
                SelfReportedLevel.UNKNOWN,
            }
            or profile.evidence_count < 2
        ):
            return "foundation"
        if profile.self_reported_level is SelfReportedLevel.STEADY or profile.target_score >= 80:
            return "advanced"
        return "standard"

    def approved_reading_hint(
        self,
        content_version_id: str,
        task_id: str,
        profile: LearnerProfileSnapshot,
        hint_level: int,
    ) -> str:
        """Return one rights-checked, versioned hint without exposing the answer payload."""
        if hint_level not in {1, 2, 3, 4}:
            self._not_eligible("unsupported_hint_level")
        question = self.reading_question_for(content_version_id, task_id, profile)
        hints = question.get("hints") if isinstance(question, dict) else None
        hint = hints.get(f"h{hint_level}") if isinstance(hints, dict) else None
        if not isinstance(hint, str) or not hint.strip():
            self._not_eligible("approved_hint_unavailable")
        return hint.strip()

    def approved_expression_feedback(
        self,
        content_version_id: str,
        attempt_text: str,
    ) -> tuple[str, str]:
        """Select one pre-reviewed check from visible surface signals in learner V1."""
        item = self.learner_item(content_version_id)
        if item.get("content_type") != "micro_expression":
            self._not_eligible("priority_feedback_requires_expression_content")
        english_words = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", attempt_text)
        if len(english_words) < 12:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "expression_v1_too_short_for_priority_feedback",
            )
        normalized = " ".join(attempt_text.lower().split())
        checks = item.get("priority_feedback_checks")
        if not isinstance(checks, list) or not checks:
            self._not_eligible("approved_priority_feedback_unavailable")
        for check in checks:
            if not isinstance(check, dict):
                self._not_eligible("approved_priority_feedback_invalid")
            check_id = check.get("check_id")
            signal_terms = check.get("signal_terms")
            feedback = check.get("feedback")
            if (
                not isinstance(check_id, str)
                or not isinstance(signal_terms, list)
                or not signal_terms
                or not all(isinstance(term, str) for term in signal_terms)
                or not isinstance(feedback, str)
                or not feedback.strip()
            ):
                self._not_eligible("approved_priority_feedback_invalid")
            if not any(term.lower() in normalized for term in signal_terms):
                return f"priority_feedback_{check_id}", feedback.strip()
        fallback = item.get("priority_feedback_fallback")
        if not isinstance(fallback, str) or not fallback.strip():
            self._not_eligible("approved_priority_feedback_fallback_unavailable")
        return "priority_feedback_fallback", fallback.strip()

    def paired_expression_for(self, matched_content_version_id: str) -> MaterialRef:
        candidates = self._eligible_entries(TaskType.MICRO_EXPRESSION)
        if not candidates:
            self._not_eligible("priority_content_not_found_for_expression_pairing")
        preferred_suffix = "02_v1" if "reading_02_" in matched_content_version_id else "01_v1"
        preferred = next(
            (
                item
                for item in candidates
                if str(item.get("content_version_id", "")).endswith(preferred_suffix)
            ),
            None,
        )
        if preferred is None:
            preferred = candidates[0]
        return self._material(preferred)

    def expression_candidates(self) -> tuple[ExpressionMaterialCandidate, ...]:
        candidates: list[ExpressionMaterialCandidate] = []
        for entry in self._eligible_entries(TaskType.MICRO_EXPRESSION):
            material = self._material(entry)
            item_path = self._resolve_entry_path(entry)
            if item_path is None:
                self._not_eligible("expression_candidate_unavailable")
            item = self._read_json(item_path)
            difficulty = item.get("difficulty")
            source_ids = item.get("source_reading_content_ids")
            if not isinstance(difficulty, dict) or not isinstance(source_ids, list):
                self._not_eligible("expression_selection_metadata_missing")
            raw_tracks = difficulty.get("exam_tracks")
            if not isinstance(raw_tracks, list) or not all(
                isinstance(value, str) for value in source_ids
            ):
                self._not_eligible("expression_selection_metadata_invalid")
            try:
                exam_tracks = tuple(ExamTrack(str(value)) for value in raw_tracks)
            except ValueError as exc:
                raise DomainError(
                    PublicErrorCode.CONTENT_NOT_ELIGIBLE,
                    "expression_candidate_exam_track_invalid",
                ) from exc
            candidates.append(
                ExpressionMaterialCandidate(
                    content_id=material.content_id,
                    content_version_id=material.content_version_id,
                    source_reading_content_ids=tuple(str(value) for value in source_ids),
                    exam_tracks=exam_tracks,
                    vocabulary_load=str(difficulty.get("vocabulary_load")),
                    syntax_load=str(difficulty.get("syntax_load")),
                    estimated_minutes=int(difficulty.get("estimated_minutes", 0)),
                )
            )
        return tuple(candidates)

    def candidates_for(self, task_type: TaskType) -> tuple[MaterialCandidate, ...]:
        candidates: list[MaterialCandidate] = []
        for entry in self._eligible_entries(task_type):
            material = self._material(entry)
            item_path = self._resolve_entry_path(entry)
            if item_path is None:
                self._not_eligible("material_candidate_unavailable")
            item = self._read_json(item_path)
            difficulty = item.get("difficulty")
            if not isinstance(difficulty, dict):
                self._not_eligible("candidate_difficulty_missing")
            raw_tracks = difficulty.get("exam_tracks")
            if not isinstance(raw_tracks, list):
                self._not_eligible("candidate_exam_tracks_missing")
            try:
                exam_tracks = tuple(ExamTrack(str(value)) for value in raw_tracks)
            except ValueError as exc:
                raise DomainError(
                    PublicErrorCode.CONTENT_NOT_ELIGIBLE,
                    "candidate_exam_track_invalid",
                ) from exc
            candidates.append(
                MaterialCandidate(
                    content_id=material.content_id,
                    content_version_id=material.content_version_id,
                    exam_tracks=exam_tracks,
                    topic_familiarity=str(difficulty.get("topic_familiarity")),
                    word_count=int(difficulty.get("word_count", 0)),
                    vocabulary_load=str(difficulty.get("vocabulary_load")),
                    syntax_load=str(difficulty.get("syntax_load")),
                    evidence_distance=str(difficulty.get("evidence_distance")),
                    estimated_minutes=int(difficulty.get("estimated_minutes", 0)),
                )
            )
        return tuple(candidates)

    def replacement_for(self, task_type: TaskType, current_version_id: str) -> MaterialRef:
        candidate = next(
            (
                entry
                for entry in self._eligible_entries(task_type)
                if entry.get("content_version_id") != current_version_id
            ),
            None,
        )
        if candidate is None:
            self._not_eligible("no_eligible_replacement_material")
        return self._material(candidate)

    def current(self, content_version_id: str) -> MaterialRef:
        entry = self._entry(content_version_id)
        if entry is None or not self._eligible(entry):
            raise DomainError(
                PublicErrorCode.MATERIAL_REPLACED,
                "assigned_content_is_no_longer_eligible",
            )
        return self._material(entry)

    def validate_span(self, content_version_id: str, span: TextSpan) -> None:
        entry = self._entry(content_version_id)
        if entry is None or not self._eligible(entry):
            self._not_eligible("annotation_content_is_not_eligible")
        self._material(entry)
        item_path = self._resolve_entry_path(entry)
        if item_path is None:
            self._not_eligible("annotation_content_is_not_eligible")
        item = self._read_json(item_path)
        paragraphs = item.get("paragraphs")
        paragraph_map = (
            {
                part["paragraph_id"]: part["text"]
                for part in paragraphs
                if isinstance(part, dict)
                and isinstance(part.get("paragraph_id"), str)
                and isinstance(part.get("text"), str)
            }
            if isinstance(paragraphs, list)
            else {}
        )
        paragraph = paragraph_map.get(span.paragraph_id)
        if not isinstance(paragraph, str) or paragraph[span.start : span.end] != span.text_quote:
            raise DomainError(
                PublicErrorCode.SAVE_NOT_CONFIRMED,
                "annotation_span_not_in_assigned_content",
            )

    def paragraph_text(self, content_version_id: str, paragraph_id: str) -> str:
        """Resolve a paragraph from eligible assigned content for bounded model context."""
        item = self.learner_item(content_version_id)
        paragraphs = item.get("paragraphs")
        if isinstance(paragraphs, list):
            for part in paragraphs:
                if (
                    isinstance(part, dict)
                    and part.get("paragraph_id") == paragraph_id
                    and isinstance(part.get("text"), str)
                ):
                    return str(part["text"])
        self._not_eligible("annotation_paragraph_unavailable")

    def grammar_challenge_for(
        self,
        task_id: str,
        content_version_id: str,
    ) -> GrammarChallenge:
        """Select one reviewed challenge deterministically without exposing its answer."""
        item = self.learner_item(content_version_id)
        raw_candidates = item.get("grammar_challenges")
        paragraphs = item.get("paragraphs")
        if not isinstance(raw_candidates, list) or not isinstance(paragraphs, list):
            self._not_eligible("grammar_challenge_candidates_missing")
        paragraph_map = {
            str(part["paragraph_id"]): str(part["text"])
            for part in paragraphs
            if isinstance(part, dict)
            and isinstance(part.get("paragraph_id"), str)
            and isinstance(part.get("text"), str)
        }
        candidates: list[GrammarChallenge] = []
        try:
            for raw in raw_candidates:
                if not isinstance(raw, dict):
                    raise ValueError("grammar_challenge_candidate_invalid")
                candidate = GrammarChallenge(
                    challenge_id=str(raw["challenge_id"]),
                    paragraph_id=str(raw["paragraph_id"]),
                    correct_text=str(raw["correct_text"]),
                    incorrect_text=str(raw["incorrect_text"]),
                    error_type=str(raw["error_type"]),
                    hint=str(raw["hint"]),
                )
                paragraph = paragraph_map.get(candidate.paragraph_id)
                if paragraph is None:
                    raise ValueError("grammar_challenge_paragraph_missing")
                project_grammar_error(paragraph, candidate)
                candidates.append(candidate)
            return select_grammar_challenge(task_id, content_version_id, tuple(candidates))
        except (KeyError, ValueError) as exc:
            raise DomainError(
                PublicErrorCode.CONTENT_NOT_ELIGIBLE,
                str(exc),
            ) from exc

    def _entry(self, content_version_id: str) -> dict[str, Any] | None:
        for manifest_path in self._compatible_manifest_candidates():
            items = self._safe_read_manifest_items(manifest_path)
            if items is None:
                continue
            for entry in items:
                if str(entry.get("content_version_id")) == content_version_id:
                    return entry
        return None

    def _eligible_entries(self, task_type: TaskType) -> list[dict[str, Any]]:
        content_type = _CONTENT_TYPE[task_type]
        return [
            entry
            for entry in self._manifest_items()
            if entry.get("content_type") == content_type and self._eligible(entry)
        ]

    def _eligible(self, entry: dict[str, Any]) -> bool:
        try:
            status = RightsStatus(entry["rights_status"])
            minimum = RightsStatus(get_settings().min_content_rights_status)
        except (KeyError, ValueError):
            return False
        if _RIGHTS_RANK[status] < _RIGHTS_RANK[minimum]:
            return False
        item_path = self._resolve_entry_path(entry)
        if item_path is None or not item_path.is_file():
            return False
        item = self._read_json(item_path)
        review = item.get("review")
        return isinstance(review, dict) and review.get("status") in {
            "agent_reviewed",
            "developer_reviewed",
        }

    def _material(self, entry: dict[str, Any]) -> MaterialRef:
        item_path = self._resolve_entry_path(entry)
        if item_path is None:
            self._not_eligible("content_manifest_item_unavailable")
        item = self._read_json(item_path)
        body = self._content_body(item)
        computed_hash = sha256(body.encode("utf-8")).hexdigest()
        expected_hash = entry.get("content_hash")
        if (
            computed_hash != expected_hash
            or item.get("content_hash") != expected_hash
            or item.get("content_version_id") != entry.get("content_version_id")
            or item.get("content_type") != entry.get("content_type")
        ):
            self._not_eligible("content_manifest_integrity_failed")
        rights = item.get("rights")
        if not isinstance(rights, dict) or rights.get("rights_status") != entry.get(
            "rights_status"
        ):
            self._not_eligible("content_rights_ledger_mismatch")
        difficulty = item.get("difficulty")
        difficulty_status = (
            difficulty.get("difficulty_status") if isinstance(difficulty, dict) else None
        )
        if difficulty_status != entry.get("difficulty_status"):
            self._not_eligible("content_difficulty_status_mismatch")
        return MaterialRef(
            content_id=str(item["content_id"]),
            content_version_id=str(item["content_version_id"]),
            content_hash=computed_hash,
            rights_status=RightsStatus(str(entry["rights_status"])),
            difficulty_status=DifficultyStatus(str(difficulty_status)),
        )

    def _manifest_items(self) -> list[dict[str, Any]]:
        _, manifest_items = self._active_manifest_items()
        return manifest_items

    def _resolve_entry_path(self, entry: dict[str, Any]) -> Path | None:
        raw_manifest_dir = entry.get("_manifest_dir")
        if isinstance(raw_manifest_dir, str) and raw_manifest_dir:
            manifest_dir = Path(raw_manifest_dir)
        else:
            manifest_dir, _ = self._active_manifest_items()
        return manifest_dir / str(entry.get("file", ""))

    @staticmethod
    def _content_body(item: dict[str, Any]) -> str:
        paragraphs = item.get("paragraphs")
        if isinstance(paragraphs, list):
            return "\n\n".join(
                str(part["text"])
                for part in paragraphs
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            )
        situation = item.get("situation")
        return situation if isinstance(situation, str) else ""

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise DomainError(
                PublicErrorCode.CONTENT_NOT_ELIGIBLE,
                "content_catalog_unavailable",
            ) from exc
        if not isinstance(value, dict):
            raise DomainError(
                PublicErrorCode.CONTENT_NOT_ELIGIBLE,
                "content_catalog_entry_invalid",
            )
        return value

    @staticmethod
    def _not_eligible(reason: str) -> NoReturn:
        raise DomainError(PublicErrorCode.CONTENT_NOT_ELIGIBLE, reason)
