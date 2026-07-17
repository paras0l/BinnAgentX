from datetime import datetime, timedelta
from typing import Annotated, Any, Literal

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.database import get_engine
from binnagent_api.learner_auth import (
    generate_experience_code,
    hash_experience_code,
    new_id,
    utc_now,
)
from binnagent_api.vertical_slice import tables

experience_control_router = APIRouter(prefix="/v1/experience-codes", tags=["experience-codes"])


class CreateExperienceCodeRequest(BaseModel):
    label: str = Field(min_length=1, max_length=100)
    max_uses: int = Field(default=25, ge=1, le=10_000)
    valid_days: int = Field(default=7, ge=1, le=90)

    @field_validator("label")
    @classmethod
    def normalized_label(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("experience_code_label_required")
        return normalized


class ExperienceCodeView(BaseModel):
    code_id: str
    code_hint: str
    label: str
    status: Literal["active", "exhausted", "expired", "revoked"]
    max_uses: int
    used_count: int
    available_uses: int
    created_at: datetime
    expires_at: datetime
    last_used_at: datetime | None
    revoked_at: datetime | None


class CreatedExperienceCodeView(ExperienceCodeView):
    experience_code: str


@experience_control_router.get("", response_model=list[ExperienceCodeView])
async def list_experience_codes(
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> list[ExperienceCodeView]:
    now = utc_now()
    async with get_engine().connect() as connection:
        rows = (
            (
                await connection.execute(
                    sa.select(tables.experience_codes).order_by(
                        tables.experience_codes.c.created_at.desc()
                    )
                )
            )
            .mappings()
            .all()
        )
    return [_view(row, now) for row in rows]


@experience_control_router.post(
    "",
    response_model=CreatedExperienceCodeView,
    status_code=status.HTTP_201_CREATED,
)
async def create_experience_code(
    body: CreateExperienceCodeRequest,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> CreatedExperienceCodeView:
    now = utc_now()
    expires_at = now + timedelta(days=body.valid_days)
    async with get_engine().begin() as connection:
        raw_code = ""
        code_hash = ""
        for _ in range(4):
            raw_code = generate_experience_code()
            code_hash = hash_experience_code(raw_code)
            exists = await connection.scalar(
                sa.select(tables.experience_codes.c.code_id).where(
                    tables.experience_codes.c.code_hash == code_hash
                )
            )
            if exists is None:
                break
        else:
            raise HTTPException(status_code=503, detail="experience_code_generation_unavailable")

        code_id = new_id("experience_code")
        values = {
            "code_id": code_id,
            "code_hash": code_hash,
            "code_hint": f"TRY-…-{raw_code[-5:]}",
            "label": body.label,
            "max_uses": body.max_uses,
            "used_count": 0,
            "created_by_role": identity.role,
            "revoked_by_role": None,
            "created_at": now,
            "expires_at": expires_at,
            "last_used_at": None,
            "revoked_at": None,
        }
        await connection.execute(tables.experience_codes.insert().values(**values))
    return CreatedExperienceCodeView(
        **_view(values, now).model_dump(),
        experience_code=raw_code,
    )


@experience_control_router.post("/{code_id}/revoke", response_model=ExperienceCodeView)
async def revoke_experience_code(
    code_id: str,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ExperienceCodeView:
    now = utc_now()
    async with get_engine().begin() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.experience_codes)
                    .where(tables.experience_codes.c.code_id == code_id)
                    .with_for_update()
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            raise HTTPException(status_code=404, detail="experience_code_not_found")
        row_values = dict(row)
        if row["revoked_at"] is None:
            await connection.execute(
                tables.experience_codes.update()
                .where(tables.experience_codes.c.code_id == code_id)
                .values(revoked_at=now, revoked_by_role=identity.role)
            )
            row_values.update(revoked_at=now, revoked_by_role=identity.role)
    return _view(row_values, now)


def _view(row: Any, now: datetime) -> ExperienceCodeView:
    revoked_at = row["revoked_at"]
    expires_at = row["expires_at"]
    used_count = int(row["used_count"])
    max_uses = int(row["max_uses"])
    code_status: Literal["active", "exhausted", "expired", "revoked"]
    if revoked_at is not None:
        code_status = "revoked"
    elif expires_at <= now:
        code_status = "expired"
    elif used_count >= max_uses:
        code_status = "exhausted"
    else:
        code_status = "active"
    return ExperienceCodeView(
        code_id=str(row["code_id"]),
        code_hint=str(row["code_hint"]),
        label=str(row["label"]),
        status=code_status,
        max_uses=max_uses,
        used_count=used_count,
        available_uses=max(0, max_uses - used_count),
        created_at=row["created_at"],
        expires_at=expires_at,
        last_used_at=row["last_used_at"],
        revoked_at=revoked_at,
    )
