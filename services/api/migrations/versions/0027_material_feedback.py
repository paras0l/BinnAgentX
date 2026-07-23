"""Add one-shot in-reading material feedback.

Revision ID: 0027_material_feedback
Revises: 0026_learner_level
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0027_material_feedback"
down_revision: str | None = "0026_learner_level"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "material_feedback_events",
        sa.Column("feedback_id", sa.String(128), primary_key=True),
        sa.Column("learner_id", sa.String(128), nullable=False),
        sa.Column("workflow_run_id", sa.String(128), nullable=False),
        sa.Column("task_id", sa.String(128), nullable=False, unique=True),
        sa.Column("content_version_id", sa.String(128), nullable=False),
        sa.Column("sentiment", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "sentiment IN ('good', 'bad')",
            name="ck_material_feedback_events_sentiment",
        ),
    )
    op.create_index(
        "ix_material_feedback_events_learner_created",
        "material_feedback_events",
        ["learner_id", "created_at"],
    )

    op.add_column(
        "learner_level_assessments",
        sa.Column(
            "trigger_kind",
            sa.String(32),
            nullable=False,
            server_default="difficulty_feedback",
        ),
    )
    op.add_column(
        "learner_level_assessments",
        sa.Column("trigger_key", sa.String(180), nullable=True),
    )
    op.execute(
        """
        UPDATE learner_level_assessments
        SET trigger_key = 'difficulty_feedback:' || trigger_workflow_run_id
        """
    )
    op.alter_column("learner_level_assessments", "trigger_key", nullable=False)
    op.create_unique_constraint(
        "uq_learner_level_assessments_trigger_key",
        "learner_level_assessments",
        ["trigger_key"],
    )
    op.drop_constraint(
        "learner_level_assessments_trigger_workflow_run_id_key",
        "learner_level_assessments",
        type_="unique",
    )


def downgrade() -> None:
    op.create_unique_constraint(
        "learner_level_assessments_trigger_workflow_run_id_key",
        "learner_level_assessments",
        ["trigger_workflow_run_id"],
    )
    op.drop_constraint(
        "uq_learner_level_assessments_trigger_key",
        "learner_level_assessments",
        type_="unique",
    )
    op.drop_column("learner_level_assessments", "trigger_key")
    op.drop_column("learner_level_assessments", "trigger_kind")
    op.drop_index(
        "ix_material_feedback_events_learner_created",
        table_name="material_feedback_events",
    )
    op.drop_table("material_feedback_events")
