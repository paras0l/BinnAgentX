"""Add bounded short-term Agent memory and login-triggered Obsidian organizer runs.

Revision ID: 0021_agent_runtime_memory
Revises: 0020_obsidian_agent_memory
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0021_agent_runtime_memory"
down_revision: str | None = "0020_obsidian_agent_memory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_working_memory",
        sa.Column("learner_id", sa.String(128), nullable=False),
        sa.Column("agent_name", sa.String(128), nullable=False),
        sa.Column("scope", sa.String(128), nullable=False),
        sa.Column("memory_key", sa.String(128), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("learner_id", "agent_name", "scope", "memory_key"),
    )
    op.create_index("ix_agent_working_memory_expiry", "agent_working_memory", ["expires_at"])
    op.create_table(
        "obsidian_organizer_runs",
        sa.Column("run_id", sa.String(128), nullable=False),
        sa.Column("learner_id", sa.String(128), nullable=False),
        sa.Column("trigger_type", sa.String(32), nullable=False),
        sa.Column("trigger_key", sa.String(128), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("prompt_id", sa.String(160), nullable=False),
        sa.Column("prompt_version", sa.String(32), nullable=False),
        sa.Column("plan", postgresql.JSONB(), nullable=False),
        sa.Column("error_code", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("planned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("run_id"),
        sa.UniqueConstraint("trigger_key", name="uq_obsidian_organizer_trigger"),
        sa.CheckConstraint(
            "status IN ('queued', 'planned', 'completed', 'failed', 'noop')",
            name="ck_obsidian_organizer_status",
        ),
    )
    op.create_index(
        "ix_obsidian_organizer_learner_status",
        "obsidian_organizer_runs",
        ["learner_id", "status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_obsidian_organizer_learner_status", table_name="obsidian_organizer_runs")
    op.drop_table("obsidian_organizer_runs")
    op.drop_index("ix_agent_working_memory_expiry", table_name="agent_working_memory")
    op.drop_table("agent_working_memory")
