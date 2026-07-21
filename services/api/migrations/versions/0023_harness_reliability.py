"""Add durable claims, bounded retries, and explicit evidence targets.

Revision ID: 0023_harness_reliability
Revises: 0022_learning_evidence_jobs
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0023_harness_reliability"
down_revision: str | None = "0022_learning_evidence_jobs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "personalized_training_materials",
        sa.Column(
            "evidence_target_asset_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column("next_generation_attempt_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column("claimed_by", sa.String(160), nullable=True),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_personalized_material_claimable",
        "personalized_training_materials",
        ["status", "next_generation_attempt_at", "created_at"],
    )

    op.add_column(
        "content_generation_jobs",
        sa.Column("claimed_by", sa.String(160), nullable=True),
    )
    op.add_column(
        "content_generation_jobs",
        sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_content_generation_jobs_lease",
        "content_generation_jobs",
        ["status", "lease_expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_content_generation_jobs_lease", table_name="content_generation_jobs")
    op.drop_column("content_generation_jobs", "lease_expires_at")
    op.drop_column("content_generation_jobs", "claimed_by")
    op.drop_index(
        "ix_personalized_material_claimable",
        table_name="personalized_training_materials",
    )
    op.drop_column("personalized_training_materials", "lease_expires_at")
    op.drop_column("personalized_training_materials", "claimed_by")
    op.drop_column("personalized_training_materials", "next_generation_attempt_at")
    op.drop_column("personalized_training_materials", "evidence_target_asset_ids")
