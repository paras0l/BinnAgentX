"""NETEM dictionary lookup and learner-specific explanation-view counts."""

# ruff: noqa: RUF001

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.vertical_slice import tables

_DEFAULT_INDEX_PATH = Path(__file__).with_name("data") / "netem-vocabulary-v1.json"
_HEADWORD_PATTERN = re.compile(r"[A-Za-z]+(?:['’-][A-Za-z]+)*")


@dataclass(frozen=True, slots=True)
class VocabularyDictionaryEntry:
    sequence: int
    headword: str
    note: str
    dictionary_version: str
    provider_ref: str


class VocabularyDictionary:
    def __init__(self, payload: dict[str, Any]) -> None:
        version = payload.get("version")
        entries = payload.get("entries")
        if not isinstance(version, str) or not version:
            raise ValueError("vocabulary_dictionary_version_missing")
        if not isinstance(entries, list) or len(entries) != 5530:
            raise ValueError("vocabulary_dictionary_must_contain_5530_entries")

        exact: dict[str, VocabularyDictionaryEntry] = {}
        folded: dict[str, list[VocabularyDictionaryEntry]] = {}
        for value in entries:
            if not isinstance(value, dict):
                raise ValueError("vocabulary_dictionary_entry_invalid")
            sequence = value.get("sequence")
            headword = value.get("headword")
            note = value.get("note")
            if (
                not isinstance(sequence, int)
                or not isinstance(headword, str)
                or not headword
                or not isinstance(note, str)
                or not 8 <= len(note) <= 800
            ):
                raise ValueError("vocabulary_dictionary_entry_invalid")
            entry = VocabularyDictionaryEntry(
                sequence=sequence,
                headword=headword,
                note=note,
                dictionary_version=version,
                provider_ref=f"{version}:{sequence}",
            )
            if headword in exact:
                raise ValueError("vocabulary_dictionary_duplicate_headword")
            exact[headword] = entry
            folded.setdefault(headword.casefold(), []).append(entry)
        if sorted(entry.sequence for entry in exact.values()) != list(range(1, 5531)):
            raise ValueError("vocabulary_dictionary_sequence_invalid")
        self._exact = exact
        self._folded = folded

    def lookup(self, selected_text: str) -> VocabularyDictionaryEntry | None:
        normalized = " ".join(selected_text.split()).strip('"“”‘’()[]{}.,;:!? ')
        if _HEADWORD_PATTERN.fullmatch(normalized) is None:
            return None
        exact = self._exact.get(normalized)
        if exact is not None:
            return exact
        candidates = self._folded.get(normalized.casefold(), [])
        return candidates[0] if len(candidates) == 1 else None


@lru_cache(maxsize=1)
def netem_vocabulary_dictionary() -> VocabularyDictionary:
    payload = json.loads(_DEFAULT_INDEX_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("vocabulary_dictionary_payload_invalid")
    return VocabularyDictionary(payload)


async def record_vocabulary_learning(
    connection: AsyncConnection,
    *,
    learner_id: str,
    entry: VocabularyDictionaryEntry,
    increment: bool,
) -> int:
    """Record one distinct explanation view, or refresh a replay's current count."""

    now = datetime.now(UTC)
    values = {
        "learner_id": learner_id,
        "dictionary_version": entry.dictionary_version,
        "word_sequence": entry.sequence,
        "headword": entry.headword,
        "learning_count": 1,
        "first_learned_at": now,
        "last_learned_at": now,
        "updated_at": now,
    }
    statement = pg_insert(tables.learner_vocabulary_states).values(**values)
    if increment:
        count = await connection.scalar(
            statement.on_conflict_do_update(
                index_elements=["learner_id", "dictionary_version", "word_sequence"],
                set_={
                    "headword": entry.headword,
                    "learning_count": tables.learner_vocabulary_states.c.learning_count + 1,
                    "last_learned_at": now,
                    "updated_at": now,
                },
            ).returning(tables.learner_vocabulary_states.c.learning_count)
        )
    else:
        await connection.execute(
            statement.on_conflict_do_nothing(
                index_elements=["learner_id", "dictionary_version", "word_sequence"]
            )
        )
        count = await connection.scalar(
            sa.select(tables.learner_vocabulary_states.c.learning_count).where(
                tables.learner_vocabulary_states.c.learner_id == learner_id,
                tables.learner_vocabulary_states.c.dictionary_version == entry.dictionary_version,
                tables.learner_vocabulary_states.c.word_sequence == entry.sequence,
            )
        )
    if not isinstance(count, int) or count < 1:
        raise RuntimeError("vocabulary_learning_count_missing")
    return count
