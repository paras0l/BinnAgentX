"""Build the runtime NETEM dictionary index from the reviewed Markdown volumes."""

# ruff: noqa: RUF001

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = PROJECT_ROOT / "output" / "netem-vocabulary"
DEFAULT_DESTINATION = (
    PROJECT_ROOT / "services" / "api" / "binnagent_api" / "data" / "netem-vocabulary-v1.json"
)
LABELS = (
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
MAX_NOTE_LENGTH = 800


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--destination", type=Path, default=DEFAULT_DESTINATION)
    return parser.parse_args()


def _shorten_note(fields: dict[str, str]) -> str:
    def render() -> str:
        return "\n".join(f"{label}：{fields[label]}" for label in LABELS)

    note = render()
    if len(note) <= MAX_NOTE_LENGTH:
        return note
    excess = len(note) - MAX_NOTE_LENGTH
    memory = fields["记忆提示"]
    keep = max(1, len(memory) - excess - 1)
    fields["记忆提示"] = f"{memory[:keep].rstrip()}…"
    note = render()
    if len(note) > MAX_NOTE_LENGTH:
        raise ValueError("vocabulary_note_cannot_be_compacted")
    return note


def _clean_continuation(value: str) -> str:
    parts: list[str] = []
    for line in value.splitlines():
        normalized = line.strip()
        if not normalized:
            continue
        normalized = re.sub(r"^-\s+", "", normalized)
        normalized = re.sub(r"^\*\*([^*]+)\*\*\s*", r"\1 ", normalized)
        normalized = normalized.replace("`", "")
        parts.append(normalized)
    return "；".join(parts)


def _fields_from_block(block: str) -> dict[str, str]:
    matches = list(re.finditer(r"(?m)^- \*\*([^*]+)\*\*[：:]\s*(.*)$", block))
    fields: dict[str, str] = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(block)
        label = match.group(1)
        value = block[match.start(2) : end].strip()
        if label == "语境例句":
            translation = re.search(r"(?m)^\s+- 译[：:]\s*(.+)$", value)
            if translation is not None:
                fields["译文"] = translation.group(1).strip()
                value = value[: translation.start()].strip()
        fields[label] = _clean_continuation(value)
    return fields


def build_index(source: Path) -> dict[str, object]:
    entries: list[dict[str, object]] = []
    documents = sorted(source.glob("netem-vocabulary-*.md"))
    for document in documents:
        content = document.read_text(encoding="utf-8")
        headings = list(re.finditer(r"(?m)^## (\d+)\. ([^\n]+)$", content))
        for index, heading in enumerate(headings):
            end = headings[index + 1].start() if index + 1 < len(headings) else len(content)
            block = content[heading.end() : end]
            fields = _fields_from_block(block)
            missing = [label for label in LABELS if not fields.get(label)]
            if missing:
                raise ValueError(f"{heading.group(2)} missing fields: {missing}")
            entries.append(
                {
                    "sequence": int(heading.group(1)),
                    "headword": heading.group(2).strip(),
                    "note": _shorten_note(fields),
                }
            )
    if len(entries) != 5530:
        raise ValueError(f"expected 5530 entries, received {len(entries)}")
    if [entry["sequence"] for entry in entries] != list(range(1, 5531)):
        raise ValueError("dictionary sequence must be continuous from 1 to 5530")
    source_manifest = source / "manifest.json"
    return {
        "version": "netem-5530-v1",
        "source_manifest_sha256": hashlib.sha256(source_manifest.read_bytes()).hexdigest(),
        "entries": entries,
    }


def main() -> None:
    args = _parse_args()
    payload = build_index(args.source)
    entries = payload["entries"]
    assert isinstance(entries, list)
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    args.destination.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(entries)} entries to {args.destination}")


if __name__ == "__main__":
    main()
