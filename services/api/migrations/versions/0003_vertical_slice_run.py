"""Add cross-task vertical-slice run orchestration facts.

Revision ID: 0003_vertical_slice_run
Revises: 0002_vertical_slice_domain
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_vertical_slice_run"
down_revision: str | None = "0002_vertical_slice_domain"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workflow_runs",
        sa.Column("learner_snapshot_id", sa.String(length=128), nullable=True),
    )
    op.add_column("workflow_runs", sa.Column("stage", sa.String(length=32), nullable=True))
    op.add_column(
        "workflow_runs",
        sa.Column(
            "calibration_fallback_approved",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "workflow_runs",
        sa.Column(
            "difficulty_feedback_status",
            sa.String(length=32),
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "workflow_runs",
        sa.Column("difficulty_rating", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "workflow_runs",
        sa.Column("next_task_placeholder_id", sa.String(length=128), nullable=True),
    )
    op.create_foreign_key(
        "fk_workflow_run_learner_snapshot",
        "workflow_runs",
        "learner_profile_snapshots",
        ["learner_snapshot_id"],
        ["learner_snapshot_id"],
        ondelete="RESTRICT",
    )
    op.create_table(
        "run_task_refs",
        sa.Column(
            "workflow_run_id",
            sa.String(length=128),
            sa.ForeignKey("workflow_runs.workflow_run_id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("role", sa.String(length=32), primary_key=True),
        sa.Column(
            "task_id",
            sa.String(length=128),
            sa.ForeignKey("learning_tasks.task_id", ondelete="RESTRICT"),
            nullable=False,
            unique=True,
        ),
        sa.Column("task_type", sa.String(length=32), nullable=False),
        sa.Column("content_version_id", sa.String(length=128), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "run_task_completion_events",
        sa.Column("completion_event_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "workflow_run_id",
            sa.String(length=128),
            sa.ForeignKey("workflow_runs.workflow_run_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "task_id",
            sa.String(length=128),
            sa.ForeignKey("learning_tasks.task_id", ondelete="RESTRICT"),
            nullable=False,
            unique=True,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_task_version", sa.Integer(), nullable=False),
        sa.Column("highest_hint_level", sa.SmallInteger(), nullable=False),
        sa.CheckConstraint(
            "completed_task_version >= 1",
            name="ck_run_task_completed_version",
        ),
        sa.CheckConstraint(
            "highest_hint_level BETWEEN 0 AND 4",
            name="ck_run_task_hint_level",
        ),
    )
    op.create_table(
        "material_match_decisions",
        sa.Column("decision_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "workflow_run_id",
            sa.String(length=128),
            sa.ForeignKey("workflow_runs.workflow_run_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("learner_snapshot_id", sa.String(length=128), nullable=False),
        sa.Column(
            "candidate_version_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("selected_content_version_id", sa.String(length=128), nullable=False),
        sa.Column("policy_version", sa.String(length=128), nullable=False),
        sa.Column("conservative", sa.Boolean(), nullable=False),
        sa.Column("reason_codes", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "difficulty_feedback_events",
        sa.Column("feedback_event_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "workflow_run_id",
            sa.String(length=128),
            sa.ForeignKey("workflow_runs.workflow_run_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("rating", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "next_task_placeholders",
        sa.Column("placeholder_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "workflow_run_id",
            sa.String(length=128),
            sa.ForeignKey("workflow_runs.workflow_run_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("planned_task_type", sa.String(length=32), nullable=False),
        sa.Column("reason_code", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("next_task_placeholders")
    op.drop_table("difficulty_feedback_events")
    op.drop_table("material_match_decisions")
    op.drop_table("run_task_completion_events")
    op.drop_table("run_task_refs")
    op.drop_constraint(
        "fk_workflow_run_learner_snapshot",
        "workflow_runs",
        type_="foreignkey",
    )
    op.drop_column("workflow_runs", "next_task_placeholder_id")
    op.drop_column("workflow_runs", "difficulty_rating")
    op.drop_column("workflow_runs", "difficulty_feedback_status")
    op.drop_column("workflow_runs", "calibration_fallback_approved")
    op.drop_column("workflow_runs", "stage")
    op.drop_column("workflow_runs", "learner_snapshot_id")
