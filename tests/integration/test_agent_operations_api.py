from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import httpx2
import pytest
import pytest_asyncio
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.main import create_app
from binnagent_api.vertical_slice import tables

pytestmark = pytest.mark.integration
HEADERS = {"X-BinnAgent-Control-Role": "developer_reviewer"}
RUN_ID = "workflow_run_operations_0001"
TASK_ID = "task_operations_0001"
MODEL_KEY = "invocation_operations_model_0001"
TOOL_KEY = "invocation_operations_tool_0001"


@pytest_asyncio.fixture(autouse=True)
async def _operational_records() -> AsyncIterator[None]:
    now = datetime.now(UTC)
    outbox_id = uuid4()
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.model_invocation_ledger.insert().values(
                invocation_key=MODEL_KEY,
                tool_name="reading.analyze_selection.v1",
                workflow_run_id=RUN_ID,
                task_id=TASK_ID,
                request_hash="1" * 64,
                status="completed",
                response_payload={"analysis_id": "redacted"},
                output_hash="2" * 64,
                created_at=now,
                updated_at=now,
            )
        )
        await connection.execute(
            tables.model_invocations.insert().values(
                invocation_id="model_invocation_operations_0001",
                invocation_key=MODEL_KEY,
                workflow_run_id=RUN_ID,
                task_id=TASK_ID,
                input_attempt_version_id="attempt_operations_0001",
                purpose="selection_analysis",
                adapter="fixture",
                prompt_version="reading.selection_analysis@v1",
                outcome="timeout_fallback",
                is_remote=True,
                estimated_cost_usd=Decimal("0.0200"),
                actual_cost_usd=Decimal("0.0200"),
                latency_ms=125,
                output_hash="2" * 64,
                focus="logic",
                evidence_start=0,
                evidence_end=12,
                evidence_hash="3" * 64,
                rejection_code=None,
                created_at=now,
            )
        )
        await connection.execute(
            tables.tool_usage_ledger.insert().values(
                invocation_key=TOOL_KEY,
                tool_name="workflow.advance.v1",
                workflow_run_id=RUN_ID,
                task_id=TASK_ID,
                created_at=now,
            )
        )
        await connection.execute(
            tables.audit_events.insert(),
            [
                {
                    "audit_event_id": "audit_operations_model_0001",
                    "workflow_run_id": RUN_ID,
                    "invocation_key": MODEL_KEY,
                    "actor_type": "learner",
                    "action": "tool.reading.analyze_selection.v1",
                    "reason_code": "succeeded",
                    "target_version": 1,
                    "created_at": now,
                },
                {
                    "audit_event_id": "audit_operations_tool_0001",
                    "workflow_run_id": RUN_ID,
                    "invocation_key": TOOL_KEY,
                    "actor_type": "system",
                    "action": "tool.workflow.advance.v1",
                    "reason_code": "succeeded",
                    "target_version": 2,
                    "created_at": now,
                },
            ],
        )
        await connection.execute(
            tables.domain_events.insert().values(
                event_id="event_operations_0001",
                event_type="vertical_slice_run_advanced",
                aggregate_id=RUN_ID,
                aggregate_version=2,
                payload={"private_text": "not returned"},
                occurred_at=now,
            )
        )
        await connection.execute(
            tables.idempotency_records.insert().values(
                idempotency_key="idempotency_operations_0001",
                command_name="advance_run",
                request_hash="4" * 64,
                response_reference=RUN_ID,
                created_at=now,
            )
        )
        await connection.execute(
            tables.outbox_messages.insert().values(
                message_id=outbox_id,
                topic="run_advanced",
                aggregate_id=RUN_ID,
                payload={"private_text": "not returned"},
                status="pending",
                attempt_count=0,
                occurred_at=now,
                available_at=now,
                processed_at=None,
            )
        )
    yield
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.audit_events.delete().where(tables.audit_events.c.workflow_run_id == RUN_ID)
        )
        await connection.execute(
            tables.model_invocations.delete().where(
                tables.model_invocations.c.workflow_run_id == RUN_ID
            )
        )
        await connection.execute(
            tables.model_invocation_ledger.delete().where(
                tables.model_invocation_ledger.c.workflow_run_id == RUN_ID
            )
        )
        await connection.execute(
            tables.tool_usage_ledger.delete().where(
                tables.tool_usage_ledger.c.workflow_run_id == RUN_ID
            )
        )
        await connection.execute(
            tables.domain_events.delete().where(tables.domain_events.c.aggregate_id == RUN_ID)
        )
        await connection.execute(
            tables.idempotency_records.delete().where(
                tables.idempotency_records.c.response_reference == RUN_ID
            )
        )
        await connection.execute(
            tables.outbox_messages.delete().where(tables.outbox_messages.c.aggregate_id == RUN_ID)
        )
    await dispose_engine()


@pytest.mark.asyncio
async def test_invocation_metrics_and_redacted_operational_timeline() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        unauthorized = await client.get("/control/v1/operations/invocations")
        assert unauthorized.status_code == 403

        response = await client.get(
            "/control/v1/operations/invocations",
            params={"workflow_run_id": RUN_ID},
            headers=HEADERS,
        )
        assert response.status_code == 200, response.text
        payload = response.json()
        assert payload["total_items"] == 2
        assert payload["metrics"] == {
            "total_invocations": 2,
            "model_invocations": 1,
            "tool_invocations": 1,
            "fallback_count": 1,
            "actual_cost_usd": "0.0200",
            "average_latency_ms": 125,
        }
        by_key = {item["invocation_key"]: item for item in payload["items"]}
        assert by_key[MODEL_KEY]["audit_event_id"] == "audit_operations_model_0001"
        assert by_key[MODEL_KEY]["outcome"] == "timeout_fallback"
        assert by_key[TOOL_KEY]["status"] == "succeeded"
        assert "response_payload" not in response.text

        timeline = await client.get(
            "/control/v1/operations/timeline",
            params={"workflow_run_id": RUN_ID},
            headers=HEADERS,
        )
        assert timeline.status_code == 200, timeline.text
        assert {item["kind"] for item in timeline.json()["items"]} == {
            "audit",
            "domain_event",
            "idempotency",
            "outbox",
        }
        assert "private_text" not in timeline.text
