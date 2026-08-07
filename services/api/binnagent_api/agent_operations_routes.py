"""Read-only operational projections for Agent invocations and event timelines."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any, Literal

import httpx2
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.database import get_engine
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

agent_operations_router = APIRouter(prefix="/v1/operations", tags=["agent-operations"])


class InvocationView(BaseModel):
    source: Literal["model_tool", "tool"]
    invocation_key: str
    tool_name: str
    workflow_run_id: str
    task_id: str | None
    status: str
    audit_event_id: str | None
    purpose: str | None
    adapter: str | None
    prompt_version: str | None
    outcome: str | None
    is_remote: bool | None
    estimated_cost_usd: Decimal
    actual_cost_usd: Decimal
    latency_ms: int | None
    used_fallback: bool
    reason_code: str | None
    created_at: datetime
    updated_at: datetime


class InvocationMetricsView(BaseModel):
    total_invocations: int
    model_invocations: int
    tool_invocations: int
    fallback_count: int
    actual_cost_usd: Decimal
    average_latency_ms: int


class InvocationPageView(BaseModel):
    items: list[InvocationView]
    metrics: InvocationMetricsView
    page: int
    page_size: int
    total_items: int
    total_pages: int


class OperationsTimelineItemView(BaseModel):
    kind: Literal["audit", "domain_event", "idempotency", "outbox"]
    record_id: str
    name: str
    status: str | None
    aggregate_id: str | None
    invocation_key: str | None
    version: int | None
    occurred_at: datetime


class OperationsTimelineView(BaseModel):
    workflow_run_id: str
    items: list[OperationsTimelineItemView]


class OperationalTraceView(BaseModel):
    trace_id: str
    name: str
    environment: str | None
    metadata: dict[str, str | int | float | bool | None]
    observation_count: int
    latency_ms: int
    total_cost_usd: Decimal
    timestamp: datetime
    updated_at: datetime
    evidence_url: str


class OperationalTracePageView(BaseModel):
    items: list[OperationalTraceView]
    page: int
    page_size: int
    total_items: int
    total_pages: int


def _search_filter(
    columns: tuple[sa.ColumnElement[str], ...], query: str
) -> sa.ColumnElement[bool] | None:
    normalized = query.strip()
    if not normalized:
        return None
    pattern = f"%{normalized}%"
    return sa.or_(*(column.ilike(pattern) for column in columns))


_CONTROL_TRACE_METADATA = frozenset(
    {
        "project_key",
        "operation",
        "provider",
        "provider_attempt",
        "provider_attempt_limit",
        "workflow_run_id",
        "task_id",
        "material_id",
        "run_id",
        "asset_id",
        "message_id",
        "analysis_mode",
        "selection_scope",
        "has_follow_up",
        "generation_index",
        "context_count",
        "source_count",
        "note_count",
        "paragraph_count",
        "source_kind",
        "runtime_kind",
        "generation_attempt",
        "repair_attempt",
        "prompt_id",
        "prompt_version",
    }
)


@agent_operations_router.get("/traces", response_model=OperationalTracePageView)
async def list_operational_traces(
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> OperationalTracePageView:
    settings = get_settings()
    if not (
        settings.langfuse_enabled and settings.langfuse_public_key and settings.langfuse_secret_key
    ):
        return OperationalTracePageView(
            items=[], page=page, page_size=page_size, total_items=0, total_pages=1
        )
    try:
        async with httpx2.AsyncClient(
            base_url=settings.langfuse_base_url.rstrip("/"),
            timeout=5,
            auth=httpx2.BasicAuth(
                settings.langfuse_public_key.get_secret_value(),
                settings.langfuse_secret_key.get_secret_value(),
            ),
        ) as client:
            response = await client.get(
                "/api/public/traces",
                params={"page": page, "limit": page_size},
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx2.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="langfuse_trace_projection_unavailable",
        ) from exc
    data = payload.get("data", []) if isinstance(payload, dict) else []
    meta = payload.get("meta", {}) if isinstance(payload, dict) else {}
    items = [_operational_trace_view(row, settings.langfuse_external_url) for row in data]
    return OperationalTracePageView(
        items=items,
        page=int(meta.get("page", page)),
        page_size=int(meta.get("limit", page_size)),
        total_items=int(meta.get("totalItems", len(items))),
        total_pages=max(1, int(meta.get("totalPages", 1))),
    )


def _operational_trace_view(row: Any, external_url: str) -> OperationalTraceView:
    if not isinstance(row, dict):
        raise HTTPException(status_code=502, detail="langfuse_trace_projection_invalid")
    raw_metadata = row.get("metadata")
    metadata = {
        str(key): value
        for key, value in (raw_metadata.items() if isinstance(raw_metadata, dict) else [])
        if key in _CONTROL_TRACE_METADATA
        and (value is None or isinstance(value, (str, int, float, bool)))
    }
    trace_id = str(row["id"])
    observations = row.get("observations")
    return OperationalTraceView(
        trace_id=trace_id,
        name=str(row.get("name") or "unnamed_trace"),
        environment=(str(row["environment"]) if row.get("environment") else None),
        metadata=metadata,
        observation_count=len(observations) if isinstance(observations, list) else 0,
        latency_ms=round(float(row.get("latency") or 0) * 1000),
        total_cost_usd=Decimal(str(row.get("totalCost") or 0)),
        timestamp=datetime.fromisoformat(str(row["timestamp"]).replace("Z", "+00:00")),
        updated_at=datetime.fromisoformat(str(row["updatedAt"]).replace("Z", "+00:00")),
        evidence_url=f"{external_url.rstrip('/')}/trace/{trace_id}",
    )


@agent_operations_router.get("/invocations", response_model=InvocationPageView)
async def list_invocations(
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
    workflow_run_id: Annotated[str | None, Query(max_length=128)] = None,
    query: Annotated[str, Query(max_length=128)] = "",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> InvocationPageView:
    model_filters: list[sa.ColumnElement[bool]] = []
    tool_filters: list[sa.ColumnElement[bool]] = []
    if workflow_run_id:
        model_filters.append(tables.model_invocation_ledger.c.workflow_run_id == workflow_run_id)
        tool_filters.append(tables.tool_usage_ledger.c.workflow_run_id == workflow_run_id)
    model_search = _search_filter(
        (
            tables.model_invocation_ledger.c.invocation_key,
            tables.model_invocation_ledger.c.tool_name,
            tables.model_invocation_ledger.c.workflow_run_id,
            tables.model_invocation_ledger.c.task_id,
        ),
        query,
    )
    tool_search = _search_filter(
        (
            tables.tool_usage_ledger.c.invocation_key,
            tables.tool_usage_ledger.c.tool_name,
            tables.tool_usage_ledger.c.workflow_run_id,
            tables.tool_usage_ledger.c.task_id,
        ),
        query,
    )
    if model_search is not None:
        model_filters.append(model_search)
    if tool_search is not None:
        tool_filters.append(tool_search)

    model_data_join = tables.model_invocation_ledger.outerjoin(
        tables.model_invocations,
        tables.model_invocations.c.invocation_key
        == tables.model_invocation_ledger.c.invocation_key,
    )
    model_detail_join = model_data_join.outerjoin(
        tables.audit_events,
        tables.audit_events.c.invocation_key == tables.model_invocation_ledger.c.invocation_key,
    )
    tool_audit_join = tables.tool_usage_ledger.outerjoin(
        tables.audit_events,
        tables.audit_events.c.invocation_key == tables.tool_usage_ledger.c.invocation_key,
    )
    fetch_limit = page * page_size
    async with get_engine().connect() as connection:
        model_total = int(
            await connection.scalar(
                sa.select(sa.func.count())
                .select_from(tables.model_invocation_ledger)
                .where(*model_filters)
            )
            or 0
        )
        tool_total = int(
            await connection.scalar(
                sa.select(sa.func.count())
                .select_from(tables.tool_usage_ledger)
                .where(*tool_filters)
            )
            or 0
        )
        model_metrics = (
            await connection.execute(
                sa.select(
                    sa.func.coalesce(sa.func.sum(tables.model_invocations.c.actual_cost_usd), 0),
                    sa.func.coalesce(sa.func.avg(tables.model_invocations.c.latency_ms), 0),
                    sa.func.count().filter(tables.model_invocations.c.outcome.like("%_fallback")),
                )
                .select_from(model_data_join)
                .where(*model_filters)
            )
        ).one()
        model_rows = (
            (
                await connection.execute(
                    sa.select(
                        tables.model_invocation_ledger,
                        tables.model_invocations.c.purpose,
                        tables.model_invocations.c.adapter,
                        tables.model_invocations.c.prompt_version,
                        tables.model_invocations.c.outcome,
                        tables.model_invocations.c.is_remote,
                        tables.model_invocations.c.estimated_cost_usd,
                        tables.model_invocations.c.actual_cost_usd,
                        tables.model_invocations.c.latency_ms,
                        tables.model_invocations.c.rejection_code,
                        tables.audit_events.c.audit_event_id,
                        tables.audit_events.c.reason_code.label("audit_reason_code"),
                    )
                    .select_from(model_detail_join)
                    .where(*model_filters)
                    .order_by(tables.model_invocation_ledger.c.created_at.desc())
                    .limit(fetch_limit)
                )
            )
            .mappings()
            .all()
        )
        tool_rows = (
            (
                await connection.execute(
                    sa.select(
                        tables.tool_usage_ledger,
                        tables.audit_events.c.audit_event_id,
                        tables.audit_events.c.reason_code.label("audit_reason_code"),
                    )
                    .select_from(tool_audit_join)
                    .where(*tool_filters)
                    .order_by(tables.tool_usage_ledger.c.created_at.desc())
                    .limit(fetch_limit)
                )
            )
            .mappings()
            .all()
        )

    items = [*_model_invocation_views(model_rows), *_tool_invocation_views(tool_rows)]
    items.sort(key=lambda item: item.created_at, reverse=True)
    total_items = model_total + tool_total
    paged = items[(page - 1) * page_size : page * page_size]
    return InvocationPageView(
        items=paged,
        metrics=InvocationMetricsView(
            total_invocations=total_items,
            model_invocations=model_total,
            tool_invocations=tool_total,
            fallback_count=int(model_metrics[2]),
            actual_cost_usd=Decimal(str(model_metrics[0])),
            average_latency_ms=round(float(model_metrics[1])),
        ),
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=max(1, (total_items + page_size - 1) // page_size),
    )


def _model_invocation_views(rows: Sequence[sa.RowMapping]) -> list[InvocationView]:
    return [
        InvocationView(
            source="model_tool",
            invocation_key=str(row["invocation_key"]),
            tool_name=str(row["tool_name"]),
            workflow_run_id=str(row["workflow_run_id"]),
            task_id=str(row["task_id"]),
            status=str(row["audit_reason_code"] or row["status"]),
            audit_event_id=(
                str(row["audit_event_id"]) if row["audit_event_id"] is not None else None
            ),
            purpose=str(row["purpose"]) if row["purpose"] is not None else None,
            adapter=str(row["adapter"]) if row["adapter"] is not None else None,
            prompt_version=(
                str(row["prompt_version"]) if row["prompt_version"] is not None else None
            ),
            outcome=str(row["outcome"]) if row["outcome"] is not None else None,
            is_remote=bool(row["is_remote"]) if row["is_remote"] is not None else None,
            estimated_cost_usd=row["estimated_cost_usd"] or Decimal("0"),
            actual_cost_usd=row["actual_cost_usd"] or Decimal("0"),
            latency_ms=int(row["latency_ms"]) if row["latency_ms"] is not None else None,
            used_fallback=bool(row["outcome"] and str(row["outcome"]).endswith("_fallback")),
            reason_code=(
                str(row["rejection_code"] or row["audit_reason_code"])
                if row["rejection_code"] is not None or row["audit_reason_code"] is not None
                else None
            ),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


def _tool_invocation_views(rows: Sequence[sa.RowMapping]) -> list[InvocationView]:
    return [
        InvocationView(
            source="tool",
            invocation_key=str(row["invocation_key"]),
            tool_name=str(row["tool_name"]),
            workflow_run_id=str(row["workflow_run_id"]),
            task_id=str(row["task_id"]) if row["task_id"] is not None else None,
            status=str(row["audit_reason_code"] or "admitted"),
            audit_event_id=(
                str(row["audit_event_id"]) if row["audit_event_id"] is not None else None
            ),
            purpose=None,
            adapter=None,
            prompt_version=None,
            outcome=None,
            is_remote=None,
            estimated_cost_usd=Decimal("0"),
            actual_cost_usd=Decimal("0"),
            latency_ms=None,
            used_fallback=False,
            reason_code=(
                str(row["audit_reason_code"]) if row["audit_reason_code"] is not None else None
            ),
            created_at=row["created_at"],
            updated_at=row["created_at"],
        )
        for row in rows
    ]


@agent_operations_router.get("/timeline", response_model=OperationsTimelineView)
async def get_operations_timeline(
    workflow_run_id: Annotated[str, Query(min_length=1, max_length=128)],
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> OperationsTimelineView:
    task_ids = sa.select(tables.run_task_refs.c.task_id).where(
        tables.run_task_refs.c.workflow_run_id == workflow_run_id
    )
    aggregate_filter = sa.or_(
        tables.domain_events.c.aggregate_id == workflow_run_id,
        tables.domain_events.c.aggregate_id.in_(task_ids),
    )
    outbox_filter = sa.or_(
        tables.outbox_messages.c.aggregate_id == workflow_run_id,
        tables.outbox_messages.c.aggregate_id.in_(task_ids),
    )
    async with get_engine().connect() as connection:
        audits = (
            (
                await connection.execute(
                    sa.select(tables.audit_events).where(
                        tables.audit_events.c.workflow_run_id == workflow_run_id
                    )
                )
            )
            .mappings()
            .all()
        )
        events = (
            (await connection.execute(sa.select(tables.domain_events).where(aggregate_filter)))
            .mappings()
            .all()
        )
        idempotency = (
            (
                await connection.execute(
                    sa.select(tables.idempotency_records).where(
                        sa.or_(
                            tables.idempotency_records.c.response_reference == workflow_run_id,
                            tables.idempotency_records.c.response_reference.in_(task_ids),
                        )
                    )
                )
            )
            .mappings()
            .all()
        )
        outbox = (
            (await connection.execute(sa.select(tables.outbox_messages).where(outbox_filter)))
            .mappings()
            .all()
        )
    items = [
        *[
            OperationsTimelineItemView(
                kind="audit",
                record_id=str(row["audit_event_id"]),
                name=str(row["action"]),
                status=str(row["reason_code"]),
                aggregate_id=workflow_run_id,
                invocation_key=(
                    str(row["invocation_key"]) if row["invocation_key"] is not None else None
                ),
                version=int(row["target_version"]),
                occurred_at=row["created_at"],
            )
            for row in audits
        ],
        *[
            OperationsTimelineItemView(
                kind="domain_event",
                record_id=str(row["event_id"]),
                name=str(row["event_type"]),
                status=None,
                aggregate_id=str(row["aggregate_id"]),
                invocation_key=None,
                version=int(row["aggregate_version"]),
                occurred_at=row["occurred_at"],
            )
            for row in events
        ],
        *[
            OperationsTimelineItemView(
                kind="idempotency",
                record_id=str(row["idempotency_key"]),
                name=str(row["command_name"]),
                status="recorded",
                aggregate_id=(
                    str(row["response_reference"])
                    if row["response_reference"] is not None
                    else None
                ),
                invocation_key=None,
                version=None,
                occurred_at=row["created_at"],
            )
            for row in idempotency
        ],
        *[
            OperationsTimelineItemView(
                kind="outbox",
                record_id=str(row["message_id"]),
                name=str(row["topic"]),
                status=str(row["status"]),
                aggregate_id=str(row["aggregate_id"]),
                invocation_key=None,
                version=None,
                occurred_at=row["occurred_at"],
            )
            for row in outbox
        ],
    ]
    items.sort(key=lambda item: item.occurred_at, reverse=True)
    return OperationsTimelineView(workflow_run_id=workflow_run_id, items=items)
