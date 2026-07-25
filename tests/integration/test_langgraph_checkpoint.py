from typing import TypedDict
from uuid import uuid4

import pytest
from binnagent_agent.workflows import open_postgres_checkpointer, stable_thread_id
from binnagent_api.settings import get_settings
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

pytestmark = pytest.mark.integration


class _CheckpointState(TypedDict, total=False):
    status: str
    reviewer_id: str


@pytest.mark.asyncio
async def test_postgres_checkpointer_persists_interrupt_and_same_thread_resume() -> None:
    def prepare(_state: _CheckpointState) -> dict[str, str]:
        return {"status": "awaiting_review"}

    def review(_state: _CheckpointState) -> dict[str, str]:
        decision = interrupt(
            {
                "kind": "checkpoint_integration_review",
                "allowed_actions": ["approve"],
            }
        )
        if not isinstance(decision, dict) or decision.get("action") != "approve":
            raise ValueError("checkpoint_review_resume_invalid")
        return {
            "status": "completed",
            "reviewer_id": str(decision["reviewer_id"]),
        }

    builder = StateGraph(_CheckpointState)
    builder.add_node("prepare", prepare)  # type: ignore
    builder.add_node("review", review)  # type: ignore
    builder.add_edge(START, "prepare")
    builder.add_edge("prepare", "review")
    builder.add_edge("review", END)

    database_url = get_settings().database_url.get_secret_value()
    async with open_postgres_checkpointer(database_url, setup=True) as saver:
        graph = builder.compile(checkpointer=saver)
        config: RunnableConfig = {
            "configurable": {
                "thread_id": stable_thread_id(
                    "checkpoint-test",
                    f"run_{uuid4().hex}",
                )
            }
        }
        initial: _CheckpointState = {}
        interrupted = await graph.ainvoke(initial, config)
        checkpoint = await saver.aget_tuple(config)

        assert interrupted["status"] == "awaiting_review"
        assert interrupted["__interrupt__"][0].value["kind"] == ("checkpoint_integration_review")
        assert checkpoint is not None

        completed = await graph.ainvoke(
            Command(resume={"action": "approve", "reviewer_id": "integration-reviewer"}),
            config,
        )

        assert completed == {
            "status": "completed",
            "reviewer_id": "integration-reviewer",
        }
        await saver.adelete_thread(str(config["configurable"]["thread_id"]))


@pytest.mark.asyncio
async def test_postgres_checkpoint_resumes_after_checkpointer_process_boundary() -> None:
    def prepare(_state: _CheckpointState) -> dict[str, str]:
        return {"status": "awaiting_review"}

    def review(_state: _CheckpointState) -> dict[str, str]:
        decision = interrupt({"kind": "process_boundary_review"})
        if not isinstance(decision, dict) or decision.get("action") != "approve":
            raise ValueError("process_boundary_resume_invalid")
        return {
            "status": "completed",
            "reviewer_id": str(decision["reviewer_id"]),
        }

    builder = StateGraph(_CheckpointState)
    builder.add_node("prepare", prepare)  # type: ignore
    builder.add_node("review", review)  # type: ignore
    builder.add_edge(START, "prepare")
    builder.add_edge("prepare", "review")
    builder.add_edge("review", END)

    thread_id = stable_thread_id("checkpoint-test", f"restart_{uuid4().hex}")
    config: RunnableConfig = {"configurable": {"thread_id": thread_id}}
    database_url = get_settings().database_url.get_secret_value()
    async with open_postgres_checkpointer(database_url, setup=True) as first_process:
        graph = builder.compile(checkpointer=first_process)
        interrupted = await graph.ainvoke({}, config)
        assert interrupted["__interrupt__"][0].value["kind"] == "process_boundary_review"

    async with open_postgres_checkpointer(database_url) as restarted_process:
        restarted_graph = builder.compile(checkpointer=restarted_process)
        completed = await restarted_graph.ainvoke(
            Command(resume={"action": "approve", "reviewer_id": "restart-reviewer"}),
            config,
        )
        assert completed == {
            "status": "completed",
            "reviewer_id": "restart-reviewer",
        }
        await restarted_process.adelete_thread(thread_id)
