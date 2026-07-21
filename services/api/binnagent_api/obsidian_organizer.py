"""Login-triggered, plugin-executed organization of the learner's Obsidian Inbox."""

from __future__ import annotations

from datetime import UTC, datetime
from hashlib import sha256
from typing import Any
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.prompt_runtime import prompt_runtime
from binnagent_api.vertical_slice import tables

PROMPT_ID = "obsidian.inbox_organize"
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
    now = datetime.now(UTC)
    trigger_key = f"login:{sha256(session_token.encode()).hexdigest()}"
    await connection.execute(
        pg_insert(tables.obsidian_organizer_runs)
        .values(
            run_id=f"organizer_{uuid4().hex}",
            learner_id=learner_id,
            trigger_type="login",
            trigger_key=trigger_key,
            status="queued",
            prompt_id=PROMPT_ID,
            prompt_version="v1",
            plan=[],
            error_code=None,
            created_at=now,
            planned_at=None,
            completed_at=None,
        )
        .on_conflict_do_nothing(index_elements=["trigger_key"])
    )


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
        return {"run_id": str(run["run_id"]), "actions": list(run["plan"])}

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
    schema = {
        "type": "object",
        "properties": {
            "actions": {
                "type": "array",
                "items": {"type": "object", "required": ["source_key", "category"]},
            }
        },
    }
    rendered = await prompt_runtime.resolve(PROMPT_ID, {"output_schema": schema})
    actions = [
        {
            "action_id": sha256(f"{run['run_id']}:{row['context_id']}".encode()).hexdigest()[:24],
            "source_key": str(row["source_key"]),
            "target_folder": _TARGET_BY_KIND[str(row["asset_kind"])],
            "kind": str(row["asset_kind"]),
            "reason": "kind_metadata",
        }
        for row in rows
        if str(row["asset_kind"]) in _TARGET_BY_KIND
    ]
    now = datetime.now(UTC)
    status = "planned" if actions else "noop"
    await connection.execute(
        tables.obsidian_organizer_runs.update()
        .where(tables.obsidian_organizer_runs.c.run_id == run["run_id"])
        .values(
            status=status,
            prompt_version=rendered.prompt_version,
            plan=actions,
            planned_at=now,
            completed_at=now if status == "noop" else None,
        )
    )
    return {"run_id": str(run["run_id"]), "actions": actions} if actions else None


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
