"""Small reproducible checkpoint capacity benchmark with automatic cleanup."""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
from time import perf_counter
from typing import Any, TypedDict
from uuid import uuid4

import sqlalchemy as sa
from binnagent_agent.workflows import open_postgres_checkpointer, stable_thread_id
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.settings import get_settings
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt


class _BenchmarkState(TypedDict, total=False):
    status: str
    graph_version: str


def _percentile(values: list[float], percentile: float) -> float:
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((len(ordered) - 1) * percentile))
    return ordered[index]


async def _storage_bytes() -> int:
    async with get_engine().connect() as connection:
        total = 0
        for name in ("checkpoints", "checkpoint_blobs", "checkpoint_writes"):
            value = await connection.scalar(
                sa.text("SELECT pg_total_relation_size(to_regclass(:name))"),
                {"name": name},
            )
            total += int(value or 0)
        return total


async def benchmark(*, runs: int) -> dict[str, object]:
    def prepare(_state: _BenchmarkState) -> dict[str, str]:
        return {"status": "awaiting_review", "graph_version": "capacity-v1"}

    def review(_state: _BenchmarkState) -> dict[str, str]:
        decision = interrupt({"kind": "capacity_review"})
        if decision != "approve":
            raise ValueError("capacity_review_invalid")
        return {"status": "completed", "graph_version": "capacity-v1"}

    builder = StateGraph(_BenchmarkState)
    builder.add_node("prepare", prepare)  # type: ignore
    builder.add_node("review", review)  # type: ignore
    builder.add_edge(START, "prepare")
    builder.add_edge("prepare", "review")
    builder.add_edge("review", END)

    initial_latencies: list[float] = []
    resume_latencies: list[float] = []
    thread_ids: list[str] = []
    database_url = get_settings().database_url.get_secret_value()
    storage_before = await _storage_bytes()
    checkpoint_count = 0
    try:
        async with open_postgres_checkpointer(database_url) as saver:
            graph = builder.compile(checkpointer=saver)
            for _ in range(runs):
                thread_id = stable_thread_id(
                    "capacity-benchmark",
                    f"run_{uuid4().hex}",
                )
                thread_ids.append(thread_id)
                config: RunnableConfig = {"configurable": {"thread_id": thread_id}}
                started = perf_counter()
                interrupted = await graph.ainvoke(
                    {"status": "queued", "graph_version": "capacity-v1"},
                    config,
                )
                initial_latencies.append((perf_counter() - started) * 1000)
                if not interrupted.get("__interrupt__"):
                    raise RuntimeError("capacity_benchmark_interrupt_missing")
                started = perf_counter()
                completed = await graph.ainvoke(Command[Any](resume="approve"), config)
                resume_latencies.append((perf_counter() - started) * 1000)
                if completed["status"] != "completed":
                    raise RuntimeError("capacity_benchmark_completion_missing")
                async for _checkpoint in saver.alist(config):
                    checkpoint_count += 1
            storage_after = await _storage_bytes()
    finally:
        async with open_postgres_checkpointer(database_url) as saver:
            for thread_id in thread_ids:
                await saver.adelete_thread(thread_id)

    return {
        "runs": runs,
        "checkpoint_count": checkpoint_count,
        "checkpoints_per_run": checkpoint_count / runs,
        "initial_latency_ms": {
            "mean": statistics.fmean(initial_latencies),
            "p50": _percentile(initial_latencies, 0.50),
            "p95": _percentile(initial_latencies, 0.95),
        },
        "resume_latency_ms": {
            "mean": statistics.fmean(resume_latencies),
            "p50": _percentile(resume_latencies, 0.50),
            "p95": _percentile(resume_latencies, 0.95),
        },
        "allocated_storage_delta_bytes": max(0, storage_after - storage_before),
        "model_call_count": 0,
        "cleanup": "all benchmark thread checkpoints deleted",
        "scope": "local engineering benchmark; not a production capacity claim",
    }


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=25)
    arguments = parser.parse_args()
    if not 1 <= arguments.runs <= 1000:
        parser.error("--runs must be between 1 and 1000")
    return arguments


async def _main() -> None:
    arguments = _arguments()
    try:
        print(
            json.dumps(
                await benchmark(runs=arguments.runs),
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
        )
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(_main())
