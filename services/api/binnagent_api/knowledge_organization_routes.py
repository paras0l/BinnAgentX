"""Developer review surface for existing organizer-run knowledge proposals."""

from __future__ import annotations

from typing import Annotated, Any, Literal

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.database import get_engine
from binnagent_api.knowledge_organization_service import review_knowledge_proposal
from binnagent_api.vertical_slice import tables

knowledge_organization_control_router = APIRouter(
    prefix="/v1/knowledge-organization",
    tags=["knowledge-organization"],
)


class KnowledgeProposalReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: Literal["approve", "reject"]


@knowledge_organization_control_router.get("/proposals")
async def list_knowledge_proposals(
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
    status: Literal[
        "awaiting_review",
        "approved",
        "committed",
        "rejected",
        "deferred",
        "discarded",
    ] = "awaiting_review",
) -> list[dict[str, Any]]:
    del identity
    async with get_engine().connect() as connection:
        rows = (
            (
                await connection.execute(
                    sa.select(
                        tables.knowledge_change_proposals,
                        tables.atomic_knowledge_candidates.c.knowledge_kind,
                        tables.atomic_knowledge_candidates.c.canonical_key,
                        tables.atomic_knowledge_candidates.c.title,
                        tables.atomic_knowledge_candidates.c.claim,
                    )
                    .join(
                        tables.atomic_knowledge_candidates,
                        tables.atomic_knowledge_candidates.c.candidate_id
                        == tables.knowledge_change_proposals.c.candidate_id,
                    )
                    .where(tables.knowledge_change_proposals.c.status == status)
                    .order_by(tables.knowledge_change_proposals.c.created_at)
                    .limit(100)
                )
            )
            .mappings()
            .all()
        )
    return [dict(row) for row in rows]


@knowledge_organization_control_router.post("/proposals/{proposal_id}/review")
async def review_proposal(
    proposal_id: str,
    body: KnowledgeProposalReviewRequest,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> dict[str, Any]:
    try:
        return await review_knowledge_proposal(
            proposal_id=proposal_id,
            reviewer_id=identity.role,
            action=body.action,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
