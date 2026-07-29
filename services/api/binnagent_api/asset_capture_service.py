"""Durable semantic write gate for structured learning-asset captures."""

from __future__ import annotations

import asyncio
import json
import re
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any
from uuid import UUID

import sqlalchemy as sa
from binnagent_agent.agents.knowledge_extractor import (
    AssetWriteGateOutput,
    create_asset_write_gate,
)
from binnagent_agent.workflows import GRAPH_VERSION, stable_thread_id
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.asset_content_denoiser import (
    AssetCaptureProjection,
    AssetWriteDecision,
    LearningAssetCapture,
    project_asset_capture,
)
from binnagent_api.database import get_engine
from binnagent_api.knowledge_extraction_service import (
    longcat_knowledge_adapter,
    model_from_settings,
)
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

WRITE_GATE_VERSION = "learning-asset-write-gate-v1"


async def enqueue_asset_capture_organization(
    connection: AsyncConnection,
    *,
    learner_id: str,
    asset_id: str,
    capture: LearningAssetCapture,
    captured_at: datetime,
) -> tuple[str, str]:
    """Feed a learner capture into the existing knowledge-organization workflow."""

    content = serialize_asset_capture_source(capture)
    content_hash = sha256(content.encode()).hexdigest()
    source_record_id = f"knowledge_source_asset_{sha256(asset_id.encode()).hexdigest()[:36]}"
    run_id = f"organizer_asset_{sha256(asset_id.encode()).hexdigest()[:32]}"
    await connection.execute(
        pg_insert(tables.knowledge_source_records)
        .values(
            source_record_id=source_record_id,
            learner_id=learner_id,
            provider="learning_asset_capture",
            connection_id="internal_learning_asset_capture",
            source_key=f"asset:{asset_id}",
            content_hash=content_hash,
            source_modified_at=captured_at,
            authorized_scope=["learning_asset_capture"],
            captured_content_ref=f"db://knowledge_source_payloads/{source_record_id}",
            supersedes_source_record_id=None,
            captured_at=captured_at,
        )
        .on_conflict_do_nothing(index_elements=["source_record_id"])
    )
    await connection.execute(
        pg_insert(tables.knowledge_source_payloads)
        .values(
            source_record_id=source_record_id,
            content=content,
            created_at=captured_at,
        )
        .on_conflict_do_nothing(index_elements=["source_record_id"])
    )
    await connection.execute(
        pg_insert(tables.obsidian_organizer_runs)
        .values(
            run_id=run_id,
            learner_id=learner_id,
            trigger_type="asset_capture",
            trigger_key=f"asset_capture:{asset_id}",
            status="planned",
            prompt_id="learning_asset_write_gate",
            prompt_version=WRITE_GATE_VERSION,
            plan=[],
            error_code=None,
            knowledge_status="extracting",
            runtime_kind="langgraph",
            graph_thread_id=stable_thread_id("knowledge-organization", run_id),
            graph_version=GRAPH_VERSION,
            knowledge_claimed_by=None,
            knowledge_lease_expires_at=None,
            knowledge_attempt_count=0,
            source_record_ids=[source_record_id],
            candidate_ids=[],
            proposal_ids=[],
            created_at=captured_at,
            planned_at=captured_at,
            completed_at=None,
        )
        .on_conflict_do_nothing(index_elements=["trigger_key"])
    )
    return source_record_id, run_id


def serialize_asset_capture_source(capture: LearningAssetCapture) -> str:
    blocks: list[str] = []
    for segment in capture.segments:
        attributes = [
            f"id={segment.segment_id}",
            f"role={segment.role.value}",
            f"origin={segment.origin}",
        ]
        if segment.hint_level is not None:
            attributes.append(f"hint_level={segment.hint_level}")
        blocks.append(f"[segment {' '.join(attributes)}]\n{segment.content}")
    return "\n\n".join(blocks)


def deserialize_asset_capture_source(content: str) -> LearningAssetCapture:
    segments: list[dict[str, object]] = []
    for match in re.finditer(
        r"\[segment (?P<attrs>[^\]]+)\]\n"
        r"(?P<content>.*?)(?=\n\n\[segment |\Z)",
        content,
        re.S,
    ):
        attributes = dict(
            item.split("=", 1) for item in match.group("attrs").split() if "=" in item
        )
        segment: dict[str, object] = {
            "segment_id": attributes["id"],
            "role": attributes["role"],
            "origin": attributes["origin"],
            "content": match.group("content"),
        }
        if "hint_level" in attributes:
            segment["hint_level"] = int(attributes["hint_level"])
        segments.append(segment)
    return LearningAssetCapture.model_validate(
        {
            "schema_version": "learning-asset-capture/v1",
            "segments": segments,
        }
    )


async def refine_pending_asset_capture(
    *,
    message_id: UUID,
    asset_id: str,
    payload: dict[str, Any],
) -> str:
    """Refine one capture outbox payload before its existing export path runs."""

    source_record_id = payload.get("capture_source_record_id")
    if not isinstance(source_record_id, str):
        return "ready"
    async with get_engine().connect() as connection:
        raw_content = await connection.scalar(
            sa.select(tables.knowledge_source_payloads.c.content).where(
                tables.knowledge_source_payloads.c.source_record_id == source_record_id
            )
        )
    if not isinstance(raw_content, str):
        raise RuntimeError("asset_capture_source_payload_missing")
    capture = deserialize_asset_capture_source(raw_content)
    baseline = project_asset_capture(capture)
    output = await _write_gate_output(
        message_id=message_id,
        asset_id=asset_id,
        capture=capture,
        baseline=baseline,
    )
    projection = _guarded_projection(capture, baseline, output)
    now = datetime.now(UTC)
    updated_payload = {
        **payload,
        "initial_content": projection.content,
        "write_decision": projection.model_dump(mode="json", exclude={"content"}),
        "write_gate_version": WRITE_GATE_VERSION,
    }
    content_hash = (
        sha256(projection.content.encode()).hexdigest() if projection.content is not None else None
    )
    projection_id = (
        "asset_projection_"
        + sha256(f"{asset_id}:{source_record_id}:{WRITE_GATE_VERSION}".encode()).hexdigest()[:40]
    )
    async with get_engine().begin() as connection:
        learner_id = await connection.scalar(
            sa.select(tables.learning_asset_index.c.learner_id).where(
                tables.learning_asset_index.c.asset_id == asset_id
            )
        )
        if not isinstance(learner_id, str):
            raise RuntimeError("asset_capture_owner_missing")
        await connection.execute(
            pg_insert(tables.learning_asset_content_projections)
            .values(
                projection_id=projection_id,
                asset_id=asset_id,
                learner_id=learner_id,
                source_record_id=source_record_id,
                schema_version=WRITE_GATE_VERSION,
                decision=projection.decision.value,
                reason_codes=projection.reason_codes,
                retained_segment_ids=projection.retained_segment_ids,
                content=projection.content,
                content_hash=content_hash,
                created_at=now,
            )
            .on_conflict_do_nothing(constraint="uq_asset_content_projection_source")
        )
    if projection.decision is AssetWriteDecision.NOOP:
        async with get_engine().begin() as connection:
            await connection.execute(
                tables.outbox_messages.update()
                .where(tables.outbox_messages.c.message_id == message_id)
                .values(payload=updated_payload)
            )
            await connection.execute(
                tables.learning_asset_index.update()
                .where(tables.learning_asset_index.c.asset_id == asset_id)
                .values(
                    sync_status="error",
                    sync_error_code="content_filtered_noop",
                    updated_at=now,
                )
            )
        return "filtered"
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.outbox_messages.update()
            .where(tables.outbox_messages.c.message_id == message_id)
            .values(payload=updated_payload)
        )
    return "ready"


async def _write_gate_output(
    *,
    message_id: UUID,
    asset_id: str,
    capture: LearningAssetCapture,
    baseline: AssetCaptureProjection,
) -> AssetWriteGateOutput:
    settings = get_settings()
    model = model_from_settings(settings)
    longcat = longcat_knowledge_adapter(settings)
    if model is None and longcat is None:
        return AssetWriteGateOutput(
            decision=baseline.decision.value,
            retained_segment_ids=baseline.retained_segment_ids,
            reason_codes=baseline.reason_codes,
            confidence=1,
        )
    request_payload = capture.model_dump(mode="json")
    request_hash = sha256(
        f"{WRITE_GATE_VERSION}:{json.dumps(request_payload, sort_keys=True)}".encode()
    ).hexdigest()
    invocation_key = sha256(f"asset-write-gate:{message_id}:{request_hash}".encode()).hexdigest()
    cached = await _reserve_or_load(
        invocation_key=invocation_key,
        asset_id=asset_id,
        request_hash=request_hash,
    )
    if cached is not None:
        return AssetWriteGateOutput.model_validate(cached)
    try:
        source = (
            "<asset_capture>\n"
            + json.dumps(request_payload, ensure_ascii=False)
            + "\n</asset_capture>"
        )
        if longcat is not None:
            output = await longcat.decide_write(source)
        else:
            if model is None:
                raise RuntimeError("asset_write_gate_model_missing")
            result = await asyncio.wait_for(
                create_asset_write_gate(model).run(source),
                timeout=settings.model_timeout_seconds,
            )
            output = result.output
    except Exception:
        await _release(invocation_key)
        return AssetWriteGateOutput(
            decision=baseline.decision.value,
            retained_segment_ids=baseline.retained_segment_ids,
            reason_codes=[*baseline.reason_codes, "model_gate_fallback"],
            confidence=0,
        )
    await _complete(invocation_key, output)
    return output


def _guarded_projection(
    capture: LearningAssetCapture,
    baseline: AssetCaptureProjection,
    output: AssetWriteGateOutput,
) -> AssetCaptureProjection:
    valid_ids = {segment.segment_id for segment in capture.segments}
    retained_ids = list(dict.fromkeys(output.retained_segment_ids))
    if not retained_ids or any(segment_id not in valid_ids for segment_id in retained_ids):
        return baseline.model_copy(
            update={"reason_codes": [*baseline.reason_codes, "invalid_model_selection_ignored"]}
        )
    selected = capture.model_copy(
        update={
            "segments": [
                segment for segment in capture.segments if segment.segment_id in retained_ids
            ]
        }
    )
    selected_projection = project_asset_capture(selected)
    requested = AssetWriteDecision(output.decision)
    if (
        requested is AssetWriteDecision.KEEP
        and selected_projection.decision is AssetWriteDecision.REVIEW
    ):
        requested = AssetWriteDecision.REVIEW
    guarded_reason_codes = list(selected_projection.reason_codes)
    if (
        requested is AssetWriteDecision.NOOP
        and selected_projection.decision is not AssetWriteDecision.NOOP
    ):
        requested = AssetWriteDecision.REVIEW
        guarded_reason_codes.append("model_noop_requires_review")
    return selected_projection.model_copy(
        update={
            "decision": requested,
            "reason_codes": list(dict.fromkeys([*guarded_reason_codes, *output.reason_codes])),
        }
    )


async def _reserve_or_load(
    *,
    invocation_key: str,
    asset_id: str,
    request_hash: str,
) -> dict[str, Any] | None:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        inserted = await connection.execute(
            pg_insert(tables.model_invocation_ledger)
            .values(
                invocation_key=invocation_key,
                tool_name="learning_asset.write_gate",
                workflow_run_id=asset_id,
                task_id=asset_id,
                request_hash=request_hash,
                status="pending",
                response_payload=None,
                output_hash=None,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(index_elements=["invocation_key"])
        )
        if inserted.rowcount:
            return None
        row = (
            (
                await connection.execute(
                    sa.select(tables.model_invocation_ledger).where(
                        tables.model_invocation_ledger.c.invocation_key == invocation_key
                    )
                )
            )
            .mappings()
            .one()
        )
        if row["request_hash"] != request_hash:
            raise RuntimeError("asset_write_gate_invocation_hash_mismatch")
        if row["status"] == "completed" and isinstance(row["response_payload"], dict):
            return dict(row["response_payload"])
        if row["updated_at"] <= now - timedelta(minutes=5):
            await connection.execute(
                tables.model_invocation_ledger.update()
                .where(tables.model_invocation_ledger.c.invocation_key == invocation_key)
                .values(updated_at=now)
            )
            return None
    raise RuntimeError("asset_write_gate_invocation_in_progress")


async def _complete(invocation_key: str, output: AssetWriteGateOutput) -> None:
    payload = output.model_dump(mode="json")
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.model_invocation_ledger.update()
            .where(tables.model_invocation_ledger.c.invocation_key == invocation_key)
            .values(
                status="completed",
                response_payload=payload,
                output_hash=sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest(),
                updated_at=datetime.now(UTC),
            )
        )


async def _release(invocation_key: str) -> None:
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.model_invocation_ledger.delete().where(
                tables.model_invocation_ledger.c.invocation_key == invocation_key,
                tables.model_invocation_ledger.c.status == "pending",
            )
        )
