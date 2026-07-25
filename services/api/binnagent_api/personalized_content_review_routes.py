"""Developer review surface for durable personalized-content packages."""

from __future__ import annotations

from typing import Annotated, Any, Literal

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.database import get_engine
from binnagent_api.personalized_material_service import review_personalized_material
from binnagent_api.vertical_slice import tables

personalized_content_review_router = APIRouter(
    prefix="/v1/personalized-content",
    tags=["personalized-content-review"],
)

RepairScope = Literal[
    "article",
    "question_bank",
    "grammar_annotations",
    "transfer_contract",
]


class PersonalizedContentReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: Literal["approve", "reject", "revise"]
    reason: str = Field(min_length=3, max_length=500)
    repair_scope: RepairScope | None = None

    @model_validator(mode="after")
    def validate_repair_scope(self) -> PersonalizedContentReviewRequest:
        if self.action == "revise" and self.repair_scope is None:
            raise ValueError("repair_scope_required_for_revision")
        if self.action != "revise" and self.repair_scope is not None:
            raise ValueError("repair_scope_only_allowed_for_revision")
        return self


@personalized_content_review_router.get("/reviews")
async def list_personalized_content_reviews(
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
    status: Literal["awaiting_review", "ready", "rejected"] = "awaiting_review",
) -> list[dict[str, Any]]:
    del identity
    async with get_engine().connect() as connection:
        rows = (
            (
                await connection.execute(
                    sa.select(tables.personalized_training_materials)
                    .where(
                        tables.personalized_training_materials.c.status == status,
                        tables.personalized_training_materials.c.runtime_kind == "langgraph",
                    )
                    .order_by(tables.personalized_training_materials.c.created_at)
                    .limit(100)
                )
            )
            .mappings()
            .all()
        )
    return [dict(row) for row in rows]


@personalized_content_review_router.post("/reviews/{material_id}")
async def review_personalized_content(
    material_id: str,
    body: PersonalizedContentReviewRequest,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> dict[str, Any]:
    try:
        return await review_personalized_material(
            material_id=material_id,
            reviewer_id=identity.role,
            action=body.action,
            reason=body.reason,
            repair_scope=body.repair_scope,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
