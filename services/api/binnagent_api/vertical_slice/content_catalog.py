import json
from hashlib import sha256
from pathlib import Path
from typing import Any, NoReturn

from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.matching import MaterialCandidate
from binnagent_domain.vertical_slice.models import (
    DifficultyStatus,
    ExamTrack,
    MaterialRef,
    RightsStatus,
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
        manifest_path = Path(get_settings().content_manifest)
        return self._read_json(manifest_path.parent / str(entry.get("file", "")))

    def paired_expression_for(self, matched_content_version_id: str) -> MaterialRef:
        preferred = (
            "micro_expression_02_v1"
            if "reading_02_" in matched_content_version_id
            else "micro_expression_01_v1"
        )
        return self.material_by_version(preferred)

    def candidates_for(self, task_type: TaskType) -> tuple[MaterialCandidate, ...]:
        candidates: list[MaterialCandidate] = []
        for entry in self._eligible_entries(task_type):
            material = self._material(entry)
            manifest_path = Path(get_settings().content_manifest)
            item = self._read_json(manifest_path.parent / str(entry.get("file", "")))
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
        manifest_path = Path(get_settings().content_manifest)
        item = self._read_json(manifest_path.parent / str(entry.get("file", "")))
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

    def _entry(self, content_version_id: str) -> dict[str, Any] | None:
        return next(
            (
                item
                for item in self._manifest_items()
                if item.get("content_version_id") == content_version_id
            ),
            None,
        )

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
        return _RIGHTS_RANK[status] >= _RIGHTS_RANK[minimum]

    def _material(self, entry: dict[str, Any]) -> MaterialRef:
        manifest_path = Path(get_settings().content_manifest)
        item_path = manifest_path.parent / str(entry.get("file", ""))
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
        manifest = self._read_json(Path(get_settings().content_manifest))
        raw_items = manifest.get("items")
        if not isinstance(raw_items, list):
            self._not_eligible("content_manifest_items_missing")
        return [item for item in raw_items if isinstance(item, dict)]

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
