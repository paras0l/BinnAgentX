"""Add isolated control-plane tool policies and prompt versions.

Revision ID: 0019_agent_configuration
Revises: 0018_repair_legacy_materials
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0019_agent_configuration"
down_revision: str | None = "0018_repair_legacy_materials"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "control_tool_policies",
        sa.Column("project_key", sa.String(length=64), nullable=False),
        sa.Column("tool_name", sa.String(length=160), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("updated_by_role", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("project_key", "tool_name"),
        sa.CheckConstraint("version >= 1", name="ck_control_tool_policy_version"),
    )
    op.create_table(
        "control_prompts",
        sa.Column("project_key", sa.String(length=64), nullable=False),
        sa.Column("prompt_id", sa.String(length=160), nullable=False),
        sa.Column("prompt_version", sa.String(length=32), nullable=False),
        sa.Column("owner", sa.String(length=80), nullable=False),
        sa.Column("purpose", sa.String(length=500), nullable=False),
        sa.Column("template_text", sa.Text(), nullable=False),
        sa.Column("variables", postgresql.JSONB(), nullable=False),
        sa.Column("model_policy", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_by_role", sa.String(length=64), nullable=False),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("project_key", "prompt_id", "prompt_version"),
        sa.CheckConstraint(
            "status IN ('draft', 'active', 'archived')",
            name="ck_control_prompt_status",
        ),
        sa.CheckConstraint("version >= 1", name="ck_control_prompt_version"),
    )
    op.create_index(
        "uq_control_prompt_active",
        "control_prompts",
        ["project_key", "prompt_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index("uq_control_prompt_active", table_name="control_prompts")
    op.drop_table("control_prompts")
    op.drop_table("control_tool_policies")
