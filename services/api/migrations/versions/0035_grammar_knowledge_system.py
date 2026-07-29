"""Add construction-bound grammar challenges and evidence projections.

Revision ID: 0035_grammar_knowledge
Revises: 0034_knowledge_retry_count
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0035_grammar_knowledge"
down_revision: str | None = "0034_knowledge_retry_count"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "task_grammar_challenges",
        sa.Column("construction_id", sa.String(length=180), nullable=True),
    )
    op.add_column(
        "task_grammar_challenges",
        sa.Column("construction_version", sa.Integer(), nullable=True),
    )
    op.add_column(
        "task_grammar_challenges",
        sa.Column("tested_facet", sa.String(length=16), nullable=True),
    )
    op.add_column(
        "task_grammar_challenges",
        sa.Column("resolution_kind", sa.String(length=32), nullable=True),
    )
    op.execute(
        """
        UPDATE task_grammar_challenges
        SET resolution_kind = CASE
            WHEN resolved THEN 'legacy_unverified'
            ELSE NULL
        END
        """
    )
    op.create_check_constraint(
        "ck_task_grammar_challenges_tested_facet",
        "task_grammar_challenges",
        "tested_facet IS NULL OR tested_facet IN ('form', 'meaning', 'use')",
    )
    op.create_check_constraint(
        "ck_task_grammar_challenges_resolution_kind",
        "task_grammar_challenges",
        "resolution_kind IS NULL OR resolution_kind IN "
        "('independent_correction', 'supported_correction', 'answer_revealed', "
        "'legacy_unverified')",
    )

    op.create_table(
        "grammar_learning_evidence",
        sa.Column("evidence_id", sa.String(length=128), primary_key=True),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("construction_id", sa.String(length=180), nullable=False),
        sa.Column("construction_version", sa.Integer(), nullable=False),
        sa.Column("facet", sa.String(length=16), nullable=False),
        sa.Column("modality", sa.String(length=16), nullable=False),
        sa.Column("evidence_kind", sa.String(length=48), nullable=False),
        sa.Column("context_key", sa.String(length=256), nullable=False),
        sa.Column("workflow_run_id", sa.String(length=128), nullable=True),
        sa.Column("task_id", sa.String(length=128), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "detail",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.UniqueConstraint(
            "learner_id",
            "construction_id",
            "construction_version",
            "facet",
            "modality",
            "workflow_run_id",
            "task_id",
            "evidence_kind",
            name="uq_grammar_evidence_source",
        ),
        sa.CheckConstraint(
            "construction_version >= 1",
            name="ck_grammar_evidence_construction_version",
        ),
        sa.CheckConstraint(
            "facet IN ('form', 'meaning', 'use')",
            name="ck_grammar_evidence_facet",
        ),
        sa.CheckConstraint(
            "modality IN ('receptive', 'productive')",
            name="ck_grammar_evidence_modality",
        ),
        sa.CheckConstraint(
            "evidence_kind IN ("
            "'exposure', 'attempt_failed', 'supported_recognition', "
            "'independent_recognition', 'production_attempt_unverified', "
            "'supported_production', 'independent_production', 'delayed_transfer', "
            "'conflict')",
            name="ck_grammar_evidence_kind",
        ),
    )
    op.create_index(
        "ix_grammar_evidence_learner_construction_time",
        "grammar_learning_evidence",
        ["learner_id", "construction_id", "observed_at"],
    )

    op.create_table(
        "learner_grammar_states",
        sa.Column("learner_id", sa.String(length=128), primary_key=True),
        sa.Column("construction_id", sa.String(length=180), primary_key=True),
        sa.Column("construction_version", sa.Integer(), primary_key=True),
        sa.Column("facet", sa.String(length=16), primary_key=True),
        sa.Column("modality", sa.String(length=16), primary_key=True),
        sa.Column("status", sa.String(length=48), nullable=False),
        sa.Column("evidence_count", sa.Integer(), nullable=False),
        sa.Column("independent_context_count", sa.Integer(), nullable=False),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_review_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "construction_version >= 1",
            name="ck_grammar_state_construction_version",
        ),
        sa.CheckConstraint("evidence_count >= 1", name="ck_grammar_state_evidence_count"),
        sa.CheckConstraint(
            "independent_context_count >= 0",
            name="ck_grammar_state_independent_context_count",
        ),
    )
    op.create_index(
        "ix_learner_grammar_state_review_due",
        "learner_grammar_states",
        ["learner_id", "next_review_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_learner_grammar_state_review_due",
        table_name="learner_grammar_states",
    )
    op.drop_table("learner_grammar_states")
    op.drop_index(
        "ix_grammar_evidence_learner_construction_time",
        table_name="grammar_learning_evidence",
    )
    op.drop_table("grammar_learning_evidence")
    op.drop_constraint(
        "ck_task_grammar_challenges_resolution_kind",
        "task_grammar_challenges",
        type_="check",
    )
    op.drop_constraint(
        "ck_task_grammar_challenges_tested_facet",
        "task_grammar_challenges",
        type_="check",
    )
    op.drop_column("task_grammar_challenges", "resolution_kind")
    op.drop_column("task_grammar_challenges", "tested_facet")
    op.drop_column("task_grammar_challenges", "construction_version")
    op.drop_column("task_grammar_challenges", "construction_id")
