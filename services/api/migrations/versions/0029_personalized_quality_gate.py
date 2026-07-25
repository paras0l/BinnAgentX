"""Separate generated structure from semantic training eligibility.

Revision ID: 0029_personalized_quality_gate
Revises: 0028_learner_preferences
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0029_personalized_quality_gate"
down_revision: str | None = "0028_learner_preferences"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "personalized_training_materials",
        sa.Column(
            "quality_status",
            sa.String(32),
            nullable=False,
            server_default="unverified_legacy",
        ),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column(
            "quality_reports",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column(
            "objective_bundle",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column(
            "question_bank",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column(
            "grammar_annotations",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column("transfer_contract", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column("expression_task", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column(
            "runtime_kind",
            sa.String(32),
            nullable=False,
            server_default="explicit_state_machine",
        ),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column("graph_thread_id", sa.String(180), nullable=True),
    )
    op.add_column(
        "personalized_training_materials",
        sa.Column("graph_version", sa.String(64), nullable=True),
    )
    op.create_check_constraint(
        "ck_personalized_material_quality_status",
        "personalized_training_materials",
        "quality_status IN ("
        "'not_evaluated', 'structurally_validated', 'semantic_review_required', "
        "'semantic_reviewed', 'rejected', 'unverified_legacy')",
    )
    op.create_check_constraint(
        "ck_personalized_material_runtime_kind",
        "personalized_training_materials",
        "runtime_kind IN ('explicit_state_machine', 'langgraph')",
    )
    op.create_index(
        "ix_personalized_material_quality_status",
        "personalized_training_materials",
        ["learner_id", "quality_status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_personalized_material_quality_status",
        table_name="personalized_training_materials",
    )
    op.drop_constraint(
        "ck_personalized_material_runtime_kind",
        "personalized_training_materials",
        type_="check",
    )
    op.drop_constraint(
        "ck_personalized_material_quality_status",
        "personalized_training_materials",
        type_="check",
    )
    op.drop_column("personalized_training_materials", "graph_version")
    op.drop_column("personalized_training_materials", "graph_thread_id")
    op.drop_column("personalized_training_materials", "runtime_kind")
    op.drop_column("personalized_training_materials", "expression_task")
    op.drop_column("personalized_training_materials", "transfer_contract")
    op.drop_column("personalized_training_materials", "grammar_annotations")
    op.drop_column("personalized_training_materials", "question_bank")
    op.drop_column("personalized_training_materials", "objective_bundle")
    op.drop_column("personalized_training_materials", "quality_reports")
    op.drop_column("personalized_training_materials", "quality_status")
