"""Add the learner personalized training material queue.

Revision ID: 0016_personalized_training_queue
Revises: 0015_obsidian_learning_context
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0016_personalized_training_queue"
down_revision: str | None = "0015_obsidian_learning_context"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "personalized_training_materials",
        sa.Column("material_id", sa.String(length=128), primary_key=True),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("paragraphs", postgresql.JSONB(), nullable=False),
        sa.Column("focus_points", postgresql.JSONB(), nullable=False),
        sa.Column("source_context_ids", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('ready', 'in_progress', 'completed')",
            name="ck_personalized_training_material_status",
        ),
    )
    op.create_index(
        "ix_personalized_training_learner_created",
        "personalized_training_materials",
        ["learner_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_personalized_training_learner_created",
        table_name="personalized_training_materials",
    )
    op.drop_table("personalized_training_materials")
