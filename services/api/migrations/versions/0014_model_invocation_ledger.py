"""Persist idempotent application-tool model results.

Revision ID: 0014_model_invocation_ledger
Revises: 0013_learning_asset_index
Create Date: 2026-07-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0014_model_invocation_ledger"
down_revision: str | None = "0013_learning_asset_index"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "model_invocation_ledger",
        sa.Column("invocation_key", sa.String(length=64), primary_key=True),
        sa.Column("tool_name", sa.String(length=128), nullable=False),
        sa.Column("workflow_run_id", sa.String(length=128), nullable=False),
        sa.Column("task_id", sa.String(length=128), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("response_payload", postgresql.JSONB(), nullable=True),
        sa.Column("output_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'completed')",
            name="ck_model_invocation_ledger_status",
        ),
    )
    op.create_index(
        "ix_model_invocation_ledger_task_created",
        "model_invocation_ledger",
        ["task_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_model_invocation_ledger_task_created", table_name="model_invocation_ledger")
    op.drop_table("model_invocation_ledger")
