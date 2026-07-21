"""Add scoped Obsidian plugin connections and imported learning context.

Revision ID: 0015_obsidian_learning_context
Revises: 0014_model_invocation_ledger
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0015_obsidian_learning_context"
down_revision: str | None = "0014_model_invocation_ledger"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "obsidian_sync_connections",
        sa.Column("connection_id", sa.String(length=128), primary_key=True),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("secret_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "obsidian_learning_context",
        sa.Column("context_id", sa.String(length=64), primary_key=True),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("connection_id", sa.String(length=128), nullable=False),
        sa.Column("source_key", sa.Text(), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("asset_kind", sa.String(length=32), nullable=False),
        sa.Column("tags", postgresql.JSONB(), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("source_modified_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_obsidian_context_learner_received",
        "obsidian_learning_context",
        ["learner_id", "received_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_obsidian_context_learner_received", table_name="obsidian_learning_context")
    op.drop_table("obsidian_learning_context")
    op.drop_table("obsidian_sync_connections")
