import asyncio

import pytest
from binnagent_agent.agents.obsidian_inbox_organizer import (
    InboxAdapterResult,
    InboxClassificationOutput,
    InboxNote,
    ObsidianInboxOrganizerAgent,
)


def _note(context_id: str, declared_kind: str) -> InboxNote:
    return InboxNote(
        context_id=context_id,
        title="Although",
        source_key=f"BinnAgentX/00-Inbox/{context_id}.md",
        tags=("grammar",),
        excerpt="Although introduces a concession before the main claim.",
        declared_kind=declared_kind,
    )


@pytest.mark.asyncio
async def test_agent_fails_closed_without_an_intent_classification_adapter() -> None:
    decision = await ObsidianInboxOrganizerAgent(None, timeout_seconds=1).classify(
        (_note("explicit", "grammar"), _note("ambiguous", "reading_skill"))
    )

    assert decision.classifications == ()


class StubAdapter:
    async def classify(self, _: tuple[InboxNote, ...]) -> InboxAdapterResult:
        return InboxAdapterResult(
            output=InboxClassificationOutput.model_validate(
                {
                    "classifications": [
                        {"context_id": "valid", "kind": "grammar"},
                        {"context_id": "duplicate", "kind": "grammar"},
                        {"context_id": "duplicate", "kind": "reading_skill"},
                        {"context_id": "invented", "kind": "vocabulary"},
                    ]
                }
            ),
            prompt_version="v7",
        )


@pytest.mark.asyncio
async def test_agent_rejects_unknown_and_conflicting_duplicate_context_ids() -> None:
    decision = await ObsidianInboxOrganizerAgent(StubAdapter(), timeout_seconds=1).classify(
        (_note("valid", "reading_skill"), _note("duplicate", "reading_skill"))
    )

    assert [(item.context_id, item.kind) for item in decision.classifications] == [
        ("valid", "grammar")
    ]
    assert decision.prompt_version == "v7"


class SlowAdapter:
    async def classify(self, _: tuple[InboxNote, ...]) -> InboxAdapterResult:
        await asyncio.sleep(0.05)
        raise AssertionError("unreachable")


@pytest.mark.asyncio
async def test_agent_fails_closed_when_classification_times_out() -> None:
    decision = await ObsidianInboxOrganizerAgent(SlowAdapter(), timeout_seconds=0.001).classify(
        (_note("ambiguous", "reading_skill"),)
    )

    assert decision.classifications == ()


class RecordingBatchAdapter:
    def __init__(self) -> None:
        self.batch_sizes: list[int] = []

    async def classify(self, notes: tuple[InboxNote, ...]) -> InboxAdapterResult:
        self.batch_sizes.append(len(notes))
        return InboxAdapterResult(
            output=InboxClassificationOutput(
                classifications=[
                    {"context_id": note.context_id, "kind": "grammar"} for note in notes
                ]
            ),
            prompt_version="v8",
        )


@pytest.mark.asyncio
async def test_agent_batches_every_inbox_note_through_intent_classification() -> None:
    adapter = RecordingBatchAdapter()
    notes = tuple(_note(f"note-{index}", "reading_skill") for index in range(23))

    decision = await ObsidianInboxOrganizerAgent(
        adapter,
        timeout_seconds=1,
        batch_size=10,
    ).classify(notes)

    assert sorted(adapter.batch_sizes) == [3, 10, 10]
    assert len(decision.classifications) == 23
    assert decision.prompt_version == "v8"
