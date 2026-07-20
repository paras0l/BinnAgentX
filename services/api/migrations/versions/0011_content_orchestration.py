"""Add observable orchestration state for Agent content jobs.

Revision ID: 0011_content_orchestration
Revises: 0010_content_generation_jobs
Create Date: 2026-07-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011_content_orchestration"
down_revision: str | None = "0010_content_generation_jobs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_content_generation_jobs_status",
        "content_generation_jobs",
        type_="check",
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("current_stage", sa.String(length=64), nullable=False, server_default="queued"),
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("current_item_id", sa.String(length=160), nullable=True),
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("progress_completed", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("progress_total", sa.Integer(), nullable=False, server_default="6"),
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("cancel_requested_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("langfuse_trace_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("model_provider", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("model_name", sa.String(length=128), nullable=True),
    )
    op.create_check_constraint(
        "ck_content_generation_jobs_status",
        "content_generation_jobs",
        "status IN ('queued', 'running', 'generated', 'validation_failed', "
        "'generation_failed', 'cancelled')",
    )
    op.create_check_constraint(
        "ck_content_generation_jobs_progress",
        "content_generation_jobs",
        "progress_completed >= 0 AND progress_total > 0 AND progress_completed <= progress_total",
    )
    op.create_table(
        "content_generation_events",
        sa.Column("event_id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "job_id",
            sa.String(length=128),
            sa.ForeignKey("content_generation_jobs.job_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("stage", sa.String(length=64), nullable=False),
        sa.Column("agent_role", sa.String(length=64), nullable=True),
        sa.Column("item_id", sa.String(length=160), nullable=True),
        sa.Column("attempt", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "detail",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_content_generation_events_job_occurred",
        "content_generation_events",
        ["job_id", "occurred_at"],
    )
    op.create_table(
        "content_worker_runtime",
        sa.Column("worker_id", sa.String(length=64), primary_key=True),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("current_job_id", sa.String(length=128), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("content_worker_runtime")
    op.drop_index(
        "ix_content_generation_events_job_occurred",
        table_name="content_generation_events",
    )
    op.drop_table("content_generation_events")
    op.drop_constraint(
        "ck_content_generation_jobs_progress",
        "content_generation_jobs",
        type_="check",
    )
    op.drop_constraint(
        "ck_content_generation_jobs_status",
        "content_generation_jobs",
        type_="check",
    )
    for column in (
        "model_name",
        "model_provider",
        "langfuse_trace_id",
        "cancel_requested_at",
        "heartbeat_at",
        "attempt_count",
        "progress_total",
        "progress_completed",
        "current_item_id",
        "current_stage",
    ):
        op.drop_column("content_generation_jobs", column)
    op.create_check_constraint(
        "ck_content_generation_jobs_status",
        "content_generation_jobs",
        "status IN ('queued', 'running', 'generated', 'validation_failed', 'generation_failed')",
    )
