"""Login-triggered, plugin-executed organization of the learner's Obsidian Inbox."""

from __future__ import annotations

from datetime import UTC, datetime
from hashlib import sha256
from typing import Any
from uuid import uuid4

import sqlalchemy as sa
from binnagent_agent.agents.obsidian_inbox_organizer import (
    OBSIDIAN_INBOX_ORGANIZER_PROMPT_ID,
    OBSIDIAN_INBOX_ORGANIZER_PROMPT_VERSION,
    InboxNote,
    ObsidianInboxOrganizerAgent,
)
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.model_adapters import inbox_classification_adapter
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

_INBOX_PREFIX = "BinnAgentX/00-Inbox/"
_TARGET_BY_KIND = {
    "vocabulary": "BinnAgentX/01-Vocabulary",
    "grammar": "BinnAgentX/02-Grammar",
    "reading_skill": "BinnAgentX/03-Reading",
    "exam_skill": "BinnAgentX/03-Reading",
    "writing_expression": "BinnAgentX/04-Writing",
    "writing_skill": "BinnAgentX/04-Writing",
}


async def enqueue_login_organization(
    connection: AsyncConnection,
    *,
    learner_id: str,
    session_token: str,
) -> None:
    await _enqueue_organization(
        connection,
        learner_id=learner_id,
        trigger_type="login",
        trigger_key=f"login:{sha256(session_token.encode()).hexdigest()}",
    )


async def enqueue_manual_organization(
    connection: AsyncConnection,
    *,
    learner_id: str,
) -> tuple[str, str]:
    active = (
        (
            await connection.execute(
                sa.select(
                    tables.obsidian_organizer_runs.c.run_id,
                    tables.obsidian_organizer_runs.c.status,
                )
                .where(
                    tables.obsidian_organizer_runs.c.learner_id == learner_id,
                    tables.obsidian_organizer_runs.c.status.in_(("queued", "planned")),
                )
                .order_by(tables.obsidian_organizer_runs.c.created_at)
                .limit(1)
                .with_for_update()
            )
        )
        .mappings()
        .one_or_none()
    )
    if active is not None:
        return str(active["run_id"]), str(active["status"])
    run_id = await _enqueue_organization(
        connection,
        learner_id=learner_id,
        trigger_type="manual",
        trigger_key=f"manual:{uuid4().hex}",
    )
    return run_id, "queued"


async def _enqueue_organization(
    connection: AsyncConnection,
    *,
    learner_id: str,
    trigger_type: str,
    trigger_key: str,
) -> str:
    now = datetime.now(UTC)
    run_id = f"organizer_{uuid4().hex}"
    await connection.execute(
        pg_insert(tables.obsidian_organizer_runs)
        .values(
            run_id=run_id,
            learner_id=learner_id,
            trigger_type=trigger_type,
            trigger_key=trigger_key,
            status="queued",
            prompt_id=OBSIDIAN_INBOX_ORGANIZER_PROMPT_ID,
            prompt_version=OBSIDIAN_INBOX_ORGANIZER_PROMPT_VERSION,
            plan=[],
            error_code=None,
            created_at=now,
            planned_at=None,
            completed_at=None,
        )
        .on_conflict_do_nothing(index_elements=["trigger_key"])
    )
    return run_id


async def plan_pending_organization(
    connection: AsyncConnection,
    *,
    learner_id: str,
    connection_id: str,
) -> dict[str, Any] | None:
    run = (
        (
            await connection.execute(
                sa.select(tables.obsidian_organizer_runs)
                .where(
                    tables.obsidian_organizer_runs.c.learner_id == learner_id,
                    tables.obsidian_organizer_runs.c.status.in_(("queued", "planned")),
                )
                .order_by(tables.obsidian_organizer_runs.c.created_at)
                .limit(1)
                .with_for_update()
            )
        )
        .mappings()
        .one_or_none()
    )
    if run is None:
        return None
    if run["status"] == "planned":
        actions = list(run["plan"])
        return {
            "run_id": str(run["run_id"]),
            "status": "planned",
            "inbox_count": len(actions),
            "classified_count": len(actions),
            "actions": actions,
        }
    rows = (
        (
            await connection.execute(
                sa.select(tables.obsidian_learning_context).where(
                    tables.obsidian_learning_context.c.learner_id == learner_id,
                    tables.obsidian_learning_context.c.connection_id == connection_id,
                    tables.obsidian_learning_context.c.source_key.startswith(_INBOX_PREFIX),
                )
            )
        )
        .mappings()
        .all()
    )
    settings = get_settings()
    decision = await ObsidianInboxOrganizerAgent(
        inbox_classification_adapter(settings),
        timeout_seconds=settings.model_timeout_seconds,
    ).classify(
        tuple(
            InboxNote(
                context_id=str(row["context_id"]),
                title=str(row["title"]),
                source_key=str(row["source_key"]),
                tags=tuple(str(tag) for tag in row["tags"]),
                excerpt=str(row["excerpt"]),
                declared_kind=str(row["asset_kind"]),
            )
            for row in rows
        )
    )
    classifications = {item.context_id: item.kind for item in decision.classifications}
    asset_id_by_context = {str(row["context_id"]): str(row["asset_id"]) for row in rows}
    for context_id, kind in classifications.items():
        await connection.execute(
            tables.obsidian_learning_context.update()
            .where(tables.obsidian_learning_context.c.context_id == context_id)
            .values(asset_kind=kind)
        )
        await connection.execute(
            tables.learning_asset_index.update()
            .where(
                tables.learning_asset_index.c.asset_id == asset_id_by_context[context_id],
                tables.learning_asset_index.c.learner_id == learner_id,
            )
            .values(asset_kind=kind)
        )
    actions = [
        {
            "action_id": sha256(f"{run['run_id']}:{row['context_id']}".encode()).hexdigest()[:24],
            "source_key": str(row["source_key"]),
            "target_folder": _TARGET_BY_KIND[classifications[str(row["context_id"])]],
            "kind": classifications[str(row["context_id"])],
            "reason": "inbox_organizer_agent",
        }
        for row in rows
        if str(row["context_id"]) in classifications
    ]
    now = datetime.now(UTC)
    # A partially classified Inbox must be retried as one plan on a later sync.
    # Otherwise acknowledging only the resolved subset would strand the rest.
    classification_complete = len(actions) == len(rows)
    status = "planned" if actions and classification_complete else "queued" if rows else "noop"
    persisted_actions = actions if status == "planned" else []
    await connection.execute(
        tables.obsidian_organizer_runs.update()
        .where(tables.obsidian_organizer_runs.c.run_id == run["run_id"])
        .values(
            status=status,
            prompt_version=decision.prompt_version or str(run["prompt_version"]),
            plan=persisted_actions,
            planned_at=now if status in {"planned", "noop"} else None,
            completed_at=now if status == "noop" else None,
        )
    )
    return {
        "run_id": str(run["run_id"]),
        "status": status,
        "inbox_count": len(rows),
        "classified_count": len(actions),
        "actions": persisted_actions,
    }


async def complete_organization(
    connection: AsyncConnection,
    *,
    learner_id: str,
    run_id: str,
    completed_action_ids: set[str],
) -> bool:
    row = (
        (
            await connection.execute(
                sa.select(tables.obsidian_organizer_runs).where(
                    tables.obsidian_organizer_runs.c.run_id == run_id,
                    tables.obsidian_organizer_runs.c.learner_id == learner_id,
                )
            )
        )
        .mappings()
        .one_or_none()
    )
    if row is None or row["status"] not in {"planned", "completed"}:
        return False
    expected = {str(item["action_id"]) for item in row["plan"]}
    if completed_action_ids != expected:
        return False
    await connection.execute(
        tables.obsidian_organizer_runs.update()
        .where(tables.obsidian_organizer_runs.c.run_id == run_id)
        .values(status="completed", completed_at=datetime.now(UTC))
    )
    return True
