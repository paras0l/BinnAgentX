from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


def _read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"expected a JSON object: {path}")
    return value


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text))


def validate_content_pack(
    repository_root: Path,
    *,
    content_directory: Path | None = None,
) -> list[str]:
    """Return integrity errors without mutating content or normalizing evidence."""
    content_root = content_directory or repository_root / "fixtures/content/v1"
    schema_root = repository_root / "contracts/content/v1"
    item_schema = _read_json(schema_root / "content-item.schema.json")
    manifest_schema = _read_json(schema_root / "manifest.schema.json")
    manifest = _read_json(content_root / "manifest.json")
    errors: list[str] = []

    for error in Draft202012Validator(manifest_schema).iter_errors(manifest):
        errors.append(f"manifest schema: {error.json_path}: {error.message}")

    raw_items = manifest.get("items")
    if not isinstance(raw_items, list):
        return [*errors, "manifest items must be a list"]

    seen_versions: set[str] = set()
    seen_files: set[str] = set()
    for raw_manifest_item in raw_items:
        if not isinstance(raw_manifest_item, dict):
            errors.append("manifest item must be an object")
            continue
        filename = raw_manifest_item.get("file")
        version_id = raw_manifest_item.get("content_version_id")
        if not isinstance(filename, str) or not isinstance(version_id, str):
            errors.append("manifest item requires string file and content_version_id")
            continue
        if filename in seen_files:
            errors.append(f"duplicate manifest file: {filename}")
        if version_id in seen_versions:
            errors.append(f"duplicate content version: {version_id}")
        seen_files.add(filename)
        seen_versions.add(version_id)

        item_path = content_root / filename
        if not item_path.is_file():
            errors.append(f"missing content file: {filename}")
            continue
        item = _read_json(item_path)
        for error in Draft202012Validator(item_schema).iter_errors(item):
            errors.append(f"{filename} schema: {error.json_path}: {error.message}")

        if item.get("content_version_id") != version_id:
            errors.append(f"{filename}: manifest version mismatch")
        if item.get("content_type") != raw_manifest_item.get("content_type"):
            errors.append(f"{filename}: manifest type mismatch")

        paragraphs = item.get("paragraphs")
        if isinstance(paragraphs, list):
            paragraph_texts = [
                part.get("text", "") for part in paragraphs if isinstance(part, dict)
            ]
            body = "\n\n".join(text for text in paragraph_texts if isinstance(text, str))
        else:
            situation = item.get("situation")
            body = situation if isinstance(situation, str) else ""

        content_hash = _sha256(body)
        if item.get("content_hash") != content_hash:
            errors.append(f"{filename}: content hash mismatch")
        if raw_manifest_item.get("content_hash") != content_hash:
            errors.append(f"{filename}: manifest hash mismatch")

        if isinstance(paragraphs, list):
            difficulty = item.get("difficulty")
            if not isinstance(difficulty, dict) or difficulty.get("word_count") != _word_count(
                body
            ):
                errors.append(f"{filename}: word count mismatch")
            paragraph_map = {
                part["paragraph_id"]: part["text"]
                for part in paragraphs
                if isinstance(part, dict)
                and isinstance(part.get("paragraph_id"), str)
                and isinstance(part.get("text"), str)
            }
            question = item.get("main_question")
            if not isinstance(question, dict):
                errors.append(f"{filename}: missing main question")
                continue
            raw_bank = item.get("question_bank")
            questions = (
                [candidate for candidate in raw_bank if isinstance(candidate, dict)]
                if isinstance(raw_bank, list)
                else [question]
            )
            for candidate in questions:
                question_id = candidate.get("question_id", "unknown")
                spans = [candidate.get("minimum_evidence")]
                alternatives = candidate.get("acceptable_alternative_evidence", [])
                if isinstance(alternatives, list):
                    spans.extend(alternatives)
                for span in spans:
                    if not isinstance(span, dict):
                        errors.append(f"{filename}: {question_id} evidence span must be an object")
                        continue
                    paragraph = paragraph_map.get(span.get("paragraph_id"))
                    start, end, quote = (
                        span.get("start"),
                        span.get("end"),
                        span.get("text_quote"),
                    )
                    if (
                        not isinstance(paragraph, str)
                        or not isinstance(start, int)
                        or not isinstance(end, int)
                    ):
                        errors.append(f"{filename}: {question_id} invalid evidence coordinates")
                        continue
                    if not isinstance(quote, str) or paragraph[start:end] != quote:
                        errors.append(f"{filename}: {question_id} evidence quote mismatch")
                        continue
                    if span.get("text_hash") != _sha256(quote):
                        errors.append(f"{filename}: {question_id} evidence hash mismatch")

    return errors
