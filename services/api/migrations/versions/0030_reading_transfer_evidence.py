"""Persist reading evidence used to bind personalized expression tasks.

Revision ID: 0030_reading_transfer_evidence
Revises: 0029_personalized_quality_gate
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0030_reading_transfer_evidence"
down_revision: str | None = "0029_personalized_quality_gate"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reading_evidence_snapshots",
        sa.Column("snapshot_id", sa.String(128), primary_key=True),
        sa.Column("learner_id", sa.String(128), nullable=False),
        sa.Column("workflow_run_id", sa.String(128), nullable=False),
        sa.Column("task_id", sa.String(128), nullable=False, unique=True),
        sa.Column("objective_bundle_id", sa.String(128), nullable=False),
        sa.Column("reading_artifact_id", sa.String(128), nullable=False),
        sa.Column("reading_artifact_version", sa.Integer(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_reading_evidence_learner_created",
        "reading_evidence_snapshots",
        ["learner_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_reading_evidence_learner_created",
        table_name="reading_evidence_snapshots",
    )
    op.drop_table("reading_evidence_snapshots")
