"""Add controlled experience codes and reusable experience identities.

Revision ID: 0008_experience_codes
Revises: 0007_learner_auth
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_experience_codes"
down_revision: str | None = "0007_learner_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "experience_codes",
        sa.Column("code_id", sa.String(length=128), primary_key=True),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("code_hint", sa.String(length=24), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("max_uses", sa.Integer(), nullable=False),
        sa.Column("used_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by_role", sa.String(length=64), nullable=False),
        sa.Column("revoked_by_role", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("max_uses > 0", name="ck_experience_codes_max_uses_positive"),
        sa.CheckConstraint(
            "used_count >= 0 AND used_count <= max_uses",
            name="ck_experience_codes_used_count_valid",
        ),
        sa.UniqueConstraint("code_hash", name="uq_experience_codes_code_hash"),
    )
    op.create_index("ix_experience_codes_created_at", "experience_codes", ["created_at"])
    op.add_column(
        "learners",
        sa.Column(
            "account_type",
            sa.String(length=32),
            nullable=False,
            server_default="registered",
        ),
    )
    op.create_check_constraint(
        "ck_learners_account_type",
        "learners",
        "account_type IN ('registered', 'experience')",
    )
    op.create_table(
        "experience_code_redemptions",
        sa.Column("redemption_id", sa.String(length=128), primary_key=True),
        sa.Column("code_id", sa.String(length=128), nullable=False),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("username_key", sa.String(length=100), nullable=False),
        sa.Column("login_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["code_id"],
            ["experience_codes.code_id"],
            name="fk_experience_redemptions_code",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["learner_id"],
            ["learners.learner_id"],
            name="fk_experience_redemptions_learner",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "code_id",
            "username_key",
            name="uq_experience_redemptions_code_username",
        ),
        sa.UniqueConstraint("learner_id", name="uq_experience_redemptions_learner"),
    )
    op.create_index(
        "ix_experience_redemptions_code_last_login",
        "experience_code_redemptions",
        ["code_id", "last_login_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_experience_redemptions_code_last_login",
        table_name="experience_code_redemptions",
    )
    op.drop_table("experience_code_redemptions")
    op.drop_constraint("ck_learners_account_type", "learners", type_="check")
    op.drop_column("learners", "account_type")
    op.drop_index("ix_experience_codes_created_at", table_name="experience_codes")
    op.drop_table("experience_codes")
