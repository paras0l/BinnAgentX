"""Durable knowledge organization graph with batch human review."""

from __future__ import annotations

import inspect
from collections.abc import Awaitable, Callable
from typing import Any, TypedDict

from binnagent_domain.learning.knowledge_organization import (
    AtomicKnowledgeCandidate,
    KnowledgeChangeProposal,
    KnowledgeSourceRecord,
)
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from binnagent_agent.workflows.langgraph_runtime import (
    GRAPH_VERSION,
    require_graph_version,
)

type MaybeAwaitable[T] = T | Awaitable[T]

KnowledgeExtractor = Callable[
    [tuple[KnowledgeSourceRecord, ...], str],
    MaybeAwaitable[tuple[AtomicKnowledgeCandidate, ...]],
]
ProposalMatcher = Callable[
    [
        tuple[KnowledgeSourceRecord, ...],
        tuple[AtomicKnowledgeCandidate, ...],
        str,
    ],
    MaybeAwaitable[tuple[KnowledgeChangeProposal, ...]],
]
ProposalCommitter = Callable[
    ["KnowledgeOrganizationState", str],
    MaybeAwaitable[tuple[str, ...]],
]
FaultInjector = Callable[[str, str], None]


class KnowledgeOrganizationState(TypedDict, total=False):
    source_records: list[dict[str, Any]]
    candidates: list[dict[str, Any]]
    proposals: list[dict[str, Any]]
    review_decision: dict[str, Any]
    committed_asset_ids: list[str]
    workflow_status: str
    graph_version: str


def build_knowledge_organization_graph(
    *,
    extractor: KnowledgeExtractor,
    matcher: ProposalMatcher,
    committer: ProposalCommitter,
    checkpointer: Any,
    fault_injector: FaultInjector | None = None,
    graph_version: str = GRAPH_VERSION,
    compatible_graph_versions: frozenset[str] = frozenset(),
) -> Any:
    """Compile the organizer workflow against the supplied durable checkpointer."""

    def fault(node: str, phase: str) -> None:
        if fault_injector is not None:
            fault_injector(node, phase)

    def validate_version(state: KnowledgeOrganizationState) -> None:
        require_graph_version(
            state,
            graph_version=graph_version,
            compatible_graph_versions=compatible_graph_versions,
        )

    def sources(state: KnowledgeOrganizationState) -> tuple[KnowledgeSourceRecord, ...]:
        values = tuple(
            KnowledgeSourceRecord.model_validate(value) for value in state.get("source_records", [])
        )
        if not values:
            raise ValueError("knowledge_organization_requires_sources")
        return values

    async def extract_node(state: KnowledgeOrganizationState) -> dict[str, Any]:
        validate_version(state)
        fault("extract", "before")
        source_records = sources(state)
        source_fingerprint = ":".join(
            f"{source.source_record_id}:{source.content_hash}" for source in source_records
        )
        candidates = await _resolve(extractor(source_records, f"extract:{source_fingerprint}"))
        if not candidates:
            raise ValueError("knowledge_extraction_requires_candidate_or_explicit_defer")
        source_ids = {source.source_record_id for source in source_records}
        if any(candidate.source_record_id not in source_ids for candidate in candidates):
            raise ValueError("knowledge_candidate_source_outside_run")
        fault("extract", "after")
        return {
            "candidates": [candidate.model_dump(mode="json") for candidate in candidates],
            "workflow_status": "candidates_extracted",
            "graph_version": graph_version,
        }

    async def proposal_node(state: KnowledgeOrganizationState) -> dict[str, Any]:
        validate_version(state)
        fault("proposal", "before")
        source_records = sources(state)
        candidates = tuple(
            AtomicKnowledgeCandidate.model_validate(item) for item in state["candidates"]
        )
        proposals = await _resolve(
            matcher(source_records, candidates, f"proposal:{source_records[0].source_record_id}")
        )
        if len(proposals) != len(candidates):
            raise ValueError("each_candidate_requires_explicit_proposal")
        candidate_ids = {candidate.candidate_id for candidate in candidates}
        if {proposal.candidate_id for proposal in proposals} != candidate_ids:
            raise ValueError("proposal_candidate_coverage_mismatch")
        fault("proposal", "after")
        return {
            "proposals": [proposal.model_dump(mode="json") for proposal in proposals],
            "workflow_status": "proposals_created",
            "graph_version": graph_version,
        }

    def review_node(state: KnowledgeOrganizationState) -> dict[str, Any]:
        validate_version(state)
        fault("review", "before")
        proposals = tuple(
            KnowledgeChangeProposal.model_validate(item) for item in state["proposals"]
        )
        decision = interrupt(
            {
                "kind": "knowledge_change_review",
                "source_record_ids": [source.source_record_id for source in sources(state)],
                "proposals": [proposal.model_dump(mode="json") for proposal in proposals],
                "allowed_actions": ["approve", "reject"],
            }
        )
        if not isinstance(decision, dict):
            raise ValueError("review_resume_payload_must_be_object")
        reviewer_id = decision.get("reviewer_id")
        decisions = decision.get("decisions")
        if not isinstance(reviewer_id, str) or not isinstance(decisions, dict):
            raise ValueError("review_resume_payload_invalid")
        proposal_ids = {proposal.proposal_id for proposal in proposals}
        if set(decisions) != proposal_ids or any(
            action not in {"approve", "reject"} for action in decisions.values()
        ):
            raise ValueError("review_decisions_must_cover_all_proposals")
        fault("review", "after")
        return {
            "review_decision": {
                "reviewer_id": reviewer_id,
                "decisions": dict(decisions),
            },
            "workflow_status": "review_completed",
            "graph_version": graph_version,
        }

    async def commit_node(state: KnowledgeOrganizationState) -> dict[str, Any]:
        validate_version(state)
        fault("commit", "before")
        proposal_ids = sorted(item["proposal_id"] for item in state["proposals"])
        key = f"commit:{proposal_ids[0]}:{len(proposal_ids)}"
        asset_ids = await _resolve(committer(state, key))
        fault("commit", "after")
        return {
            "committed_asset_ids": list(asset_ids),
            "workflow_status": "completed",
            "graph_version": graph_version,
        }

    graph = StateGraph(KnowledgeOrganizationState)
    graph.add_node("extract", extract_node)
    graph.add_node("proposal", proposal_node)
    graph.add_node("review", review_node)
    graph.add_node("commit", commit_node)
    graph.add_edge(START, "extract")
    graph.add_edge("extract", "proposal")
    graph.add_edge("proposal", "review")
    graph.add_edge("review", "commit")
    graph.add_edge("commit", END)
    return graph.compile(
        checkpointer=checkpointer,
        name=f"knowledge-organization-{graph_version}",
    )


async def _resolve[T](value: MaybeAwaitable[T]) -> T:
    if inspect.isawaitable(value):
        return await value
    return value
