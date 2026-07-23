"""Add current adaptation level assessment jobs and results.

Revision ID: 0026_learner_level
Revises: 0025_requeue_false_failures
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0026_learner_level"
down_revision: str | None = "0025_requeue_false_failures"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learner_level_assessments",
        sa.Column("assessment_id", sa.String(128), primary_key=True),
        sa.Column("learner_id", sa.String(128), nullable=False),
        sa.Column("trigger_workflow_run_id", sa.String(128), nullable=False, unique=True),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("evidence_summary", postgresql.JSONB(), nullable=False),
        sa.Column("overall_level", sa.String(32), nullable=True),
        sa.Column("dimensions", postgresql.JSONB(), nullable=False),
        sa.Column("confidence_band", sa.String(16), nullable=True),
        sa.Column("evidence_count", sa.Integer(), nullable=False),
        sa.Column("reason_codes", postgresql.JSONB(), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("error_code", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('queued', 'processing', 'completed', 'failed')",
            name="ck_learner_level_assessments_status",
        ),
    )
    op.create_index(
        "ix_learner_level_assessments_learner_completed",
        "learner_level_assessments",
        ["learner_id", "completed_at"],
    )
    op.create_index(
        "ix_learner_level_assessments_status_created",
        "learner_level_assessments",
        ["status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_learner_level_assessments_status_created",
        table_name="learner_level_assessments",
    )
    op.drop_index(
        "ix_learner_level_assessments_learner_completed",
        table_name="learner_level_assessments",
    )
    op.drop_table("learner_level_assessments")
