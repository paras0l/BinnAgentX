"""Metadata-only learner asset index endpoints.

The browser never receives Obsidian note bodies. It only owns BinnAgent product
preferences and evidence metadata, while the vault bridge owns note creation
and opening behind a restricted adapter.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from urllib.parse import quote
from uuid import UUID, uuid4

import sqlalchemy as sa
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.errors import DomainError
from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.asset_capture_service import (
    deserialize_asset_capture_source,
    enqueue_asset_capture_organization,
)
from binnagent_api.asset_content_denoiser import (
    LearningAssetCapture,
    denoise_asset_content,
    project_asset_capture,
    render_raw_asset_capture,
)
from binnagent_api.database import get_engine
from binnagent_api.knowledge_vault import (
    KnowledgeVaultError,
    KnowledgeVaultStatus,
    knowledge_vault_from_settings,
)
from binnagent_api.learner_auth import LearnerIdentity
from binnagent_api.obsidian_organizer import (
    complete_organization,
    enqueue_manual_organization,
    plan_pending_organization,
)
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

learning_asset_router = APIRouter(prefix="/v1/assets", tags=["learning-assets"])
obsidian_sync_router = APIRouter(prefix="/v1/obsidian-sync", tags=["obsidian-sync"])

# The plugin sync loop runs once per minute. Missing three consecutive cycles is
# treated as a disconnected local Vault while preserving the historical pairing.
_OBSIDIAN_PLUGIN_STALE_AFTER = timedelta(minutes=3)

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
    initial_content: str | None = Field(default=None, max_length=12_000)
    capture: LearningAssetCapture | None = None

    @model_validator(mode="after")
    def content_source_is_unambiguous(self) -> CreateLearningAssetRequest:
        if self.capture is not None and self.initial_content is not None:
            raise ValueError("asset_capture_and_initial_content_are_mutually_exclusive")
        return self

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


class AssetDenoiseComparisonView(BaseModel):
    asset_id: str
    status: Literal["pending", "ready"]
    raw_capture: LearningAssetCapture
    raw_content: str
    denoised_content: str | None
    decision: Literal["KEEP", "SPLIT", "NOOP", "REVIEW"] | None
    reason_codes: list[str]
    retained_segment_ids: list[str]
    removed_segment_ids: list[str]
    before_character_count: int
    after_character_count: int
    reduction_ratio: float
    projected_at: datetime | None


class KnowledgeVaultStatusView(BaseModel):
    adapter: str
    connected: bool
    detail: str


class ObsidianPluginConnectionView(BaseModel):
    connection_id: str
    sync_secret: str


class ObsidianPluginSyncStatusView(BaseModel):
    paired: bool
    connection_state: Literal["unpaired", "waiting", "active", "stale"]
    synced_context_count: int
    last_synced_at: datetime | None


class ObsidianOrganizerRunView(BaseModel):
    run_id: str
    status: str
    next_step: str


class ObsidianContextEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_key: str = Field(min_length=1, max_length=1000)
    asset_id: str | None = Field(default=None, max_length=128)
    title: str = Field(min_length=1, max_length=240)
    kind: str
    tags: list[str] = Field(default_factory=list, max_length=24)
    excerpt: str = Field(min_length=1, max_length=1200)
    modified_at: datetime
    authorized_content: AuthorizedNoteContent | None = None

    @field_validator("kind")
    @classmethod
    def valid_context_kind(cls, value: str) -> str:
        if value not in _ASSET_KINDS:
            raise ValueError("asset_kind_invalid")
        return value

    @field_validator("authorized_content")
    @classmethod
    def content_scope_contains_source(
        cls,
        value: AuthorizedNoteContent | None,
        info: Any,
    ) -> AuthorizedNoteContent | None:
        source_key = info.data.get("source_key")
        if value is not None and (
            not isinstance(source_key, str) or not source_key.startswith(value.scope_prefix)
        ):
            raise ValueError("authorized_content_scope_mismatch")
        return value


class AuthorizedNoteContent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope_prefix: str = Field(min_length=1, max_length=500)
    content: str = Field(min_length=1, max_length=50_000)
    content_hash: str = Field(pattern=r"^[0-9a-f]{64}$")

    @field_validator("content_hash")
    @classmethod
    def hash_matches_content(cls, value: str, info: Any) -> str:
        content = info.data.get("content")
        if isinstance(content, str) and hashlib.sha256(content.encode()).hexdigest() != value:
            raise ValueError("authorized_content_hash_mismatch")
        return value


class ObsidianContextImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: str
    vault_name: str = Field(min_length=1, max_length=128)
    entries: list[ObsidianContextEntry] = Field(max_length=80)


class ObsidianOrganizationAck(BaseModel):
    model_config = ConfigDict(extra="forbid")
    completed_action_ids: list[str] = Field(max_length=80)
    completed_source_keys: dict[str, str] = Field(default_factory=dict, max_length=80)


class ObsidianAssetExportView(BaseModel):
    export_id: str
    asset_id: str
    kind: str
    title: str
    tags: list[str]
    source_type: str
    source_task_id: str | None
    initial_content: str | None
    operation: Literal["CREATE", "APPEND_PATCH"]
    source_key: str | None = None
    expected_content_hash: str | None = None
    patch_content: str | None = None
    knowledge_proposal_id: str | None = None


class ObsidianAssetExportAck(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_key: str = Field(min_length=1, max_length=1000)
    content_hash: str = Field(min_length=64, max_length=64)
    modified_at: datetime
    vault_name: str = Field(min_length=1, max_length=128)
    export_id: UUID | None = None


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
    connection: AsyncConnection, learner_id: str, asset_id: str
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


async def _require_obsidian_connection(
    connection: AsyncConnection,
    connection_id: str,
    authorization: str | None,
) -> sa.RowMapping:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="obsidian_sync_unauthorized")
    secret_hash = hashlib.sha256(authorization.removeprefix("Bearer ").encode()).hexdigest()
    row = (
        (
            await connection.execute(
                sa.select(tables.obsidian_sync_connections).where(
                    tables.obsidian_sync_connections.c.connection_id == connection_id,
                    tables.obsidian_sync_connections.c.revoked_at.is_(None),
                )
            )
        )
        .mappings()
        .one_or_none()
    )
    if row is None or not hmac.compare_digest(str(row["secret_hash"]), secret_hash):
        raise HTTPException(status_code=401, detail="obsidian_sync_unauthorized")
    return row


def _obsidian_uri(vault_name: str, source_key: str) -> str:
    return f"obsidian://open?vault={quote(vault_name)}&file={quote(source_key)}"


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


@learning_asset_router.get("/vault-status", response_model=KnowledgeVaultStatusView)
async def knowledge_vault_status() -> KnowledgeVaultStatusView:
    try:
        vault_status: KnowledgeVaultStatus = await knowledge_vault_from_settings(
            get_settings()
        ).status()
    except ValueError as exc:
        vault_status = KnowledgeVaultStatus(
            adapter="obsidian_bridge", connected=False, detail=str(exc)
        )
    return KnowledgeVaultStatusView(
        adapter=vault_status.adapter,
        connected=vault_status.connected,
        detail=vault_status.detail,
    )


@learning_asset_router.post(
    "/obsidian-plugin-connections", response_model=ObsidianPluginConnectionView
)
async def create_obsidian_plugin_connection(request: Request) -> ObsidianPluginConnectionView:
    identity: LearnerIdentity = request.state.learner_identity
    now = datetime.now(UTC)
    connection_id = f"obsync_{uuid4().hex}"
    sync_secret = secrets.token_urlsafe(32)
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.obsidian_sync_connections.insert().values(
                connection_id=connection_id,
                learner_id=identity.learner_id,
                secret_hash=hashlib.sha256(sync_secret.encode()).hexdigest(),
                created_at=now,
                last_used_at=None,
                revoked_at=None,
            )
        )
    return ObsidianPluginConnectionView(connection_id=connection_id, sync_secret=sync_secret)


@learning_asset_router.get("/obsidian-plugin-status", response_model=ObsidianPluginSyncStatusView)
async def obsidian_plugin_sync_status(request: Request) -> ObsidianPluginSyncStatusView:
    identity: LearnerIdentity = request.state.learner_identity
    async with get_engine().connect() as connection:
        paired, last_synced_at, synced_context_count = (
            await connection.execute(
                sa.select(
                    sa.func.count(tables.obsidian_sync_connections.c.connection_id),
                    sa.func.max(tables.obsidian_sync_connections.c.last_used_at),
                    sa.select(sa.func.count())
                    .select_from(tables.obsidian_learning_context)
                    .where(tables.obsidian_learning_context.c.learner_id == identity.learner_id)
                    .scalar_subquery(),
                ).where(
                    tables.obsidian_sync_connections.c.learner_id == identity.learner_id,
                    tables.obsidian_sync_connections.c.revoked_at.is_(None),
                )
            )
        ).one()
    if not paired:
        connection_state = "unpaired"
    elif last_synced_at is None:
        connection_state = "waiting"
    elif last_synced_at >= datetime.now(UTC) - _OBSIDIAN_PLUGIN_STALE_AFTER:
        connection_state = "active"
    else:
        connection_state = "stale"
    return ObsidianPluginSyncStatusView(
        paired=bool(paired),
        connection_state=connection_state,
        synced_context_count=int(synced_context_count),
        last_synced_at=last_synced_at,
    )


@learning_asset_router.post(
    "/obsidian-organizer-runs",
    response_model=ObsidianOrganizerRunView,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_obsidian_organization(request: Request) -> ObsidianOrganizerRunView:
    identity: LearnerIdentity = request.state.learner_identity
    async with get_engine().begin() as connection:
        paired = await connection.scalar(
            sa.select(sa.func.count(tables.obsidian_sync_connections.c.connection_id)).where(
                tables.obsidian_sync_connections.c.learner_id == identity.learner_id,
                tables.obsidian_sync_connections.c.revoked_at.is_(None),
            )
        )
        if not paired:
            raise DomainError(
                PublicErrorCode.OBSIDIAN_CONNECTION_REQUIRED,
                "obsidian_plugin_connection_required",
            )
        run_id, run_status = await enqueue_manual_organization(
            connection,
            learner_id=identity.learner_id,
        )
    return ObsidianOrganizerRunView(
        run_id=run_id,
        status=run_status,
        next_step="sync_obsidian_plugin",
    )


@obsidian_sync_router.post("/{connection_id}/import")
async def import_obsidian_context(
    connection_id: str,
    body: ObsidianContextImportRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    if body.schema_version != "learning-context/v1":
        raise HTTPException(status_code=401, detail="obsidian_sync_unauthorized")
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        row = await _require_obsidian_connection(connection, connection_id, authorization)
        for entry in body.entries:
            context_id = hashlib.sha256(f"{connection_id}:{entry.source_key}".encode()).hexdigest()
            content_hash = (
                entry.authorized_content.content_hash
                if entry.authorized_content is not None
                else hashlib.sha256(entry.excerpt.encode()).hexdigest()
            )
            asset_id = entry.asset_id or f"asset_obs_{context_id[:24]}"
            values = {
                "context_id": context_id,
                "asset_id": asset_id,
                "learner_id": row["learner_id"],
                "connection_id": connection_id,
                "source_key": entry.source_key,
                "title": entry.title,
                "asset_kind": entry.kind,
                "tags": entry.tags,
                "excerpt": entry.excerpt,
                "content_hash": content_hash,
                "source_modified_at": entry.modified_at,
                "received_at": now,
            }
            insert_statement = pg_insert(tables.obsidian_learning_context).values(**values)
            statement = insert_statement.on_conflict_do_update(
                index_elements=[tables.obsidian_learning_context.c.context_id], set_=values
            )
            await connection.execute(statement)
            if entry.authorized_content is not None:
                source_record_id = (
                    "knowledge_source_"
                    + hashlib.sha256(
                        (
                            f"{row['learner_id']}:{connection_id}:{entry.source_key}:"
                            f"{entry.authorized_content.content_hash}"
                        ).encode()
                    ).hexdigest()[:40]
                )
                previous_source_record_id = await connection.scalar(
                    sa.select(tables.knowledge_source_records.c.source_record_id)
                    .where(
                        tables.knowledge_source_records.c.learner_id == row["learner_id"],
                        tables.knowledge_source_records.c.connection_id == connection_id,
                        tables.knowledge_source_records.c.source_key == entry.source_key,
                        tables.knowledge_source_records.c.content_hash
                        != entry.authorized_content.content_hash,
                    )
                    .order_by(tables.knowledge_source_records.c.captured_at.desc())
                    .limit(1)
                )
                await connection.execute(
                    pg_insert(tables.knowledge_source_records)
                    .values(
                        source_record_id=source_record_id,
                        learner_id=row["learner_id"],
                        provider="obsidian_plugin",
                        connection_id=connection_id,
                        source_key=entry.source_key,
                        content_hash=entry.authorized_content.content_hash,
                        source_modified_at=entry.modified_at,
                        authorized_scope=[entry.authorized_content.scope_prefix],
                        captured_content_ref=f"db://knowledge_source_payloads/{source_record_id}",
                        supersedes_source_record_id=previous_source_record_id,
                        captured_at=now,
                    )
                    .on_conflict_do_nothing(
                        index_elements=[
                            "learner_id",
                            "connection_id",
                            "source_key",
                            "content_hash",
                        ]
                    )
                )
                await connection.execute(
                    pg_insert(tables.knowledge_source_payloads)
                    .values(
                        source_record_id=source_record_id,
                        content=entry.authorized_content.content,
                        created_at=now,
                    )
                    .on_conflict_do_nothing(index_elements=["source_record_id"])
                )
            existing_asset = (
                (
                    await connection.execute(
                        sa.select(tables.learning_asset_index).where(
                            tables.learning_asset_index.c.asset_id == asset_id,
                            tables.learning_asset_index.c.learner_id == row["learner_id"],
                        )
                    )
                )
                .mappings()
                .one_or_none()
            )
            asset_values: dict[str, Any] = {
                "asset_kind": entry.kind,
                "display_title": entry.title,
                "tag_index": entry.tags,
                "vault_provider": "obsidian_plugin",
                "vault_id": body.vault_name,
                "document_id": asset_id,
                "relative_path": entry.source_key,
                "document_uri": _obsidian_uri(body.vault_name, entry.source_key),
                "content_hash": content_hash,
                "document_updated_at": entry.modified_at,
                "sync_status": "synced",
                "sync_error_code": None,
                "indexed_at": now,
                "updated_at": now,
            }
            if existing_asset is None:
                await connection.execute(
                    tables.learning_asset_index.insert().values(
                        asset_id=asset_id,
                        learner_id=row["learner_id"],
                        source_type="import",
                        source_title="Obsidian",
                        source_task_id=None,
                        source_annotation_id=None,
                        source_intervention_id=None,
                        evidence_status="pending_validation",
                        evidence_count=0,
                        last_verified_at=None,
                        next_review_at=None,
                        starred=False,
                        created_at=now,
                        version=1,
                        **asset_values,
                    )
                )
            else:
                await connection.execute(
                    tables.learning_asset_index.update()
                    .where(tables.learning_asset_index.c.asset_id == asset_id)
                    .values(**asset_values, version=int(existing_asset["version"]) + 1)
                )
                await connection.execute(
                    tables.outbox_messages.update()
                    .where(
                        tables.outbox_messages.c.topic == "asset_export_requested",
                        tables.outbox_messages.c.aggregate_id == asset_id,
                        tables.outbox_messages.c.status == "pending",
                    )
                    .values(
                        status="processed",
                        payload={"asset_id": asset_id, "delivered_via": "obsidian_plugin"},
                        processed_at=now,
                    )
                )
        await connection.execute(
            tables.obsidian_sync_connections.update()
            .where(tables.obsidian_sync_connections.c.connection_id == connection_id)
            .values(last_used_at=now)
        )
        organization = await plan_pending_organization(
            connection,
            learner_id=str(row["learner_id"]),
            connection_id=connection_id,
        )
    return {"imported": len(body.entries), "organization": organization}


@obsidian_sync_router.post("/{connection_id}/organizer-runs/{run_id}/ack")
async def acknowledge_obsidian_organization(
    connection_id: str,
    run_id: str,
    body: ObsidianOrganizationAck,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    async with get_engine().begin() as connection:
        connection_row = await _require_obsidian_connection(
            connection, connection_id, authorization
        )
        completed = await complete_organization(
            connection,
            learner_id=str(connection_row["learner_id"]),
            run_id=run_id,
            completed_action_ids=set(body.completed_action_ids),
            completed_source_keys=body.completed_source_keys,
        )
        if not completed:
            raise HTTPException(status_code=409, detail="obsidian_organization_ack_mismatch")
        await connection.execute(
            tables.obsidian_sync_connections.update()
            .where(tables.obsidian_sync_connections.c.connection_id == connection_id)
            .values(last_used_at=datetime.now(UTC))
        )
    return {"status": "completed"}


@obsidian_sync_router.get("/{connection_id}/exports", response_model=list[ObsidianAssetExportView])
async def list_obsidian_asset_exports(
    connection_id: str,
    authorization: str | None = Header(default=None),
) -> list[ObsidianAssetExportView]:
    async with get_engine().connect() as connection:
        connection_row = await _require_obsidian_connection(
            connection, connection_id, authorization
        )
        rows = (
            (
                await connection.execute(
                    sa.select(
                        tables.learning_asset_index,
                        tables.outbox_messages.c.message_id,
                        tables.outbox_messages.c.payload,
                    )
                    .join(
                        tables.outbox_messages,
                        sa.and_(
                            tables.outbox_messages.c.aggregate_id
                            == tables.learning_asset_index.c.asset_id,
                            tables.outbox_messages.c.topic == "asset_export_requested",
                            tables.outbox_messages.c.status == "pending",
                        ),
                    )
                    .where(tables.learning_asset_index.c.learner_id == connection_row["learner_id"])
                    .order_by(tables.outbox_messages.c.occurred_at)
                    .limit(80)
                )
            )
            .mappings()
            .all()
        )
    return [
        ObsidianAssetExportView(
            export_id=str(row["message_id"]),
            asset_id=str(row["asset_id"]),
            kind=str(row["asset_kind"]),
            title=str(row["display_title"]),
            tags=list(row["tag_index"]),
            source_type=str(row["source_type"]),
            source_task_id=row["source_task_id"],
            initial_content=(row["payload"] or {}).get("initial_content"),
            operation=(row["payload"] or {}).get("operation", "CREATE"),
            source_key=(row["payload"] or {}).get("source_key"),
            expected_content_hash=(row["payload"] or {}).get("expected_content_hash"),
            patch_content=(row["payload"] or {}).get("patch_content"),
            knowledge_proposal_id=(row["payload"] or {}).get("knowledge_proposal_id"),
        )
        for row in rows
    ]


@obsidian_sync_router.post("/{connection_id}/exports/{asset_id}/ack")
async def acknowledge_obsidian_asset_export(
    connection_id: str,
    asset_id: str,
    body: ObsidianAssetExportAck,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        connection_row = await _require_obsidian_connection(
            connection, connection_id, authorization
        )
        asset = await _owned_asset(connection, str(connection_row["learner_id"]), asset_id)
        pending_exports = list(
            (
                await connection.scalars(
                    sa.select(tables.outbox_messages.c.message_id)
                    .where(
                        tables.outbox_messages.c.topic == "asset_export_requested",
                        tables.outbox_messages.c.aggregate_id == asset_id,
                        tables.outbox_messages.c.status == "pending",
                        *(
                            [tables.outbox_messages.c.message_id == body.export_id]
                            if body.export_id is not None
                            else []
                        ),
                    )
                    .with_for_update()
                )
            ).all()
        )
        if not pending_exports:
            raise HTTPException(status_code=409, detail="obsidian_export_not_pending")
        if body.export_id is None and len(pending_exports) != 1:
            raise HTTPException(status_code=409, detail="obsidian_export_id_required")
        await connection.execute(
            tables.learning_asset_index.update()
            .where(tables.learning_asset_index.c.asset_id == asset_id)
            .values(
                vault_provider="obsidian_plugin",
                vault_id=body.vault_name,
                document_id=asset_id,
                relative_path=body.source_key,
                document_uri=_obsidian_uri(body.vault_name, body.source_key),
                content_hash=body.content_hash,
                document_updated_at=body.modified_at,
                indexed_at=now,
                sync_status="synced",
                sync_error_code=None,
                updated_at=now,
                version=int(asset["version"]) + 1,
            )
        )
        await connection.execute(
            tables.outbox_messages.update()
            .where(
                tables.outbox_messages.c.topic == "asset_export_requested",
                tables.outbox_messages.c.aggregate_id == asset_id,
                tables.outbox_messages.c.status == "pending",
                *(
                    [tables.outbox_messages.c.message_id == body.export_id]
                    if body.export_id is not None
                    else []
                ),
            )
            .values(
                status="processed",
                payload={"asset_id": asset_id, "delivered_via": "obsidian_plugin"},
                processed_at=now,
            )
        )
        await connection.execute(
            tables.obsidian_sync_connections.update()
            .where(tables.obsidian_sync_connections.c.connection_id == connection_id)
            .values(last_used_at=now)
        )
    return {"status": "synced"}


@learning_asset_router.get(
    "/{asset_id}/denoise-comparison",
    response_model=AssetDenoiseComparisonView,
)
async def get_asset_denoise_comparison(
    asset_id: str,
    request: Request,
) -> AssetDenoiseComparisonView:
    identity: LearnerIdentity = request.state.learner_identity
    async with get_engine().connect() as connection:
        await _owned_asset(connection, identity.learner_id, asset_id)
        source = (
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
                        tables.knowledge_source_records.c.learner_id == identity.learner_id,
                        tables.knowledge_source_records.c.provider == "learning_asset_capture",
                        tables.knowledge_source_records.c.source_key == f"asset:{asset_id}",
                    )
                    .limit(1)
                )
            )
            .mappings()
            .one_or_none()
        )
        if source is None:
            raise HTTPException(status_code=404, detail="asset_denoise_source_not_found")
        projection = (
            (
                await connection.execute(
                    sa.select(tables.learning_asset_content_projections)
                    .where(
                        tables.learning_asset_content_projections.c.asset_id == asset_id,
                        tables.learning_asset_content_projections.c.learner_id
                        == identity.learner_id,
                        tables.learning_asset_content_projections.c.source_record_id
                        == source["source_record_id"],
                    )
                    .order_by(tables.learning_asset_content_projections.c.created_at.desc())
                    .limit(1)
                )
            )
            .mappings()
            .one_or_none()
        )
    raw_capture = deserialize_asset_capture_source(str(source["content"]))
    raw_content = render_raw_asset_capture(raw_capture)
    retained_ids = (
        [str(item) for item in projection["retained_segment_ids"]] if projection is not None else []
    )
    all_ids = [segment.segment_id for segment in raw_capture.segments]
    denoised_content = (
        str(projection["content"])
        if projection is not None and projection["content"] is not None
        else None
    )
    after_count = len(denoised_content or "")
    before_count = len(raw_content)
    return AssetDenoiseComparisonView(
        asset_id=asset_id,
        status="ready" if projection is not None else "pending",
        raw_capture=raw_capture,
        raw_content=raw_content,
        denoised_content=denoised_content,
        decision=str(projection["decision"]) if projection is not None else None,
        reason_codes=(
            [str(item) for item in projection["reason_codes"]] if projection is not None else []
        ),
        retained_segment_ids=retained_ids,
        removed_segment_ids=[item for item in all_ids if item not in retained_ids],
        before_character_count=before_count,
        after_character_count=after_count,
        reduction_ratio=(
            round((before_count - after_count) / before_count, 4) if before_count else 0
        ),
        projected_at=projection["created_at"] if projection is not None else None,
    )


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
    projection = project_asset_capture(body.capture) if body.capture is not None else None
    initial_content = (
        projection.content
        if projection is not None
        else denoise_asset_content(body.initial_content)
    )
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
                next_review_at=now if body.capture is not None else None,
                starred=False,
                sync_status="pending_export",
                sync_error_code=None,
                indexed_at=None,
                created_at=now,
                updated_at=now,
                version=1,
            )
        )
        capture_source_record_id: str | None = None
        if body.capture is not None:
            capture_source_record_id, _ = await enqueue_asset_capture_organization(
                connection,
                learner_id=identity.learner_id,
                asset_id=asset_id,
                capture=body.capture,
                captured_at=now,
            )
        await connection.execute(
            tables.outbox_messages.insert().values(
                message_id=uuid4(),
                topic="asset_export_requested",
                aggregate_id=asset_id,
                payload={
                    "asset_id": asset_id,
                    "export_schema_version": "asset/v1",
                    "initial_content": initial_content,
                    "capture_source_record_id": capture_source_record_id,
                    "write_decision": (
                        projection.model_dump(mode="json", exclude={"content"})
                        if projection is not None
                        else None
                    ),
                },
                status="denoising" if body.capture is not None else "pending",
                attempt_count=0,
                occurred_at=now,
                available_at=now,
                processed_at=None,
            )
        )
    if body.capture is not None:
        async with get_engine().connect() as connection:
            return _asset_view(await _owned_asset(connection, identity.learner_id, asset_id))
    exported = await _export_asset(
        identity.learner_id,
        asset_id,
        initial_content=initial_content,
    )
    if exported.sync_status == "synced":
        await _complete_asset_export_messages(asset_id)
    return exported


@learning_asset_router.post("/{asset_id}/sync", response_model=LearningAssetView)
async def sync_learning_asset(asset_id: str, request: Request) -> LearningAssetView:
    identity: LearnerIdentity = request.state.learner_identity
    exported = await _export_asset(identity.learner_id, asset_id)
    if exported.sync_status == "synced":
        await _complete_asset_export_messages(asset_id)
    return exported


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


async def _export_asset(
    learner_id: str,
    asset_id: str,
    *,
    initial_content: str | None = None,
) -> LearningAssetView:
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
            initial_content=initial_content,
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


async def _complete_asset_export_messages(asset_id: str) -> None:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.outbox_messages.update()
            .where(
                tables.outbox_messages.c.topic == "asset_export_requested",
                tables.outbox_messages.c.aggregate_id == asset_id,
                tables.outbox_messages.c.status == "pending",
            )
            .values(status="processed", processed_at=now)
        )


async def export_pending_asset(asset_id: str) -> str:
    """Worker entry point for a durable `asset_export_requested` outbox item."""
    async with get_engine().connect() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.learning_asset_index).where(
                        tables.learning_asset_index.c.asset_id == asset_id
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        payload = await connection.scalar(
            sa.select(tables.outbox_messages.c.payload)
            .where(
                tables.outbox_messages.c.topic == "asset_export_requested",
                tables.outbox_messages.c.aggregate_id == asset_id,
                tables.outbox_messages.c.status.in_(("pending", "dispatching")),
            )
            .order_by(tables.outbox_messages.c.occurred_at)
            .limit(1)
        )
    if row is None:
        return "missing"
    exported = await _export_asset(
        str(row["learner_id"]),
        asset_id,
        initial_content=(payload or {}).get("initial_content"),
    )
    if exported.sync_status == "synced":
        await _complete_asset_export_messages(asset_id)
    return exported.sync_status
