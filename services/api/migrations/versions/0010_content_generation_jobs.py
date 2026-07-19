"""Add persistent Agent content generation jobs.

Revision ID: 0010_content_generation_jobs
Revises: 0009_grammar_challenge
Create Date: 2026-07-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010_content_generation_jobs"
down_revision: str | None = "0009_grammar_challenge"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "content_generation_jobs",
        sa.Column("job_id", sa.String(length=128), primary_key=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("seed", sa.Integer(), nullable=True),
        sa.Column("pack_id", sa.String(length=160), nullable=False),
        sa.Column("pack_version", sa.String(length=64), nullable=False),
        sa.Column("output_directory", sa.Text(), nullable=False),
        sa.Column("manifest_path", sa.Text(), nullable=True),
        sa.Column("item_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("agent_reviewed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "validation_errors",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("requested_by_role", sa.String(length=64), nullable=False),
        sa.Column("published_by_role", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('queued', 'running', 'generated', 'validation_failed', "
            "'generation_failed')",
            name="ck_content_generation_jobs_status",
        ),
        sa.CheckConstraint(
            "item_count >= 0 AND agent_reviewed_count >= 0 AND agent_reviewed_count <= item_count",
            name="ck_content_generation_jobs_counts",
        ),
    )
    op.create_index(
        "ix_content_generation_jobs_status_created",
        "content_generation_jobs",
        ["status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_content_generation_jobs_status_created",
        table_name="content_generation_jobs",
    )
    op.drop_table("content_generation_jobs")
