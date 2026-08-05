"""Persist the Agent explanation with its saved annotation.

Revision ID: 0040_annotation_analysis
Revises: 0039_model_budget_guardrails
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0040_annotation_analysis"
down_revision: str | None = "0039_model_budget_guardrails"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "task_annotations",
        sa.Column("analysis_snapshot", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("task_annotations", "analysis_snapshot")
