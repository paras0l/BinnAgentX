"""Persist learner UI and assistance preferences by account.

Revision ID: 0028_learner_preferences
Revises: 0027_material_feedback
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0028_learner_preferences"
down_revision: str | None = "0027_material_feedback"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learner_preferences",
        sa.Column("learner_id", sa.String(128), primary_key=True),
        sa.Column("preferences", postgresql.JSONB(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("version > 0", name="ck_learner_preferences_version_positive"),
    )


def downgrade() -> None:
    op.drop_table("learner_preferences")
