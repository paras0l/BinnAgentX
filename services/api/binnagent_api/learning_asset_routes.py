"""Metadata-only learner asset index endpoints.

The browser never receives Obsidian note bodies. It only owns BinnAgent product
preferences and evidence metadata, while the vault bridge owns note creation
and opening behind a restricted adapter.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import sqlalchemy as sa
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from binnagent_api.database import get_engine
from binnagent_api.knowledge_vault import KnowledgeVaultError, knowledge_vault_from_settings
from binnagent_api.learner_auth import LearnerIdentity
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

learning_asset_router = APIRouter(prefix="/v1/assets", tags=["learning-assets"])

_ASSET_KINDS = {
    "vocabulary",
    "grammar",
    "writing_expression",
    "reading_skill",
    "exam_skill",
    "writing_skill",
}
_EVIDENCE_STATUSES = {
    "pending_validation",
    "developing",
    "hinted_usable",
    "independently_usable",
    "awaiting_delayed_validation",
    "delayed_stable",
    "evidence_conflict",
}
_SOURCE_TYPES = {"manual", "task", "annotation", "intervention", "import"}


class CreateLearningAssetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: str
    title: str = Field(min_length=1, max_length=240)
    tags: list[str] = Field(default_factory=list, max_length=12)
    source_type: str = Field(default="manual", min_length=1, max_length=32)
    source_title: str | None = Field(default=None, max_length=240)
    source_task_id: str | None = Field(default=None, max_length=128)
    source_annotation_id: str | None = Field(default=None, max_length=128)
    source_intervention_id: str | None = Field(default=None, max_length=128)

    @field_validator("kind")
    @classmethod
    def valid_kind(cls, value: str) -> str:
        if value not in _ASSET_KINDS:
            raise ValueError("asset_kind_invalid")
        return value

    @field_validator("source_type")
    @classmethod
    def valid_source_type(cls, value: str) -> str:
        if value not in _SOURCE_TYPES:
            raise ValueError("asset_source_type_invalid")
        return value

    @field_validator("title")
    @classmethod
    def normalized_title(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("asset_title_required")
        return normalized

    @field_validator("tags")
    @classmethod
    def normalized_tags(cls, values: list[str]) -> list[str]:
        normalized = []
        for value in values:
            tag = "-".join(value.strip().split())
            if not tag or len(tag) > 48 or not all(char.isalnum() or char in "_-" for char in tag):
                raise ValueError("asset_tag_invalid")
            if tag not in normalized:
                normalized.append(tag)
        return normalized


class AssetStarRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    starred: bool
    expected_version: int = Field(ge=1)


class LearningAssetView(BaseModel):
    asset_id: str
    kind: str
    title: str
    tags: list[str]
    source_type: str
    source_title: str | None
    source_task_id: str | None
    evidence_status: str
    evidence_count: int
    last_verified_at: datetime | None
    next_review_at: datetime | None
    starred: bool
    sync_status: str
    sync_error_code: str | None
    document_uri: str | None
    document_updated_at: datetime | None
    created_at: datetime
    updated_at: datetime
    version: int


def _asset_view(row: sa.RowMapping) -> LearningAssetView:
    return LearningAssetView(
        asset_id=str(row["asset_id"]),
        kind=str(row["asset_kind"]),
        title=str(row["display_title"]),
        tags=list(row["tag_index"]),
        source_type=str(row["source_type"]),
        source_title=row["source_title"],
        source_task_id=row["source_task_id"],
        evidence_status=str(row["evidence_status"]),
        evidence_count=int(row["evidence_count"]),
        last_verified_at=row["last_verified_at"],
        next_review_at=row["next_review_at"],
        starred=bool(row["starred"]),
        sync_status=str(row["sync_status"]),
        sync_error_code=row["sync_error_code"],
        document_uri=row["document_uri"],
        document_updated_at=row["document_updated_at"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        version=int(row["version"]),
    )


async def _owned_asset(
    connection: sa.AsyncConnection, learner_id: str, asset_id: str
) -> sa.RowMapping:
    row = (
        (
            await connection.execute(
                sa.select(tables.learning_asset_index).where(
                    tables.learning_asset_index.c.asset_id == asset_id,
                    tables.learning_asset_index.c.learner_id == learner_id,
                )
            )
        )
        .mappings()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="asset_not_found")
    return row


@learning_asset_router.get("", response_model=list[LearningAssetView])
async def list_learning_assets(request: Request) -> list[LearningAssetView]:
    identity: LearnerIdentity = request.state.learner_identity
    async with get_engine().connect() as connection:
        rows = (
            (
                await connection.execute(
                    sa.select(tables.learning_asset_index)
                    .where(tables.learning_asset_index.c.learner_id == identity.learner_id)
                    .order_by(
                        tables.learning_asset_index.c.starred.desc(),
                        tables.learning_asset_index.c.created_at.desc(),
                    )
                )
            )
            .mappings()
            .all()
        )
    return [_asset_view(row) for row in rows]


@learning_asset_router.get("/{asset_id}", response_model=LearningAssetView)
async def get_learning_asset(asset_id: str, request: Request) -> LearningAssetView:
    identity: LearnerIdentity = request.state.learner_identity
    async with get_engine().connect() as connection:
        return _asset_view(await _owned_asset(connection, identity.learner_id, asset_id))


@learning_asset_router.post(
    "", response_model=LearningAssetView, status_code=status.HTTP_201_CREATED
)
async def create_learning_asset(
    body: CreateLearningAssetRequest,
    request: Request,
) -> LearningAssetView:
    identity: LearnerIdentity = request.state.learner_identity
    now = datetime.now(UTC)
    asset_id = f"asset_{uuid4().hex}"
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.learning_asset_index.insert().values(
                asset_id=asset_id,
                learner_id=identity.learner_id,
                asset_kind=body.kind,
                display_title=body.title,
                tag_index=body.tags,
                source_type=body.source_type,
                source_title=body.source_title,
                source_task_id=body.source_task_id,
                source_annotation_id=body.source_annotation_id,
                source_intervention_id=body.source_intervention_id,
                vault_provider="obsidian",
                vault_id=get_settings().obsidian_vault_name,
                document_id=None,
                relative_path=None,
                document_uri=None,
                content_hash=None,
                document_updated_at=None,
                evidence_status="pending_validation",
                evidence_count=0,
                last_verified_at=None,
                next_review_at=None,
                starred=False,
                sync_status="pending_export",
                sync_error_code=None,
                indexed_at=None,
                created_at=now,
                updated_at=now,
                version=1,
            )
        )
        await connection.execute(
            tables.outbox_messages.insert().values(
                message_id=uuid4(),
                topic="asset_export_requested",
                aggregate_id=asset_id,
                payload={"asset_id": asset_id, "export_schema_version": "asset/v1"},
                status="pending",
                attempt_count=0,
                occurred_at=now,
                available_at=now,
                processed_at=None,
            )
        )
    return await _export_asset(identity.learner_id, asset_id)


@learning_asset_router.post("/{asset_id}/sync", response_model=LearningAssetView)
async def sync_learning_asset(asset_id: str, request: Request) -> LearningAssetView:
    identity: LearnerIdentity = request.state.learner_identity
    return await _export_asset(identity.learner_id, asset_id)


@learning_asset_router.post("/{asset_id}/open", status_code=status.HTTP_204_NO_CONTENT)
async def open_learning_asset(asset_id: str, request: Request) -> None:
    identity: LearnerIdentity = request.state.learner_identity
    async with get_engine().connect() as connection:
        row = await _owned_asset(connection, identity.learner_id, asset_id)
    relative_path = row["relative_path"]
    if not relative_path:
        raise HTTPException(status_code=409, detail="asset_note_not_synced")
    try:
        await knowledge_vault_from_settings(get_settings()).open_note(str(relative_path))
    except KnowledgeVaultError as exc:
        raise HTTPException(status_code=503, detail=exc.code) from exc


@learning_asset_router.post("/{asset_id}/star", response_model=LearningAssetView)
async def star_learning_asset(
    asset_id: str,
    body: AssetStarRequest,
    request: Request,
) -> LearningAssetView:
    identity: LearnerIdentity = request.state.learner_identity
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        row = await _owned_asset(connection, identity.learner_id, asset_id)
        if int(row["version"]) != body.expected_version:
            raise HTTPException(status_code=409, detail="asset_version_conflict")
        await connection.execute(
            tables.learning_asset_index.update()
            .where(tables.learning_asset_index.c.asset_id == asset_id)
            .values(starred=body.starred, version=int(row["version"]) + 1, updated_at=now)
        )
        updated = await _owned_asset(connection, identity.learner_id, asset_id)
    return _asset_view(updated)


async def _export_asset(learner_id: str, asset_id: str) -> LearningAssetView:
    async with get_engine().connect() as connection:
        row = await _owned_asset(connection, learner_id, asset_id)
    try:
        created = await knowledge_vault_from_settings(get_settings()).create_note_skeleton(
            asset_id=asset_id,
            kind=str(row["asset_kind"]),
            title=str(row["display_title"]),
            tags=tuple(str(tag) for tag in row["tag_index"]),
            source_type=str(row["source_type"]),
            source_task_id=row["source_task_id"],
        )
    except KnowledgeVaultError as exc:
        if exc.code == "knowledge_vault_unavailable":
            return _asset_view(row)
        now = datetime.now(UTC)
        async with get_engine().begin() as connection:
            await connection.execute(
                tables.learning_asset_index.update()
                .where(tables.learning_asset_index.c.asset_id == asset_id)
                .values(sync_status="error", sync_error_code=exc.code, updated_at=now)
            )
            updated = await _owned_asset(connection, learner_id, asset_id)
        return _asset_view(updated)

    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.learning_asset_index.update()
            .where(tables.learning_asset_index.c.asset_id == asset_id)
            .values(
                document_id=created.document_id,
                relative_path=created.relative_path,
                document_uri=created.document_uri,
                content_hash=created.content_hash,
                document_updated_at=now,
                indexed_at=now,
                sync_status="synced",
                sync_error_code=None,
                updated_at=now,
            )
        )
        updated = await _owned_asset(connection, learner_id, asset_id)
    return _asset_view(updated)
