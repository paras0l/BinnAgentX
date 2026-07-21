# ruff: noqa: RUF001

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import httpx2
import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_agent.tools import ToolActorType, ToolContext, ToolStatus, runtime_registry
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.learner_auth import SYNTHETIC_LEARNER_ID
from binnagent_api.main import create_app
from binnagent_api.obsidian_agent_tools import (
    ObsidianReadInput,
    ObsidianWriteInput,
    read_obsidian_learning_context,
    write_obsidian_learning_note,
)
from binnagent_api.prompt_runtime import prompt_runtime
from binnagent_api.vertical_slice import tables

pytestmark = pytest.mark.integration
HEADERS = {"X-BinnAgent-Control-Role": "developer_reviewer"}


@pytest_asyncio.fixture(autouse=True)
async def _release_database_pool() -> AsyncIterator[None]:
    yield
    runtime_registry.set_enabled("obsidian.read_learning_context.v1", True)
    runtime_registry.set_enabled("obsidian.write_learning_note.v1", True)
    await dispose_engine()


@pytest.mark.asyncio
async def test_tool_catalog_policy_and_versioned_prompt_governance() -> None:
    async with get_engine().begin() as connection:
        await connection.execute(sa.delete(tables.agent_memory_events))
        await connection.execute(sa.delete(tables.obsidian_learning_context))
        await connection.execute(sa.delete(tables.obsidian_sync_connections))
        await connection.execute(sa.delete(tables.outbox_messages))
        await connection.execute(sa.delete(tables.learning_evidence))
        await connection.execute(sa.delete(tables.learning_asset_index))
        await connection.execute(sa.delete(tables.control_tool_policies))
        await connection.execute(sa.delete(tables.control_prompts))

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        assert (await client.get("/control/v1/tools")).status_code == 403
        tools = await client.get("/control/v1/tools", headers=HEADERS)
        assert tools.status_code == 200, tools.text
        by_name = {item["name"]: item for item in tools.json()}
        read_tool = by_name["obsidian.read_learning_context.v1"]
        write_tool = by_name["obsidian.write_learning_note.v1"]
        assert read_tool["project_key"] == "binnagentx"
        assert read_tool["source"] == "agent_memory"
        assert write_tool["requires_idempotency_key"] is True

        disabled = await client.patch(
            "/control/v1/tools/obsidian.read_learning_context.v1",
            headers=HEADERS,
            json={"enabled": False, "expected_version": read_tool["policy_version"]},
        )
        assert disabled.status_code == 200, disabled.text
        assert disabled.json()["enabled"] is False
        assert runtime_registry.is_enabled("obsidian.read_learning_context.v1") is False

        conflict = await client.patch(
            "/control/v1/tools/obsidian.read_learning_context.v1",
            headers=HEADERS,
            json={"enabled": True, "expected_version": 1},
        )
        assert conflict.status_code == 409

        prompts = await client.get("/control/v1/prompts", headers=HEADERS)
        assert prompts.status_code == 200, prompts.text
        assert {item["project_key"] for item in prompts.json()} == {"binnagentx"}
        assert "personalized_reading.generate" in {item["prompt_id"] for item in prompts.json()}

        created = await client.post(
            "/control/v1/prompts",
            headers=HEADERS,
            json={
                "prompt_id": "personalized_reading.generate",
                "prompt_version": "v2",
                "owner": "learning_content",
                "purpose": "验证项目隔离的新版个性化阅读模板。",
                "template_text": (
                    "根据 {{contexts}} 和 {{generation_goal}} 生成新阅读，"
                    "并严格返回 {{output_schema}}。"
                ),
                "variables": ["contexts", "generation_goal", "output_schema"],
                "model_policy": {"temperature": 0.3, "max_tokens": 1600},
            },
        )
        assert created.status_code == 201, created.text
        draft = created.json()
        assert draft["status"] == "draft"

        missing = await client.post(
            "/control/v1/prompts/personalized_reading.generate/v2/render",
            headers=HEADERS,
            json={"variables": {"contexts": "note"}},
        )
        assert missing.status_code == 422
        rendered = await client.post(
            "/control/v1/prompts/personalized_reading.generate/v2/render",
            headers=HEADERS,
            json={
                "variables": {
                    "contexts": "note",
                    "generation_goal": "grammar",
                    "output_schema": "json",
                }
            },
        )
        assert rendered.status_code == 200, rendered.text
        assert "note" in rendered.json()["rendered"]

        activated = await client.post(
            "/control/v1/prompts/personalized_reading.generate/v2/activate",
            headers=HEADERS,
            json={"expected_version": draft["version"]},
        )
        assert activated.status_code == 200, activated.text
        assert activated.json()["status"] == "active"
        runtime_prompt = await prompt_runtime.resolve(
            "personalized_reading.generate",
            {
                "contexts": "memory",
                "generation_goal": "grammar",
                "output_schema": "json",
            },
        )
        assert runtime_prompt.prompt_version == "v2"
        assert runtime_prompt.source == "database"
        assert "memory" in runtime_prompt.text
        refreshed = await client.get("/control/v1/prompts", headers=HEADERS)
        states = {
            item["prompt_version"]: item["status"]
            for item in refreshed.json()
            if item["prompt_id"] == "personalized_reading.generate"
        }
        assert states == {"v2": "active", "v1": "archived"}

        reenabled = await client.patch(
            "/control/v1/tools/obsidian.read_learning_context.v1",
            headers=HEADERS,
            json={"enabled": True, "expected_version": disabled.json()["policy_version"]},
        )
        assert reenabled.status_code == 200, reenabled.text

        paired = await client.post("/learner/v1/assets/obsidian-plugin-connections")
        assert paired.status_code == 200, paired.text
        connection_id = paired.json()["connection_id"]
        plugin_headers = {"Authorization": f"Bearer {paired.json()['sync_secret']}"}
        imported = await client.post(
            f"/learner/v1/obsidian-sync/{connection_id}/import",
            headers=plugin_headers,
            json={
                "schema_version": "learning-context/v1",
                "vault_name": "agent-tool-test",
                "entries": [
                    {
                        "source_key": "BinnAgentX/Grammar/contrast.md",
                        "title": "Contrast note",
                        "kind": "grammar",
                        "tags": ["contrast"],
                        "excerpt": "Although introduces a concession before the main claim.",
                        "modified_at": datetime.now(UTC).isoformat(),
                    }
                ],
            },
        )
        assert imported.status_code == 200, imported.text
        async with get_engine().begin() as connection:
            await connection.execute(
                tables.obsidian_learning_context.insert().values(
                    context_id="foreign_memory_context",
                    asset_id="asset_foreign_memory_context",
                    learner_id="learner_other_account",
                    connection_id="foreign_connection",
                    source_key="BinnAgentX/Private/foreign.md",
                    title="Foreign memory",
                    asset_kind="grammar",
                    tags=["private"],
                    excerpt="This must never enter the current learner's Agent memory.",
                    content_hash="f" * 64,
                    source_modified_at=datetime.now(UTC),
                    received_at=datetime.now(UTC),
                )
            )
        context = ToolContext(
            trace_id="trace_agent_tools_0001",
            workflow_run_id="workflow_agent_tools_0001",
            task_id="task_agent_tools_0001",
            learner_id=SYNTHETIC_LEARNER_ID,
            actor_type=ToolActorType.ORCHESTRATOR,
            permission_scopes=frozenset({"obsidian:read", "obsidian:write"}),
            invocation_key="agent_tools_invocation_0001",
            idempotency_key="agent-tools-idempotency-0001",
            deadline_at=datetime.now(UTC) + timedelta(seconds=30),
        )
        read_result = await read_obsidian_learning_context(
            context, ObsidianReadInput(query="Contrast")
        )
        assert read_result.status is ToolStatus.SUCCEEDED
        assert read_result.data is not None
        assert read_result.data.entries[0].title == "Contrast note"
        assert {item.title for item in read_result.data.entries} == {"Contrast note"}

        write_result = await write_obsidian_learning_note(
            context,
            ObsidianWriteInput(
                kind="grammar",
                title="Agent-created contrast note",
                content="Although the evidence changed, the main claim remained cautious.",
                tags=["agent", "contrast"],
            ),
        )
        assert write_result.status is ToolStatus.SUCCEEDED
        assert write_result.data is not None
        assert write_result.data.sync_status == "pending_export"
        replayed_write = await write_obsidian_learning_note(
            context,
            ObsidianWriteInput(
                kind="grammar",
                title="Agent-created contrast note",
                content="Although the evidence changed, the main claim remained cautious.",
                tags=["agent", "contrast"],
            ),
        )
        assert replayed_write.data is not None
        assert replayed_write.data.asset_id == write_result.data.asset_id
        exports = await client.get(
            f"/learner/v1/obsidian-sync/{connection_id}/exports", headers=plugin_headers
        )
        assert exports.status_code == 200, exports.text
        assert write_result.data.asset_id in {item["asset_id"] for item in exports.json()}
        async with get_engine().connect() as connection:
            events = (
                (
                    await connection.execute(
                        sa.select(tables.agent_memory_events).where(
                            tables.agent_memory_events.c.learner_id == SYNTHETIC_LEARNER_ID
                        )
                    )
                )
                .mappings()
                .all()
            )
        assert {str(event["operation"]) for event in events} == {"recall", "remember"}
        assert {str(event["project_key"]) for event in events} == {"binnagentx"}
