"""Add safe model invocation audit metadata.

Revision ID: 0005_model_invocation_audit
Revises: 0004_intervention_content
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_model_invocation_audit"
down_revision: str | None = "0004_intervention_content"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "model_invocations",
        sa.Column("invocation_id", sa.String(length=128), primary_key=True),
        sa.Column("workflow_run_id", sa.String(length=128), nullable=False),
        sa.Column("task_id", sa.String(length=128), nullable=False),
        sa.Column("input_attempt_version_id", sa.String(length=128), nullable=False),
        sa.Column("purpose", sa.String(length=64), nullable=False),
        sa.Column("adapter", sa.String(length=64), nullable=False),
        sa.Column("prompt_version", sa.String(length=128), nullable=False),
        sa.Column("outcome", sa.String(length=64), nullable=False),
        sa.Column("is_remote", sa.Boolean(), nullable=False),
        sa.Column("estimated_cost_usd", sa.Numeric(8, 4), nullable=False),
        sa.Column("actual_cost_usd", sa.Numeric(8, 4), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("output_hash", sa.String(length=64), nullable=False),
        sa.Column("focus", sa.String(length=32), nullable=True),
        sa.Column("evidence_start", sa.Integer(), nullable=True),
        sa.Column("evidence_end", sa.Integer(), nullable=True),
        sa.Column("evidence_hash", sa.String(length=64), nullable=True),
        sa.Column("rejection_code", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_model_invocations_task_created",
        "model_invocations",
        ["task_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_model_invocations_task_created", table_name="model_invocations")
    op.drop_table("model_invocations")
