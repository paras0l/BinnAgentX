"""Bound durable knowledge-organization retries.

Revision ID: 0034_knowledge_retry_count
Revises: 0033_personal_review_status
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0034_knowledge_retry_count"
down_revision: str | None = "0033_personal_review_status"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "obsidian_organizer_runs",
        sa.Column(
            "knowledge_attempt_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("obsidian_organizer_runs", "knowledge_attempt_count")
