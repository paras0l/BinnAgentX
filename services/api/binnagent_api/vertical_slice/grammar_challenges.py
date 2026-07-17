from dataclasses import dataclass, replace
from datetime import UTC, datetime
from hashlib import sha256
from unicodedata import normalize

import sqlalchemy as sa
from binnagent_domain.vertical_slice.grammar_challenge import (
    GrammarChallenge,
    is_correct_grammar_correction,
    project_grammar_error,
)
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.vertical_slice import tables
from binnagent_api.vertical_slice.schemas import GrammarChallengeView


@dataclass(frozen=True)
class GrammarChallengeState:
    hint_revealed: bool = False
    attempt_count: int = 0
    resolved: bool = False
    last_submission_hash: str | None = None


def grammar_challenge_view(
    challenge: GrammarChallenge,
    state: GrammarChallengeState,
) -> GrammarChallengeView:
    return GrammarChallengeView(
        challenge_id=challenge.challenge_id,
        status="resolved" if state.resolved else "pending",
        attempt_count=state.attempt_count,
        hint_revealed=state.hint_revealed,
        error_type=challenge.error_type if state.hint_revealed else None,
        hint=challenge.hint if state.hint_revealed else None,
    )


async def load_grammar_challenge_state(
    connection: AsyncConnection,
    task_id: str,
    content_version_id: str,
    challenge_id: str,
) -> GrammarChallengeState:
    row = (
        (
            await connection.execute(
                sa.select(tables.task_grammar_challenges).where(
                    tables.task_grammar_challenges.c.task_id == task_id
                )
            )
        )
        .mappings()
        .one_or_none()
    )
    if (
        row is None
        or row["content_version_id"] != content_version_id
        or row["challenge_id"] != challenge_id
    ):
        return GrammarChallengeState()
    return _state_from_row(row)


async def reveal_grammar_challenge_hint(
    connection: AsyncConnection,
    task_id: str,
    content_version_id: str,
    challenge_id: str,
) -> GrammarChallengeState:
    state = await _ensure_state(
        connection,
        task_id,
        content_version_id,
        challenge_id,
    )
    if state.hint_revealed:
        return state
    now = datetime.now(UTC)
    await connection.execute(
        sa.update(tables.task_grammar_challenges)
        .where(tables.task_grammar_challenges.c.task_id == task_id)
        .values(hint_revealed=True, updated_at=now)
    )
    return replace(state, hint_revealed=True)


async def verify_grammar_correction(
    connection: AsyncConnection,
    task_id: str,
    content_version_id: str,
    challenge: GrammarChallenge,
    correction: str,
) -> tuple[GrammarChallengeState, bool]:
    state = await _ensure_state(
        connection,
        task_id,
        content_version_id,
        challenge.challenge_id,
    )
    if state.resolved:
        return state, True
    correct = is_correct_grammar_correction(correction, challenge)
    submission_hash = _submission_hash(correction)
    attempt_count = state.attempt_count + (
        0 if state.last_submission_hash == submission_hash else 1
    )
    now = datetime.now(UTC)
    await connection.execute(
        sa.update(tables.task_grammar_challenges)
        .where(tables.task_grammar_challenges.c.task_id == task_id)
        .values(
            attempt_count=attempt_count,
            resolved=correct,
            last_submission_hash=submission_hash,
            updated_at=now,
            resolved_at=now if correct else None,
        )
    )
    return (
        replace(
            state,
            attempt_count=attempt_count,
            resolved=correct,
            last_submission_hash=submission_hash,
        ),
        correct,
    )


def project_reading_paragraphs(
    raw_paragraphs: list[object],
    challenge: GrammarChallenge,
    state: GrammarChallengeState,
) -> list[tuple[str, str]]:
    projected: list[tuple[str, str]] = []
    for raw in raw_paragraphs:
        if not isinstance(raw, dict):
            continue
        paragraph_id = str(raw.get("paragraph_id", ""))
        text = str(raw.get("text", ""))
        if paragraph_id == challenge.paragraph_id and not state.resolved:
            text = project_grammar_error(text, challenge)
        projected.append((paragraph_id, text))
    return projected


async def _ensure_state(
    connection: AsyncConnection,
    task_id: str,
    content_version_id: str,
    challenge_id: str,
) -> GrammarChallengeState:
    now = datetime.now(UTC)
    await connection.execute(
        pg_insert(tables.task_grammar_challenges)
        .values(
            task_id=task_id,
            content_version_id=content_version_id,
            challenge_id=challenge_id,
            hint_revealed=False,
            attempt_count=0,
            resolved=False,
            last_submission_hash=None,
            created_at=now,
            updated_at=now,
            resolved_at=None,
        )
        .on_conflict_do_nothing(index_elements=[tables.task_grammar_challenges.c.task_id])
    )
    row = (
        (
            await connection.execute(
                sa.select(tables.task_grammar_challenges)
                .where(tables.task_grammar_challenges.c.task_id == task_id)
                .with_for_update()
            )
        )
        .mappings()
        .one()
    )
    if row["content_version_id"] == content_version_id and row["challenge_id"] == challenge_id:
        return _state_from_row(row)
    await connection.execute(
        sa.update(tables.task_grammar_challenges)
        .where(tables.task_grammar_challenges.c.task_id == task_id)
        .values(
            content_version_id=content_version_id,
            challenge_id=challenge_id,
            hint_revealed=False,
            attempt_count=0,
            resolved=False,
            last_submission_hash=None,
            updated_at=now,
            resolved_at=None,
        )
    )
    return GrammarChallengeState()


def _state_from_row(row: RowMapping) -> GrammarChallengeState:
    return GrammarChallengeState(
        hint_revealed=bool(row["hint_revealed"]),
        attempt_count=int(row["attempt_count"]),
        resolved=bool(row["resolved"]),
        last_submission_hash=(
            str(row["last_submission_hash"]) if row["last_submission_hash"] is not None else None
        ),
    )


def _submission_hash(value: str) -> str:
    normalized = " ".join(normalize("NFKC", value).strip().split())
    return sha256(normalized.encode()).hexdigest()
