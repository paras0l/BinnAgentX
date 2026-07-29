"""Durable extraction, proposal, review, and safe commit for organizer runs."""

from __future__ import annotations

import asyncio
import difflib
import os
import re
import socket
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from hashlib import sha256
from typing import Any
from uuid import UUID

import sqlalchemy as sa
from binnagent_agent.agents.knowledge_extractor import (
    AtomicKnowledgeExtraction,
    AtomicKnowledgeExtractionItem,
    create_atomic_knowledge_extractor,
)
from binnagent_agent.workflows import (
    GRAPH_VERSION,
    build_knowledge_organization_graph,
    open_postgres_checkpointer,
)
from binnagent_agent.workflows.knowledge_organization_graph import (
    KnowledgeOrganizationState,
)
from binnagent_domain.learning.content_quality import SourceSpan
from binnagent_domain.learning.grammar_ontology import (
    resolve_construction_from_text,
    resolve_construction_id,
)
from binnagent_domain.learning.knowledge_organization import (
    AtomicKnowledgeCandidate,
    CandidateValidationStatus,
    ExistingAssetMatch,
    FieldChange,
    KnowledgeChangeAction,
    KnowledgeChangeProposal,
    KnowledgeKind,
    KnowledgeSourceRecord,
    candidate_idempotency_key,
)
from langchain_core.runnables import RunnableConfig
from langgraph.types import Command
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.database import get_engine
from binnagent_api.knowledge_extraction_service import model_from_settings
from binnagent_api.learning_evidence_service import refresh_asset_projection
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

ATOMIC_EXTRACTOR_VERSION = "atomic-extractor-v1"
KNOWLEDGE_WORKER_ID = f"{socket.gethostname()}:{os.getpid()}"


async def process_next_knowledge_organization() -> bool:
    """Process one existing organizer run after authorized source capture."""

    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        run = (
            (
                await connection.execute(
                    sa.select(tables.obsidian_organizer_runs)
                    .where(
                        sa.or_(
                            tables.obsidian_organizer_runs.c.knowledge_status == "extracting",
                            sa.and_(
                                tables.obsidian_organizer_runs.c.knowledge_status == "matching",
                                sa.or_(
                                    tables.obsidian_organizer_runs.c.knowledge_lease_expires_at.is_(
                                        None
                                    ),
                                    tables.obsidian_organizer_runs.c.knowledge_lease_expires_at
                                    <= now,
                                ),
                            ),
                        ),
                    )
                    .order_by(tables.obsidian_organizer_runs.c.created_at)
                    .limit(1)
                    .with_for_update(skip_locked=True)
                )
            )
            .mappings()
            .one_or_none()
        )
        if run is None:
            return False
        lease_seconds = max(
            60,
            get_settings().model_timeout_seconds * max(1, len(list(run["source_record_ids"]))) + 30,
        )
        await connection.execute(
            tables.obsidian_organizer_runs.update()
            .where(tables.obsidian_organizer_runs.c.run_id == run["run_id"])
            .values(
                knowledge_status="matching",
                knowledge_claimed_by=KNOWLEDGE_WORKER_ID,
                knowledge_lease_expires_at=now + timedelta(seconds=lease_seconds),
                knowledge_attempt_count=int(run["knowledge_attempt_count"]) + 1,
            )
        )
        source_rows = (
            (
                await connection.execute(
                    sa.select(
                        tables.knowledge_source_records,
                        tables.knowledge_source_payloads.c.content,
                    )
                    .join(
                        tables.knowledge_source_payloads,
                        tables.knowledge_source_payloads.c.source_record_id
                        == tables.knowledge_source_records.c.source_record_id,
                    )
                    .where(
                        tables.knowledge_source_records.c.source_record_id.in_(
                            list(run["source_record_ids"])
                        )
                    )
                )
            )
            .mappings()
            .all()
        )
        claimed = dict(run)

    if claimed.get("runtime_kind") == "langgraph":
        return await _process_langgraph_knowledge_organization(
            claimed,
            source_rows=source_rows,
        )

    try:
        extracted = await _extract_sources(source_rows)
        if not extracted:
            async with get_engine().begin() as connection:
                result = await connection.execute(
                    tables.obsidian_organizer_runs.update()
                    .where(
                        tables.obsidian_organizer_runs.c.run_id == claimed["run_id"],
                        tables.obsidian_organizer_runs.c.knowledge_claimed_by
                        == KNOWLEDGE_WORKER_ID,
                    )
                    .values(
                        knowledge_status="needs_more_context",
                        error_code="atomic_extractor_returned_no_supported_claims",
                        knowledge_claimed_by=None,
                        knowledge_lease_expires_at=None,
                    )
                )
                if not result.rowcount:
                    return True
            return True
        async with get_engine().begin() as connection:
            candidate_ids = await _persist_candidates(
                connection,
                learner_id=str(claimed["learner_id"]),
                candidates=extracted,
            )
            proposal_ids = await _create_proposals(
                connection,
                run_id=str(claimed["run_id"]),
                learner_id=str(claimed["learner_id"]),
                candidates=extracted,
            )
            result = await connection.execute(
                tables.obsidian_organizer_runs.update()
                .where(
                    tables.obsidian_organizer_runs.c.run_id == claimed["run_id"],
                    tables.obsidian_organizer_runs.c.knowledge_claimed_by == KNOWLEDGE_WORKER_ID,
                )
                .values(
                    knowledge_status="awaiting_review",
                    candidate_ids=candidate_ids,
                    proposal_ids=proposal_ids,
                    error_code=None,
                    knowledge_claimed_by=None,
                    knowledge_lease_expires_at=None,
                )
            )
            if not result.rowcount:
                raise RuntimeError("knowledge_organization_lease_lost")
    except Exception as exc:
        async with get_engine().begin() as connection:
            await connection.execute(
                tables.obsidian_organizer_runs.update()
                .where(
                    tables.obsidian_organizer_runs.c.run_id == claimed["run_id"],
                    tables.obsidian_organizer_runs.c.knowledge_claimed_by == KNOWLEDGE_WORKER_ID,
                )
                .values(
                    knowledge_status="failed",
                    error_code=f"{type(exc).__name__}:{str(exc)[:80]}",
                    knowledge_claimed_by=None,
                    knowledge_lease_expires_at=None,
                )
            )
        return True
    return True


async def _process_langgraph_knowledge_organization(
    run: dict[str, Any],
    *,
    source_rows: Sequence[sa.RowMapping],
) -> bool:
    source_contracts = tuple(_source_record(row) for row in source_rows)
    if not source_contracts:
        await _mark_knowledge_run_failed(
            run,
            ValueError("knowledge_organization_requires_authorized_sources"),
        )
        return True
    database_url = get_settings().database_url.get_secret_value()
    try:
        async with open_postgres_checkpointer(database_url) as saver:
            graph = _build_business_knowledge_graph(
                run=run,
                source_rows=source_rows,
                checkpointer=saver,
            )
            config = _knowledge_graph_config(run)
            snapshot = await graph.aget_state(config)
            result = await graph.ainvoke(
                None
                if snapshot.values
                else {
                    "source_records": [
                        source.model_dump(mode="json") for source in source_contracts
                    ],
                    "workflow_status": "queued",
                    "graph_version": str(run["graph_version"] or GRAPH_VERSION),
                },
                config,
            )
        if not result.get("__interrupt__"):
            raise RuntimeError("knowledge_graph_review_interrupt_missing")
        await _persist_knowledge_review_candidate(run, dict(result))
    except Exception as exc:
        if str(exc) == "knowledge_extraction_requires_candidate_or_explicit_defer":
            await _mark_knowledge_run_needs_context(run)
        else:
            await _mark_knowledge_run_failed(run, exc)
    return True


def _build_business_knowledge_graph(
    *,
    run: dict[str, Any],
    source_rows: Sequence[sa.RowMapping],
    checkpointer: Any,
) -> Any:
    row_by_source_id = {str(row["source_record_id"]): row for row in source_rows}

    async def extract(
        sources: tuple[KnowledgeSourceRecord, ...],
        _key: str,
    ) -> tuple[AtomicKnowledgeCandidate, ...]:
        selected = [row_by_source_id[source.source_record_id] for source in sources]
        return await _extract_sources(selected)

    async def match(
        _sources: tuple[KnowledgeSourceRecord, ...],
        candidates: tuple[AtomicKnowledgeCandidate, ...],
        _key: str,
    ) -> tuple[KnowledgeChangeProposal, ...]:
        return await _build_proposals(
            run_id=str(run["run_id"]),
            learner_id=str(run["learner_id"]),
            candidates=candidates,
        )

    async def commit(state: KnowledgeOrganizationState, key: str) -> tuple[str, ...]:
        return await _commit_knowledge_review(
            run_id=str(run["run_id"]),
            state=state,
            commit_key=key,
        )

    return build_knowledge_organization_graph(
        extractor=extract,
        matcher=match,
        committer=commit,
        checkpointer=checkpointer,
        graph_version=str(run["graph_version"] or GRAPH_VERSION),
    )


async def _persist_knowledge_review_candidate(
    run: dict[str, Any],
    state: dict[str, Any],
) -> None:
    candidates = tuple(
        AtomicKnowledgeCandidate.model_validate(value) for value in state["candidates"]
    )
    proposals = tuple(KnowledgeChangeProposal.model_validate(value) for value in state["proposals"])
    async with get_engine().begin() as connection:
        candidate_ids = await _persist_candidates(
            connection,
            learner_id=str(run["learner_id"]),
            candidates=candidates,
        )
        await _persist_proposals(
            connection,
            run_id=str(run["run_id"]),
            learner_id=str(run["learner_id"]),
            proposals=proposals,
        )
        result = await connection.execute(
            tables.obsidian_organizer_runs.update()
            .where(
                tables.obsidian_organizer_runs.c.run_id == run["run_id"],
                tables.obsidian_organizer_runs.c.knowledge_claimed_by == KNOWLEDGE_WORKER_ID,
            )
            .values(
                knowledge_status="awaiting_review",
                candidate_ids=candidate_ids,
                proposal_ids=[proposal.proposal_id for proposal in proposals],
                knowledge_claimed_by=None,
                knowledge_lease_expires_at=None,
                error_code=None,
                graph_version=str(state["graph_version"]),
            )
        )
        if not result.rowcount:
            raise RuntimeError("knowledge_organization_lease_lost")


async def _mark_knowledge_run_failed(
    run: dict[str, Any],
    exc: Exception,
) -> None:
    attempt_count = int(run.get("knowledge_attempt_count") or 0) + 1
    terminal = attempt_count >= 3
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.obsidian_organizer_runs.update()
            .where(
                tables.obsidian_organizer_runs.c.run_id == run["run_id"],
                tables.obsidian_organizer_runs.c.knowledge_claimed_by == KNOWLEDGE_WORKER_ID,
            )
            .values(
                knowledge_status="failed" if terminal else "extracting",
                error_code=f"{type(exc).__name__}:{str(exc)[:80]}",
                knowledge_claimed_by=None,
                knowledge_lease_expires_at=None,
            )
        )


async def _mark_knowledge_run_needs_context(run: dict[str, Any]) -> None:
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.obsidian_organizer_runs.update()
            .where(
                tables.obsidian_organizer_runs.c.run_id == run["run_id"],
                tables.obsidian_organizer_runs.c.knowledge_claimed_by == KNOWLEDGE_WORKER_ID,
            )
            .values(
                knowledge_status="needs_more_context",
                error_code="atomic_extractor_returned_no_supported_claims",
                knowledge_claimed_by=None,
                knowledge_lease_expires_at=None,
            )
        )


def _knowledge_graph_config(run: dict[str, Any]) -> RunnableConfig:
    thread_id = run.get("graph_thread_id")
    if not isinstance(thread_id, str) or not thread_id:
        raise ValueError("knowledge_graph_thread_id_missing")
    return {"configurable": {"thread_id": thread_id}}


async def _extract_sources(
    source_rows: Sequence[sa.RowMapping],
) -> tuple[AtomicKnowledgeCandidate, ...]:
    settings = get_settings()
    model = model_from_settings(settings)
    candidates: list[AtomicKnowledgeCandidate] = []
    for row in source_rows:
        source = _source_record(row)
        content = str(row["content"])
        request_hash = sha256(
            f"{source.content_hash}:{ATOMIC_EXTRACTOR_VERSION}".encode()
        ).hexdigest()
        invocation_key = sha256(
            f"knowledge-extract:{source.source_record_id}:{request_hash}".encode()
        ).hexdigest()
        cached = await _reserve_or_load_extraction(
            invocation_key=invocation_key,
            source_record_id=source.source_record_id,
            request_hash=request_hash,
        )
        if cached is not None:
            output = AtomicKnowledgeExtraction.model_validate(cached)
        elif model is None:
            output = (
                _deterministic_asset_capture_extraction(content)
                if source.provider == "learning_asset_capture"
                else _deterministic_atomic_extraction(content)
            )
            await _complete_extraction(invocation_key, output)
        else:
            try:
                result = await asyncio.wait_for(
                    create_atomic_knowledge_extractor(model).run(
                        f"<authorized_note>\n{content}\n</authorized_note>"
                    ),
                    timeout=settings.model_timeout_seconds,
                )
            except Exception:
                await _release_extraction(invocation_key)
                raise
            output = result.output
            await _complete_extraction(invocation_key, output)
        candidates.extend(_validated_candidates(source, content, output))
    return tuple(candidates)


def _deterministic_atomic_extraction(content: str) -> AtomicKnowledgeExtraction:
    """Offline acceptance adapter; it extracts explicit sentences without inventing evidence."""

    items: list[AtomicKnowledgeExtractionItem] = []
    sentences = [
        sentence.strip()
        for sentence in re.split(
            r"(?<=[.!?\u3002\uff01\uff1f])\s+",
            content.strip(),
        )
        if len(sentence.strip()) >= 8
    ]
    for sentence in sentences[:12]:
        lowered = sentence.casefold()
        if any(token in lowered for token in ("writer", "main idea", "reading", "claim")):
            kind = "reading_skill"
        elif any(token in lowered for token in ("although", "grammar", "clause", "tense")):
            kind = "grammar"
        elif any(token in lowered for token in ("phrase", "collocation")):
            kind = "collocation"
        elif any(token in lowered for token in ("write", "expression", "express")):
            kind = "expression_skill"
        elif any(token in lowered for token in ("means", "meaning", "word")):
            kind = "word_sense"
        else:
            kind = "example"
        words = re.findall(r"[a-z0-9]+", lowered)
        key_tail = "-".join(words[:8]) or sha256(sentence.encode()).hexdigest()[:12]
        title = " ".join(sentence.rstrip(".!?\u3002\uff01\uff1f").split()[:8])[:240]
        items.append(
            AtomicKnowledgeExtractionItem(
                knowledge_kind=kind,
                canonical_key=f"{kind}:{key_tail}"[:300],
                title=title,
                claim=sentence,
                evidence_quotes=[sentence],
                confidence=0.9,
            )
        )
    return AtomicKnowledgeExtraction(items=items)


def _deterministic_asset_capture_extraction(content: str) -> AtomicKnowledgeExtraction:
    """Offline fallback only promotes learner-authored capture segments."""

    learner_segments = [
        match.group("content").strip()
        for match in re.finditer(
            r"\[segment (?P<attrs>[^\]]+)\]\n"
            r"(?P<content>.*?)(?=\n\n\[segment |\Z)",
            content,
            re.S,
        )
        if "origin=learner" in match.group("attrs")
        and any(
            marker in match.group("attrs")
            for marker in (
                "role=learner_interpretation",
                "role=reusable_rule",
                "role=example",
            )
        )
    ]
    if not learner_segments:
        return AtomicKnowledgeExtraction(items=[])
    return _deterministic_atomic_extraction("\n\n".join(learner_segments))


async def _reserve_or_load_extraction(
    *,
    invocation_key: str,
    source_record_id: str,
    request_hash: str,
) -> dict[str, Any] | None:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        inserted = await connection.execute(
            pg_insert(tables.model_invocation_ledger)
            .values(
                invocation_key=invocation_key,
                tool_name="knowledge_organization.extract",
                workflow_run_id=source_record_id,
                task_id=source_record_id,
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
                    sa.select(tables.model_invocation_ledger)
                    .where(tables.model_invocation_ledger.c.invocation_key == invocation_key)
                    .with_for_update()
                )
            )
            .mappings()
            .one()
        )
        if row["request_hash"] != request_hash:
            raise RuntimeError("knowledge_extraction_invocation_hash_mismatch")
        if row["status"] == "completed" and isinstance(row["response_payload"], dict):
            return dict(row["response_payload"])
        if row["updated_at"] <= now - timedelta(minutes=5):
            await connection.execute(
                tables.model_invocation_ledger.update()
                .where(tables.model_invocation_ledger.c.invocation_key == invocation_key)
                .values(updated_at=now)
            )
            return None
    raise RuntimeError("knowledge_extraction_invocation_in_progress")


async def _complete_extraction(
    invocation_key: str,
    output: AtomicKnowledgeExtraction,
) -> None:
    payload = output.model_dump(mode="json")
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.model_invocation_ledger.update()
            .where(tables.model_invocation_ledger.c.invocation_key == invocation_key)
            .values(
                status="completed",
                response_payload=payload,
                output_hash=sha256(repr(sorted(payload.items())).encode()).hexdigest(),
                updated_at=datetime.now(UTC),
            )
        )


async def _release_extraction(invocation_key: str) -> None:
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.model_invocation_ledger.delete().where(
                tables.model_invocation_ledger.c.invocation_key == invocation_key,
                tables.model_invocation_ledger.c.status == "pending",
            )
        )


def _source_record(row: sa.RowMapping) -> KnowledgeSourceRecord:
    return KnowledgeSourceRecord(
        source_record_id=str(row["source_record_id"]),
        learner_id=str(row["learner_id"]),
        provider=str(row["provider"]),
        connection_id=str(row["connection_id"]),
        source_key=str(row["source_key"]),
        content_hash=str(row["content_hash"]),
        source_modified_at=row["source_modified_at"],
        authorized_scope=tuple(str(item) for item in row["authorized_scope"]),
        captured_content_ref=str(row["captured_content_ref"]),
        supersedes_source_record_id=row["supersedes_source_record_id"],
        captured_at=row["captured_at"],
    )


def _validated_candidates(
    source: KnowledgeSourceRecord,
    content: str,
    output: AtomicKnowledgeExtraction,
) -> tuple[AtomicKnowledgeCandidate, ...]:
    candidates: list[AtomicKnowledgeCandidate] = []
    for item in output.items:
        knowledge_kind = KnowledgeKind(item.knowledge_kind)
        construction_id = (
            resolve_construction_from_text(item.canonical_key, item.title, item.claim)
            if knowledge_kind is KnowledgeKind.GRAMMAR
            else None
        )
        canonical_key = (
            construction_id if construction_id is not None else _canonical_key(item.canonical_key)
        )
        spans = _exact_spans(
            source.source_record_id,
            source.content_hash,
            content,
            tuple(item.evidence_quotes),
        )
        if not spans:
            continue
        key = candidate_idempotency_key(
            source,
            canonical_key=canonical_key,
            extractor_version=ATOMIC_EXTRACTOR_VERSION,
        )
        candidates.append(
            AtomicKnowledgeCandidate(
                candidate_id=f"knowledge_candidate_{key[:36]}",
                source_record_id=source.source_record_id,
                knowledge_kind=knowledge_kind,
                canonical_key=canonical_key,
                title=item.title,
                claim=item.claim,
                source_spans=spans,
                examples=(),
                conditions=tuple(item.conditions),
                confidence=item.confidence,
                validation_status=(
                    CandidateValidationStatus.CANDIDATE
                    if item.confidence >= 0.8
                    and (knowledge_kind is not KnowledgeKind.GRAMMAR or construction_id is not None)
                    else CandidateValidationStatus.NEEDS_REVIEW
                ),
                extractor_version=ATOMIC_EXTRACTOR_VERSION,
            )
        )
    return tuple(candidates)


def _exact_spans(
    source_id: str,
    source_version: str,
    content: str,
    quotes: tuple[str, ...],
) -> tuple[SourceSpan, ...]:
    spans: list[SourceSpan] = []
    for quote in quotes:
        starts = [match.start() for match in re.finditer(re.escape(quote), content)]
        if len(starts) != 1:
            return ()
        start = starts[0]
        spans.append(
            SourceSpan(
                source_id=source_id,
                source_version=source_version,
                start=start,
                end=start + len(quote),
                text_quote=quote,
            )
        )
    return tuple(spans)


def _canonical_key(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9:_-]+", "-", value.casefold().strip()).strip("-")
    if len(normalized) < 3:
        raise ValueError("knowledge_canonical_key_invalid")
    return normalized[:300]


async def _persist_candidates(
    connection: AsyncConnection,
    *,
    learner_id: str,
    candidates: tuple[AtomicKnowledgeCandidate, ...],
) -> list[str]:
    candidate_ids: list[str] = []
    for candidate in candidates:
        source = (
            (
                await connection.execute(
                    sa.select(tables.knowledge_source_records).where(
                        tables.knowledge_source_records.c.source_record_id
                        == candidate.source_record_id
                    )
                )
            )
            .mappings()
            .one()
        )
        source_contract = _source_record(source)
        idempotency_key = candidate_idempotency_key(
            source_contract,
            canonical_key=candidate.canonical_key,
            extractor_version=candidate.extractor_version,
        )
        await connection.execute(
            pg_insert(tables.atomic_knowledge_candidates)
            .values(
                candidate_id=candidate.candidate_id,
                source_record_id=candidate.source_record_id,
                learner_id=learner_id,
                knowledge_kind=candidate.knowledge_kind.value,
                canonical_key=candidate.canonical_key,
                title=candidate.title,
                claim=candidate.claim,
                source_spans=[span.model_dump(mode="json") for span in candidate.source_spans],
                examples=[],
                conditions=list(candidate.conditions),
                confidence=Decimal(str(candidate.confidence)),
                validation_status=candidate.validation_status.value,
                extractor_version=candidate.extractor_version,
                idempotency_key=idempotency_key,
                created_at=datetime.now(UTC),
            )
            .on_conflict_do_nothing(index_elements=["idempotency_key"])
        )
        candidate_ids.append(candidate.candidate_id)
    return candidate_ids


async def _create_proposals(
    connection: AsyncConnection,
    *,
    run_id: str,
    learner_id: str,
    candidates: tuple[AtomicKnowledgeCandidate, ...],
) -> list[str]:
    proposals = await _build_proposals(
        run_id=run_id,
        learner_id=learner_id,
        candidates=candidates,
        connection=connection,
    )
    await _persist_proposals(
        connection,
        run_id=run_id,
        learner_id=learner_id,
        proposals=proposals,
    )
    return [proposal.proposal_id for proposal in proposals]


async def _build_proposals(
    *,
    run_id: str,
    learner_id: str,
    candidates: tuple[AtomicKnowledgeCandidate, ...],
    connection: AsyncConnection | None = None,
) -> tuple[KnowledgeChangeProposal, ...]:
    if connection is None:
        async with get_engine().connect() as owned_connection:
            return await _build_proposals(
                run_id=run_id,
                learner_id=learner_id,
                candidates=candidates,
                connection=owned_connection,
            )
    seen_keys: set[str] = set()
    proposals: list[KnowledgeChangeProposal] = []
    for candidate in candidates:
        ranked_existing = await _rank_existing_assets(
            connection,
            learner_id=learner_id,
            candidate=candidate,
        )
        source = (
            (
                await connection.execute(
                    sa.select(tables.knowledge_source_records).where(
                        tables.knowledge_source_records.c.source_record_id
                        == candidate.source_record_id
                    )
                )
            )
            .mappings()
            .one()
        )
        existing = ranked_existing[0][0] if ranked_existing else None
        matches = tuple(item[1] for item in ranked_existing)
        action = _select_change_action(
            confidence=candidate.confidence,
            duplicate_in_run=candidate.canonical_key in seen_keys,
            existing_claim=(str(existing["matched_claim"] or "") if existing is not None else None),
            canonical_match=(
                existing is not None
                and existing["matched_canonical_key"] == candidate.canonical_key
            ),
            supersedes_source=source["supersedes_source_record_id"] is not None,
            incoming_claim=candidate.claim,
        )
        if candidate.knowledge_kind is KnowledgeKind.GRAMMAR:
            try:
                resolve_construction_id(candidate.canonical_key)
            except ValueError:
                action = KnowledgeChangeAction.DEFER
        seen_keys.add(candidate.canonical_key)
        proposal_key = sha256(
            f"{run_id}:{candidate.candidate_id}:{action.value}".encode()
        ).hexdigest()
        proposals.append(
            KnowledgeChangeProposal(
                proposal_id=f"knowledge_proposal_{proposal_key[:36]}",
                candidate_id=candidate.candidate_id,
                action=action,
                existing_asset_matches=matches,
                field_changes=(
                    FieldChange(
                        field_name="knowledge_claim",
                        before=existing["matched_claim"] if existing is not None else None,
                        after=candidate.claim,
                    ),
                ),
                source_spans=candidate.source_spans,
                conflicts=(
                    ("New claim has opposite polarity to the matched claim.",)
                    if action is KnowledgeChangeAction.MARK_CONFLICT
                    else ()
                ),
                confidence=candidate.confidence,
                requires_human_review=True,
                destination=(
                    "none"
                    if action in {KnowledgeChangeAction.DISCARD, KnowledgeChangeAction.DEFER}
                    else _destination(candidate.knowledge_kind)
                ),
                idempotency_key=proposal_key,
                expected_asset_version=(
                    int(existing["version"])
                    if existing is not None
                    and action
                    in {
                        KnowledgeChangeAction.MERGE,
                        KnowledgeChangeAction.SUPERSEDE,
                        KnowledgeChangeAction.MARK_CONFLICT,
                    }
                    else None
                ),
            )
        )
    return tuple(proposals)


async def _rank_existing_assets(
    connection: AsyncConnection,
    *,
    learner_id: str,
    candidate: AtomicKnowledgeCandidate,
    limit: int = 4,
) -> list[tuple[sa.RowMapping, ExistingAssetMatch]]:
    """Coarse same-kind retrieval followed by deterministic lexical reranking."""

    rows = (
        (
            await connection.execute(
                sa.select(
                    tables.learning_asset_index,
                    tables.atomic_knowledge_candidates.c.canonical_key.label(
                        "matched_canonical_key"
                    ),
                    tables.atomic_knowledge_candidates.c.claim.label("matched_claim"),
                )
                .join(
                    tables.knowledge_change_proposals,
                    tables.knowledge_change_proposals.c.committed_asset_id
                    == tables.learning_asset_index.c.asset_id,
                    isouter=True,
                )
                .join(
                    tables.atomic_knowledge_candidates,
                    tables.atomic_knowledge_candidates.c.candidate_id
                    == tables.knowledge_change_proposals.c.candidate_id,
                    isouter=True,
                )
                .where(
                    tables.learning_asset_index.c.learner_id == learner_id,
                    tables.learning_asset_index.c.asset_kind
                    == _asset_kind(candidate.knowledge_kind.value),
                )
                .order_by(tables.learning_asset_index.c.updated_at.desc())
                .limit(80)
            )
        )
        .mappings()
        .all()
    )
    best_by_asset: dict[str, tuple[sa.RowMapping, float, bool]] = {}
    for row in rows:
        canonical_match = row["matched_canonical_key"] == candidate.canonical_key
        score = (
            1.0
            if canonical_match
            else _lexical_similarity(
                candidate.title,
                candidate.claim,
                str(row["display_title"]),
                str(row["matched_claim"] or ""),
            )
        )
        asset_id = str(row["asset_id"])
        previous = best_by_asset.get(asset_id)
        if previous is None or score > previous[1]:
            best_by_asset[asset_id] = (row, score, canonical_match)
    ranked = sorted(
        best_by_asset.values(),
        key=lambda item: (item[2], item[1], item[0]["updated_at"]),
        reverse=True,
    )
    selected = [item for item in ranked if item[2] or item[1] >= 0.45][:limit]
    return [
        (
            row,
            ExistingAssetMatch(
                asset_id=str(row["asset_id"]),
                asset_version=int(row["version"]),
                canonical_key_match=canonical_match,
                lexical_score=round(score, 4),
                evidence=(
                    "Stable canonical key matched."
                    if canonical_match
                    else "Same-kind title and claim survived lexical Top-K reranking."
                ),
            ),
        )
        for row, score, canonical_match in selected
    ]


def _lexical_similarity(
    incoming_title: str,
    incoming_claim: str,
    existing_title: str,
    existing_claim: str,
) -> float:
    incoming = _normalized_claim(f"{incoming_title} {incoming_claim}")
    existing = _normalized_claim(f"{existing_title} {existing_claim}")
    if not incoming or not existing:
        return 0
    incoming_tokens = set(incoming.split())
    existing_tokens = set(existing.split())
    union = incoming_tokens | existing_tokens
    jaccard = len(incoming_tokens & existing_tokens) / len(union) if union else 0
    sequence = difflib.SequenceMatcher(None, incoming, existing).ratio()
    return max(jaccard, sequence)


async def _persist_proposals(
    connection: AsyncConnection,
    *,
    run_id: str,
    learner_id: str,
    proposals: tuple[KnowledgeChangeProposal, ...],
) -> None:
    for proposal in proposals:
        await connection.execute(
            pg_insert(tables.knowledge_change_proposals)
            .values(
                proposal_id=proposal.proposal_id,
                run_id=run_id,
                learner_id=learner_id,
                candidate_id=proposal.candidate_id,
                action=proposal.action.value,
                existing_asset_matches=[
                    item.model_dump(mode="json") for item in proposal.existing_asset_matches
                ],
                field_changes=[item.model_dump(mode="json") for item in proposal.field_changes],
                source_spans=[item.model_dump(mode="json") for item in proposal.source_spans],
                conflicts=list(proposal.conflicts),
                confidence=Decimal(str(proposal.confidence)),
                requires_human_review=proposal.requires_human_review,
                destination=proposal.destination,
                idempotency_key=proposal.idempotency_key,
                expected_asset_version=proposal.expected_asset_version,
                status="awaiting_review",
                reviewer_id=None,
                reviewed_at=None,
                committed_asset_id=None,
                created_at=datetime.now(UTC),
            )
            .on_conflict_do_nothing(index_elements=["idempotency_key"])
        )


def _normalized_claim(value: str) -> str:
    return re.sub(r"\W+", " ", value.casefold()).strip()


def _select_change_action(
    *,
    confidence: float,
    duplicate_in_run: bool,
    existing_claim: str | None,
    canonical_match: bool,
    supersedes_source: bool,
    incoming_claim: str,
) -> KnowledgeChangeAction:
    if duplicate_in_run:
        return KnowledgeChangeAction.DISCARD
    if confidence < 0.65:
        return KnowledgeChangeAction.DEFER
    if existing_claim is None:
        return KnowledgeChangeAction.CREATE
    if supersedes_source:
        return KnowledgeChangeAction.SUPERSEDE
    if _claims_conflict(existing_claim, incoming_claim):
        return KnowledgeChangeAction.MARK_CONFLICT
    if not canonical_match:
        return KnowledgeChangeAction.LINK
    if _normalized_claim(existing_claim) == _normalized_claim(incoming_claim):
        return KnowledgeChangeAction.LINK
    return KnowledgeChangeAction.MERGE


def _claims_conflict(existing: str, incoming: str) -> bool:
    if not existing:
        return False
    negative = re.compile(r"\b(?:not|never|cannot|doesn't|isn't|aren't)\b", re.I)
    return bool(negative.search(existing)) != bool(negative.search(incoming))


def _destination(kind: KnowledgeKind) -> str:
    if kind in {KnowledgeKind.EXPRESSION_SKILL, KnowledgeKind.COLLOCATION}:
        return "expression"
    if kind is KnowledgeKind.ERROR_HYPOTHESIS:
        return "review_validation"
    return "reading"


async def review_knowledge_proposal(
    *,
    proposal_id: str,
    reviewer_id: str,
    action: str,
) -> dict[str, Any]:
    if action not in {"approve", "reject"}:
        raise ValueError("knowledge_review_action_invalid")
    run: dict[str, Any] | None = None
    source_rows: Sequence[sa.RowMapping] = ()
    decisions: dict[str, str] = {}
    async with get_engine().begin() as connection:
        proposal = (
            (
                await connection.execute(
                    sa.select(tables.knowledge_change_proposals)
                    .where(tables.knowledge_change_proposals.c.proposal_id == proposal_id)
                    .with_for_update()
                )
            )
            .mappings()
            .one_or_none()
        )
        if proposal is None:
            raise LookupError("knowledge_proposal_not_found")
        if proposal["status"] in {"committed", "rejected", "deferred", "discarded"}:
            return dict(proposal)
        if proposal["status"] not in {"awaiting_review", "approved"}:
            raise ValueError("knowledge_proposal_not_reviewable")
        run_row = (
            (
                await connection.execute(
                    sa.select(tables.obsidian_organizer_runs)
                    .where(tables.obsidian_organizer_runs.c.run_id == proposal["run_id"])
                    .with_for_update()
                )
            )
            .mappings()
            .one()
        )
        await connection.execute(
            tables.knowledge_change_proposals.update()
            .where(tables.knowledge_change_proposals.c.proposal_id == proposal_id)
            .values(
                status="approved" if action == "approve" else "rejected",
                reviewer_id=reviewer_id,
                reviewed_at=datetime.now(UTC),
            )
        )
        reviewed_rows = (
            (
                await connection.execute(
                    sa.select(tables.knowledge_change_proposals).where(
                        tables.knowledge_change_proposals.c.run_id == proposal["run_id"]
                    )
                )
            )
            .mappings()
            .all()
        )
        if any(row["status"] == "awaiting_review" for row in reviewed_rows):
            return {
                **dict(proposal),
                "status": "approved" if action == "approve" else "rejected",
            }
        decisions = {
            str(row["proposal_id"]): ("approve" if row["status"] == "approved" else "reject")
            for row in reviewed_rows
        }
        run = dict(run_row)
        source_rows = (
            (
                await connection.execute(
                    sa.select(
                        tables.knowledge_source_records,
                        tables.knowledge_source_payloads.c.content,
                    )
                    .join(
                        tables.knowledge_source_payloads,
                        tables.knowledge_source_payloads.c.source_record_id
                        == tables.knowledge_source_records.c.source_record_id,
                    )
                    .where(
                        tables.knowledge_source_records.c.source_record_id.in_(
                            list(run_row["source_record_ids"])
                        )
                    )
                )
            )
            .mappings()
            .all()
        )
        await connection.execute(
            tables.obsidian_organizer_runs.update()
            .where(tables.obsidian_organizer_runs.c.run_id == proposal["run_id"])
            .values(
                knowledge_status="committing",
                error_code=None,
            )
        )
    if run is None:
        raise RuntimeError("knowledge_review_run_missing")
    async with open_postgres_checkpointer(get_settings().database_url.get_secret_value()) as saver:
        graph = _build_business_knowledge_graph(
            run=run,
            source_rows=source_rows,
            checkpointer=saver,
        )
        result = await graph.ainvoke(
            Command(
                resume={
                    "reviewer_id": reviewer_id,
                    "decisions": decisions,
                }
            ),
            _knowledge_graph_config(run),
        )
    if result.get("workflow_status") != "completed":
        raise RuntimeError("knowledge_review_resume_incomplete")
    async with get_engine().connect() as connection:
        return dict(
            (
                await connection.execute(
                    sa.select(tables.knowledge_change_proposals).where(
                        tables.knowledge_change_proposals.c.proposal_id == proposal_id
                    )
                )
            )
            .mappings()
            .one()
        )


async def _refresh_organizer_review_status(
    connection: AsyncConnection,
    run_id: str,
) -> None:
    statuses = list(
        (
            await connection.scalars(
                sa.select(tables.knowledge_change_proposals.c.status).where(
                    tables.knowledge_change_proposals.c.run_id == run_id
                )
            )
        ).all()
    )
    if not statuses or any(status in {"awaiting_review", "approved"} for status in statuses):
        return
    if "committed" in statuses:
        knowledge_status = "validation_scheduled"
        error_code = "some_knowledge_proposals_deferred" if "deferred" in statuses else None
    elif "deferred" in statuses:
        knowledge_status = "needs_more_context"
        error_code = "knowledge_proposals_deferred"
    elif "discarded" in statuses:
        knowledge_status = "needs_more_context"
        error_code = "knowledge_proposals_discarded"
    else:
        knowledge_status = "rejected"
        error_code = None
    await connection.execute(
        tables.obsidian_organizer_runs.update()
        .where(tables.obsidian_organizer_runs.c.run_id == run_id)
        .values(
            knowledge_status=knowledge_status,
            error_code=error_code,
        )
    )


async def _commit_create_proposal(
    connection: AsyncConnection,
    proposal: sa.RowMapping,
) -> str:
    candidate = (
        (
            await connection.execute(
                sa.select(tables.atomic_knowledge_candidates).where(
                    tables.atomic_knowledge_candidates.c.candidate_id == proposal["candidate_id"]
                )
            )
        )
        .mappings()
        .one()
    )
    now = datetime.now(UTC)
    source = (
        (
            await connection.execute(
                sa.select(tables.knowledge_source_records).where(
                    tables.knowledge_source_records.c.source_record_id
                    == candidate["source_record_id"]
                )
            )
        )
        .mappings()
        .one()
    )
    captured_asset_id = (
        str(source["source_key"]).removeprefix("asset:")
        if source["provider"] == "learning_asset_capture"
        and str(source["source_key"]).startswith("asset:")
        else None
    )
    captured_asset = (
        (
            await connection.execute(
                sa.select(tables.learning_asset_index).where(
                    tables.learning_asset_index.c.asset_id == captured_asset_id,
                    tables.learning_asset_index.c.learner_id == proposal["learner_id"],
                )
            )
        )
        .mappings()
        .one_or_none()
        if captured_asset_id is not None
        else None
    )
    if captured_asset is not None:
        capture_already_claimed = await connection.scalar(
            sa.select(sa.func.count())
            .select_from(tables.knowledge_change_proposals)
            .join(
                tables.atomic_knowledge_candidates,
                tables.atomic_knowledge_candidates.c.candidate_id
                == tables.knowledge_change_proposals.c.candidate_id,
            )
            .where(
                tables.atomic_knowledge_candidates.c.source_record_id
                == candidate["source_record_id"],
                tables.knowledge_change_proposals.c.committed_asset_id == captured_asset_id,
                tables.knowledge_change_proposals.c.proposal_id != proposal["proposal_id"],
            )
        )
        if capture_already_claimed:
            captured_asset = None
    if captured_asset is not None:
        asset_id = str(captured_asset["asset_id"])
        asset_version = int(captured_asset["version"])
    else:
        asset_id = f"asset_{sha256(str(proposal['proposal_id']).encode()).hexdigest()[:32]}"
        asset_version = 1
        await connection.execute(
            pg_insert(tables.learning_asset_index)
            .values(
                asset_id=asset_id,
                learner_id=proposal["learner_id"],
                asset_kind=_asset_kind(str(candidate["knowledge_kind"])),
                display_title=candidate["title"],
                tag_index=["knowledge-proposal", str(candidate["knowledge_kind"])],
                source_type="import",
                source_title="Obsidian organizer proposal",
                source_task_id=None,
                source_annotation_id=None,
                source_intervention_id=None,
                vault_provider="obsidian",
                vault_id=None,
                document_id=None,
                relative_path=None,
                document_uri=None,
                content_hash=None,
                document_updated_at=None,
                evidence_status="pending_validation",
                evidence_count=0,
                last_verified_at=None,
                next_review_at=now,
                starred=False,
                sync_status="pending_export",
                sync_error_code=None,
                indexed_at=None,
                created_at=now,
                updated_at=now,
                version=1,
            )
            .on_conflict_do_nothing(index_elements=["asset_id"])
        )
        message_id = _stable_uuid(f"knowledge-export:create:{proposal['proposal_id']}")
        await connection.execute(
            pg_insert(tables.outbox_messages)
            .values(
                message_id=message_id,
                topic="asset_export_requested",
                aggregate_id=asset_id,
                payload={
                    "export_id": str(message_id),
                    "asset_id": asset_id,
                    "export_schema_version": "asset/v1",
                    "operation": "CREATE",
                    "initial_content": (
                        f"# {candidate['title']}\n\n{candidate['claim']}\n\n"
                        f"<!-- source_record:{candidate['source_record_id']} -->"
                    ),
                    "knowledge_proposal_id": proposal["proposal_id"],
                },
                status="pending",
                attempt_count=0,
                occurred_at=now,
                available_at=now,
                processed_at=None,
            )
            .on_conflict_do_nothing(index_elements=["message_id"])
        )
    relation_key = f"derived:{asset_id}:{candidate['source_record_id']}"
    await connection.execute(
        pg_insert(tables.knowledge_relations)
        .values(
            relation_id=f"knowledge_relation_{sha256(relation_key.encode()).hexdigest()[:36]}",
            learner_id=proposal["learner_id"],
            relation_type="DERIVED_FROM",
            from_entity_id=asset_id,
            from_version=asset_version,
            to_entity_id=candidate["source_record_id"],
            to_version=1,
            source_spans=list(candidate["source_spans"]),
            supersedes_relation_id=None,
            idempotency_key=relation_key,
            created_at=now,
        )
        .on_conflict_do_nothing(index_elements=["idempotency_key"])
    )
    return asset_id


async def _commit_knowledge_review(
    *,
    run_id: str,
    state: KnowledgeOrganizationState,
    commit_key: str,
) -> tuple[str, ...]:
    del commit_key
    review = state.get("review_decision")
    if not isinstance(review, dict) or not isinstance(review.get("decisions"), dict):
        raise ValueError("knowledge_commit_requires_review_decisions")
    decisions = dict(review["decisions"])
    committed_asset_ids: list[str] = []
    async with get_engine().begin() as connection:
        await connection.execute(
            sa.select(tables.obsidian_organizer_runs.c.run_id)
            .where(tables.obsidian_organizer_runs.c.run_id == run_id)
            .with_for_update()
        )
        for proposal_id in sorted(decisions):
            proposal = (
                (
                    await connection.execute(
                        sa.select(tables.knowledge_change_proposals)
                        .where(
                            tables.knowledge_change_proposals.c.proposal_id == proposal_id,
                            tables.knowledge_change_proposals.c.run_id == run_id,
                        )
                        .with_for_update()
                    )
                )
                .mappings()
                .one()
            )
            if proposal["status"] in {"committed", "rejected", "deferred", "discarded"}:
                if proposal["committed_asset_id"]:
                    committed_asset_ids.append(str(proposal["committed_asset_id"]))
                continue
            if decisions[proposal_id] == "reject":
                await _set_proposal_terminal(
                    connection,
                    proposal_id,
                    status="rejected",
                )
                continue
            action = KnowledgeChangeAction(str(proposal["action"]))
            if action is KnowledgeChangeAction.DISCARD:
                await _set_proposal_terminal(connection, proposal_id, status="discarded")
                continue
            if action is KnowledgeChangeAction.DEFER:
                await _set_proposal_terminal(connection, proposal_id, status="deferred")
                continue
            if action is KnowledgeChangeAction.CREATE:
                asset_id = await _commit_create_proposal(connection, proposal)
            elif action is KnowledgeChangeAction.LINK:
                asset_id = await _commit_link_proposal(connection, proposal)
            else:
                asset_id = await _commit_versioned_patch(connection, proposal, action)
            committed_asset_ids.append(asset_id)
            await _set_proposal_terminal(
                connection,
                proposal_id,
                status="committed",
                asset_id=asset_id,
            )
        await _refresh_organizer_review_status(connection, run_id)
    return tuple(dict.fromkeys(committed_asset_ids))


async def _set_proposal_terminal(
    connection: AsyncConnection,
    proposal_id: str,
    *,
    status: str,
    asset_id: str | None = None,
) -> None:
    await connection.execute(
        tables.knowledge_change_proposals.update()
        .where(tables.knowledge_change_proposals.c.proposal_id == proposal_id)
        .values(status=status, committed_asset_id=asset_id)
    )


async def _commit_link_proposal(
    connection: AsyncConnection,
    proposal: sa.RowMapping,
) -> str:
    matches = list(proposal["existing_asset_matches"])
    if not matches:
        raise RuntimeError("knowledge_link_target_missing")
    asset_id = str(matches[0]["asset_id"])
    await _insert_candidate_relation(
        connection,
        proposal,
        asset_id=asset_id,
        asset_version=int(matches[0]["asset_version"]),
        relation_type="DERIVED_FROM",
    )
    return asset_id


async def _commit_versioned_patch(
    connection: AsyncConnection,
    proposal: sa.RowMapping,
    action: KnowledgeChangeAction,
) -> str:
    matches = list(proposal["existing_asset_matches"])
    if not matches or proposal["expected_asset_version"] is None:
        raise RuntimeError("knowledge_patch_target_missing")
    asset_id = str(matches[0]["asset_id"])
    asset = (
        (
            await connection.execute(
                sa.select(tables.learning_asset_index)
                .where(tables.learning_asset_index.c.asset_id == asset_id)
                .with_for_update()
            )
        )
        .mappings()
        .one()
    )
    expected_version = int(proposal["expected_asset_version"])
    if int(asset["version"]) != expected_version:
        raise RuntimeError("knowledge_asset_version_conflict")
    candidate = (
        (
            await connection.execute(
                sa.select(tables.atomic_knowledge_candidates).where(
                    tables.atomic_knowledge_candidates.c.candidate_id == proposal["candidate_id"]
                )
            )
        )
        .mappings()
        .one()
    )
    marker = f"<!-- knowledge_proposal:{proposal['proposal_id']} -->"
    heading = {
        KnowledgeChangeAction.MERGE: "知识补充",
        KnowledgeChangeAction.SUPERSEDE: "来源更新",
        KnowledgeChangeAction.MARK_CONFLICT: "待核验证据冲突",
    }[action]
    patch_content = f"\n\n## {heading}\n\n{candidate['claim']}\n\n{marker}\n"
    now = datetime.now(UTC)
    updated = await connection.execute(
        tables.learning_asset_index.update()
        .where(
            tables.learning_asset_index.c.asset_id == asset_id,
            tables.learning_asset_index.c.version == expected_version,
        )
        .values(
            version=expected_version + 1,
            sync_status="pending_export",
            sync_error_code=None,
            evidence_status=(
                "evidence_conflict"
                if action is KnowledgeChangeAction.MARK_CONFLICT
                else asset["evidence_status"]
            ),
            updated_at=now,
        )
    )
    if not updated.rowcount:
        raise RuntimeError("knowledge_asset_version_conflict")
    message_id = _stable_uuid(f"knowledge-export:patch:{proposal['proposal_id']}")
    await connection.execute(
        pg_insert(tables.outbox_messages)
        .values(
            message_id=message_id,
            topic="asset_export_requested",
            aggregate_id=asset_id,
            payload={
                "export_id": str(message_id),
                "asset_id": asset_id,
                "export_schema_version": "asset/v2",
                "operation": "APPEND_PATCH",
                "source_key": asset["relative_path"],
                "expected_content_hash": asset["content_hash"],
                "patch_content": patch_content,
                "knowledge_proposal_id": proposal["proposal_id"],
            },
            status="pending",
            attempt_count=0,
            occurred_at=now,
            available_at=now,
            processed_at=None,
        )
        .on_conflict_do_nothing(index_elements=["message_id"])
    )
    if action is KnowledgeChangeAction.MARK_CONFLICT:
        await connection.execute(
            pg_insert(tables.learning_evidence)
            .values(
                evidence_id=(
                    "evidence_knowledge_conflict_"
                    + sha256(str(proposal["proposal_id"]).encode()).hexdigest()[:32]
                ),
                learner_id=proposal["learner_id"],
                asset_id=asset_id,
                evidence_type="conflict",
                workflow_run_id=None,
                task_id=None,
                source_version=expected_version + 1,
                observed_at=now,
                detail={
                    "knowledge_proposal_id": str(proposal["proposal_id"]),
                    "candidate_id": str(proposal["candidate_id"]),
                    "source_spans": list(proposal["source_spans"]),
                },
            )
            .on_conflict_do_nothing(index_elements=["evidence_id"])
        )
        await refresh_asset_projection(
            connection,
            learner_id=str(proposal["learner_id"]),
            asset_id=asset_id,
            now=now,
            increment_version=False,
        )
    await _insert_candidate_relation(
        connection,
        proposal,
        asset_id=asset_id,
        asset_version=expected_version + 1,
        relation_type=(
            "CONTRADICTS" if action is KnowledgeChangeAction.MARK_CONFLICT else "DERIVED_FROM"
        ),
    )
    return asset_id


async def _insert_candidate_relation(
    connection: AsyncConnection,
    proposal: sa.RowMapping,
    *,
    asset_id: str,
    asset_version: int,
    relation_type: str,
) -> None:
    candidate = (
        (
            await connection.execute(
                sa.select(tables.atomic_knowledge_candidates).where(
                    tables.atomic_knowledge_candidates.c.candidate_id == proposal["candidate_id"]
                )
            )
        )
        .mappings()
        .one()
    )
    key = (
        f"{relation_type.casefold()}:{proposal['proposal_id']}:"
        f"{asset_id}:{candidate['source_record_id']}"
    )
    await connection.execute(
        pg_insert(tables.knowledge_relations)
        .values(
            relation_id=f"knowledge_relation_{sha256(key.encode()).hexdigest()[:36]}",
            learner_id=proposal["learner_id"],
            relation_type=relation_type,
            from_entity_id=asset_id,
            from_version=asset_version,
            to_entity_id=candidate["source_record_id"],
            to_version=1,
            source_spans=list(candidate["source_spans"]),
            supersedes_relation_id=None,
            idempotency_key=key,
            created_at=datetime.now(UTC),
        )
        .on_conflict_do_nothing(index_elements=["idempotency_key"])
    )


def _stable_uuid(value: str) -> UUID:
    return UUID(sha256(value.encode()).hexdigest()[:32])


def _asset_kind(knowledge_kind: str) -> str:
    return {
        "word_sense": "vocabulary",
        "collocation": "writing_expression",
        "grammar": "grammar",
        "reading_skill": "reading_skill",
        "expression_skill": "writing_skill",
        "error_hypothesis": "exam_skill",
        "example": "reading_skill",
    }[knowledge_kind]
