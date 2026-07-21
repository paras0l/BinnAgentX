"""Promote Obsidian to the audited BinnAgentX Agent memory provider.

Revision ID: 0020_obsidian_agent_memory
Revises: 0019_agent_configuration
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0020_obsidian_agent_memory"
down_revision: str | None = "0019_agent_configuration"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_memory_events",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_key", sa.String(length=64), nullable=False),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("agent_name", sa.String(length=128), nullable=False),
        sa.Column("operation", sa.String(length=16), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("invocation_key", sa.String(length=128), nullable=False),
        sa.Column("workflow_run_id", sa.String(length=128), nullable=True),
        sa.Column("task_id", sa.String(length=128), nullable=True),
        sa.Column("query_hash", sa.String(length=64), nullable=True),
        sa.Column("memory_ids", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("event_id"),
        sa.CheckConstraint(
            "operation IN ('recall', 'remember')",
            name="ck_agent_memory_event_operation",
        ),
        sa.UniqueConstraint(
            "project_key",
            "invocation_key",
            "operation",
            name="uq_agent_memory_invocation_operation",
        ),
    )
    op.create_index(
        "ix_agent_memory_events_learner_created",
        "agent_memory_events",
        ["learner_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_agent_memory_events_learner_created",
        table_name="agent_memory_events",
    )
    op.drop_table("agent_memory_events")
