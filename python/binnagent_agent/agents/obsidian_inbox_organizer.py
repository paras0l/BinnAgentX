"""Agent decision boundary for organizing untrusted Obsidian Inbox notes."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field

InboxNoteKind = Literal[
    "vocabulary",
    "grammar",
    "writing_expression",
    "reading_skill",
    "exam_skill",
    "writing_skill",
]
OBSIDIAN_INBOX_ORGANIZER_PROMPT_ID = "obsidian.inbox_organize"
OBSIDIAN_INBOX_ORGANIZER_PROMPT_VERSION = "v3"

logger = logging.getLogger("binnagent.obsidian_inbox_organizer_agent")


@dataclass(frozen=True, slots=True)
class InboxNote:
    context_id: str
    title: str
    source_key: str
    tags: tuple[str, ...]
    excerpt: str
    declared_kind: str


class InboxClassification(BaseModel):
    model_config = ConfigDict(extra="forbid")

    context_id: str = Field(min_length=1, max_length=128)
    kind: InboxNoteKind


class InboxClassificationOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    classifications: list[InboxClassification] = Field(default_factory=list, max_length=80)


@dataclass(frozen=True, slots=True)
class InboxAdapterResult:
    output: InboxClassificationOutput
    prompt_version: str | None


class InboxClassificationAdapter(Protocol):
    async def classify(self, notes: tuple[InboxNote, ...]) -> InboxAdapterResult: ...


@dataclass(frozen=True, slots=True)
class InboxOrganizationDecision:
    classifications: tuple[InboxClassification, ...]
    prompt_version: str | None


class ObsidianInboxOrganizerAgent:
    """Classify notes; filesystem movement remains a plugin-owned application action."""

    def __init__(
        self,
        adapter: InboxClassificationAdapter | None,
        *,
        timeout_seconds: float,
        batch_size: int = 10,
        max_concurrency: int = 3,
    ) -> None:
        self._adapter = adapter
        self._timeout_seconds = timeout_seconds
        self._batch_size = max(1, batch_size)
        self._max_concurrency = max(1, max_concurrency)

    async def classify(self, notes: tuple[InboxNote, ...]) -> InboxOrganizationDecision:
        if not notes:
            return InboxOrganizationDecision((), None)
        if self._adapter is None:
            return InboxOrganizationDecision((), None)
        adapter = self._adapter

        batches = tuple(
            notes[index : index + self._batch_size]
            for index in range(0, len(notes), self._batch_size)
        )
        semaphore = asyncio.Semaphore(self._max_concurrency)

        async def classify_batch(
            batch: tuple[InboxNote, ...],
        ) -> InboxAdapterResult | None:
            try:
                async with semaphore:
                    return await asyncio.wait_for(
                        adapter.classify(batch),
                        timeout=self._timeout_seconds,
                    )
            except Exception as exc:
                logger.warning(
                    "inbox organization classification batch unavailable: %s",
                    type(exc).__name__,
                )
                return None

        responses = await asyncio.gather(*(classify_batch(batch) for batch in batches))
        model_classifications = [
            item
            for response in responses
            if response is not None
            for item in response.output.classifications
        ]
        valid_ids = {note.context_id for note in notes}
        counts: dict[str, int] = {}
        for item in model_classifications:
            counts[item.context_id] = counts.get(item.context_id, 0) + 1
        accepted = [
            item
            for item in model_classifications
            if item.context_id in valid_ids and counts[item.context_id] == 1
        ]
        prompt_version = next(
            (
                response.prompt_version
                for response in reversed(responses)
                if response is not None and response.prompt_version
            ),
            None,
        )
        return InboxOrganizationDecision(
            tuple(accepted),
            prompt_version,
        )
