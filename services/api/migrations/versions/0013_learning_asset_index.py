"""Add a metadata-only learner asset index for external knowledge vaults.

Revision ID: 0013_learning_asset_index
Revises: 0011_content_orchestration
Create Date: 2026-07-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0013_learning_asset_index"
down_revision: str | None = "0011_content_orchestration"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learning_asset_index",
        sa.Column("asset_id", sa.String(length=128), primary_key=True),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("asset_kind", sa.String(length=32), nullable=False),
        sa.Column("display_title", sa.String(length=240), nullable=False),
        sa.Column(
            "tag_index",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("source_title", sa.String(length=240), nullable=True),
        sa.Column("source_task_id", sa.String(length=128), nullable=True),
        sa.Column("source_annotation_id", sa.String(length=128), nullable=True),
        sa.Column("source_intervention_id", sa.String(length=128), nullable=True),
        sa.Column("vault_provider", sa.String(length=32), nullable=False),
        sa.Column("vault_id", sa.String(length=128), nullable=True),
        sa.Column("document_id", sa.String(length=128), nullable=True),
        sa.Column("relative_path", sa.Text(), nullable=True),
        sa.Column("document_uri", sa.Text(), nullable=True),
        sa.Column("content_hash", sa.String(length=64), nullable=True),
        sa.Column("document_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("evidence_status", sa.String(length=32), nullable=False),
        sa.Column("evidence_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_review_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("starred", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sync_status", sa.String(length=32), nullable=False),
        sa.Column("sync_error_code", sa.String(length=64), nullable=True),
        sa.Column("indexed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.CheckConstraint("evidence_count >= 0", name="ck_learning_asset_index_evidence_count"),
        sa.CheckConstraint(
            "sync_status IN ('pending_export', 'synced', 'conflict', 'missing', 'error')",
            name="ck_learning_asset_index_sync_status",
        ),
    )
    op.create_index(
        "ix_learning_asset_index_learner_created",
        "learning_asset_index",
        ["learner_id", "created_at"],
    )
    op.create_index(
        "ix_learning_asset_index_learner_kind",
        "learning_asset_index",
        ["learner_id", "asset_kind"],
    )


def downgrade() -> None:
    op.drop_index("ix_learning_asset_index_learner_kind", table_name="learning_asset_index")
    op.drop_index("ix_learning_asset_index_learner_created", table_name="learning_asset_index")
    op.drop_table("learning_asset_index")
