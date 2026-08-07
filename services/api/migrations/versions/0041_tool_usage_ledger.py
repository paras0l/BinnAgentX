"""Add a generic persistent call ledger for non-model Agent tools.

Revision ID: 0041_tool_usage_ledger
Revises: 0040_annotation_analysis
Create Date: 2026-08-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0041_tool_usage_ledger"
down_revision: str | None = "0040_annotation_analysis"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tool_usage_ledger",
        sa.Column("invocation_key", sa.String(length=128), primary_key=True),
        sa.Column("tool_name", sa.String(length=160), nullable=False),
        sa.Column("workflow_run_id", sa.String(length=128), nullable=False),
        sa.Column("task_id", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_tool_usage_ledger_run_tool",
        "tool_usage_ledger",
        ["workflow_run_id", "tool_name"],
    )


def downgrade() -> None:
    op.drop_index("ix_tool_usage_ledger_run_tool", table_name="tool_usage_ledger")
    op.drop_table("tool_usage_ledger")
