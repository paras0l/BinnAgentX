"""Add recoverable worker leases to knowledge organization runs.

Revision ID: 0032_knowledge_lease
Revises: 0031_knowledge_organization
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0032_knowledge_lease"
down_revision: str | None = "0031_knowledge_organization"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "obsidian_organizer_runs",
        sa.Column("knowledge_claimed_by", sa.String(180), nullable=True),
    )
    op.add_column(
        "obsidian_organizer_runs",
        sa.Column("knowledge_lease_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("obsidian_organizer_runs", "knowledge_lease_expires_at")
    op.drop_column("obsidian_organizer_runs", "knowledge_claimed_by")
