"""Persist delivered intervention content and reason.

Revision ID: 0004_intervention_content
Revises: 0003_vertical_slice_run
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_intervention_content"
down_revision: str | None = "0003_vertical_slice_run"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ai_interventions",
        sa.Column(
            "reason_code",
            sa.String(length=64),
            nullable=False,
            server_default="legacy_intervention",
        ),
    )
    op.add_column(
        "ai_interventions",
        sa.Column(
            "delivered_content", sa.Text(), nullable=False, server_default="Legacy intervention"
        ),
    )
    op.add_column(
        "ai_interventions",
        sa.Column(
            "content_hash",
            sa.String(length=64),
            nullable=False,
            server_default="87392e95b93571ccc416c9e2e06248fdf5ee397a28fd635fec28c27b80b5d4ca",
        ),
    )
    op.alter_column("ai_interventions", "reason_code", server_default=None)
    op.alter_column("ai_interventions", "delivered_content", server_default=None)
    op.alter_column("ai_interventions", "content_hash", server_default=None)


def downgrade() -> None:
    op.drop_column("ai_interventions", "content_hash")
    op.drop_column("ai_interventions", "delivered_content")
    op.drop_column("ai_interventions", "reason_code")
