"""Add evidence projections and asynchronous personalized material jobs.

Revision ID: 0022_learning_evidence_jobs
Revises: 0021_agent_runtime_memory
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0022_learning_evidence_jobs"
down_revision: str | None = "0021_agent_runtime_memory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "obsidian_learning_context",
        sa.Column("asset_id", sa.String(128), nullable=True),
    )
    op.execute(
        """
        UPDATE obsidian_learning_context AS context
        SET asset_id = asset.asset_id
        FROM learning_asset_index AS asset
        WHERE asset.learner_id = context.learner_id
          AND asset.relative_path = context.source_key
        """
    )
    op.execute(
        """
        UPDATE obsidian_learning_context
        SET asset_id = 'asset_obs_' || substr(context_id, 1, 24)
        WHERE asset_id IS NULL
        """
    )
    op.alter_column("obsidian_learning_context", "asset_id", nullable=False)
    op.create_index(
        "ix_obsidian_context_learner_asset",
        "obsidian_learning_context",
        ["learner_id", "asset_id"],
    )

    op.create_table(
        "learning_evidence",
        sa.Column("evidence_id", sa.String(128), nullable=False),
        sa.Column("learner_id", sa.String(128), nullable=False),
        sa.Column("asset_id", sa.String(128), nullable=False),
        sa.Column("evidence_type", sa.String(48), nullable=False),
        sa.Column("workflow_run_id", sa.String(128), nullable=True),
        sa.Column("task_id", sa.String(128), nullable=True),
        sa.Column("source_version", sa.Integer(), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("detail", postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint("evidence_id"),
        sa.UniqueConstraint(
            "asset_id",
            "workflow_run_id",
            "task_id",
            "evidence_type",
            name="uq_learning_evidence_source",
        ),
        sa.CheckConstraint(
            "evidence_type IN ("
            "'supported_comprehension', 'independent_comprehension', "
            "'supported_output', 'independent_output', 'revision_success', "
            "'delayed_transfer', 'conflict')",
            name="ck_learning_evidence_type",
        ),
    )
    op.create_index(
        "ix_learning_evidence_learner_asset_time",
        "learning_evidence",
        ["learner_id", "asset_id", "observed_at"],
    )
    op.create_index(
        "ix_learning_asset_review_due",
        "learning_asset_index",
        ["learner_id", "next_review_at"],
    )

    op.add_column(
        "personalized_training_materials",
        sa.Column("generation_attempt_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column("generation_error_code", sa.String(128), nullable=True),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column(
            "requested_goal",
            sa.String(240),
            nullable=False,
            server_default="综合巩固近期笔记",
        ),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column(
            "requested_kinds",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.drop_constraint(
        "ck_personalized_training_material_status",
        "personalized_training_materials",
        type_="check",
    )
    op.create_check_constraint(
        "ck_personalized_material_generation_status",
        "personalized_training_materials",
        "status IN ('requested', 'generating', 'validating', 'ready', "
        "'in_progress', 'completed', 'generation_failed')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_personalized_material_generation_status",
        "personalized_training_materials",
        type_="check",
    )
    op.execute(
        """
        UPDATE personalized_training_materials
        SET status = 'ready'
        WHERE status IN ('requested', 'generating', 'validating', 'generation_failed')
        """
    )
    op.create_check_constraint(
        "ck_personalized_training_material_status",
        "personalized_training_materials",
        "status IN ('ready', 'in_progress', 'completed')",
    )
    op.drop_column("personalized_training_materials", "requested_kinds")
    op.drop_column("personalized_training_materials", "requested_goal")
    op.drop_column("personalized_training_materials", "generation_error_code")
    op.drop_column("personalized_training_materials", "generation_attempt_count")
    op.drop_index("ix_learning_asset_review_due", table_name="learning_asset_index")
    op.drop_index("ix_learning_evidence_learner_asset_time", table_name="learning_evidence")
    op.drop_table("learning_evidence")
    op.drop_index("ix_obsidian_context_learner_asset", table_name="obsidian_learning_context")
    op.drop_column("obsidian_learning_context", "asset_id")
