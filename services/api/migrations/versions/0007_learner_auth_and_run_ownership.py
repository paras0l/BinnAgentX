"""Add learner authentication, sessions, and run ownership.

Revision ID: 0007_learner_auth
Revises: 0006_continuous_practice_run
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_learner_auth"
down_revision: str | None = "0006_continuous_practice_run"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learners",
        sa.Column("learner_id", sa.String(length=128), primary_key=True),
        sa.Column("nickname", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("invite_code", sa.String(length=32), nullable=False),
        sa.Column("invited_by_learner_id", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["invited_by_learner_id"],
            ["learners.learner_id"],
            name="fk_learners_invited_by",
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint("invite_code", name="uq_learners_invite_code"),
    )
    op.create_index("ix_learners_email", "learners", ["email"])
    op.create_index(
        "ix_learners_invited_by_learner_id",
        "learners",
        ["invited_by_learner_id"],
    )
    op.create_table(
        "email_verification_challenges",
        sa.Column("challenge_id", sa.String(length=128), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("code_salt", sa.String(length=32), nullable=False),
        sa.Column("attempt_count", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_email_verification_email_sent",
        "email_verification_challenges",
        ["email", "sent_at"],
    )
    op.create_table(
        "learner_sessions",
        sa.Column("token_hash", sa.String(length=64), primary_key=True),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["learner_id"],
            ["learners.learner_id"],
            name="fk_learner_sessions_learner",
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_learner_sessions_expires_at", "learner_sessions", ["expires_at"])
    op.add_column(
        "workflow_runs",
        sa.Column("learner_id", sa.String(length=128), nullable=True),
    )
    op.create_foreign_key(
        "fk_workflow_runs_learner",
        "workflow_runs",
        "learners",
        ["learner_id"],
        ["learner_id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_workflow_runs_learner_updated", "workflow_runs", ["learner_id", "updated_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_workflow_runs_learner_updated", table_name="workflow_runs")
    op.drop_constraint("fk_workflow_runs_learner", "workflow_runs", type_="foreignkey")
    op.drop_column("workflow_runs", "learner_id")
    op.drop_index("ix_learner_sessions_expires_at", table_name="learner_sessions")
    op.drop_table("learner_sessions")
    op.drop_index(
        "ix_email_verification_email_sent",
        table_name="email_verification_challenges",
    )
    op.drop_table("email_verification_challenges")
    op.drop_index("ix_learners_invited_by_learner_id", table_name="learners")
    op.drop_index("ix_learners_email", table_name="learners")
    op.drop_table("learners")
