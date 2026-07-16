"""Add the first vertical-slice domain projections and immutable facts.

Revision ID: 0002_vertical_slice_domain
Revises: 0001_engineering_baseline
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_vertical_slice_domain"
down_revision: str | None = "0001_engineering_baseline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learner_profile_snapshots",
        sa.Column("learner_snapshot_id", sa.String(length=128), primary_key=True),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "workflow_runs",
        sa.Column("workflow_run_id", sa.String(length=128), primary_key=True),
        sa.Column("workflow_version", sa.String(length=128), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("checkpoint_id", sa.String(length=128), nullable=False),
        sa.Column("model_call_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost_usd", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("model_call_count BETWEEN 0 AND 3", name="ck_run_model_calls"),
        sa.CheckConstraint("cost_usd BETWEEN 0 AND 0.2", name="ck_run_cost"),
    )
    op.create_table(
        "learning_tasks",
        sa.Column("task_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "workflow_run_id",
            sa.String(length=128),
            sa.ForeignKey("workflow_runs.workflow_run_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "learner_snapshot_id",
            sa.String(length=128),
            sa.ForeignKey("learner_profile_snapshots.learner_snapshot_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("task_type", sa.String(length=32), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("state_before_pause", sa.String(length=32), nullable=True),
        sa.Column("highest_hint_level", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("highest_hint_level BETWEEN 0 AND 4", name="ck_task_hint_level"),
        sa.CheckConstraint("version >= 1", name="ck_task_version"),
    )
    op.create_index("ix_learning_tasks_run", "learning_tasks", ["workflow_run_id"])
    op.create_table(
        "task_material_assignments",
        sa.Column("assignment_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "task_id",
            sa.String(length=128),
            sa.ForeignKey("learning_tasks.task_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("content_id", sa.String(length=128), nullable=False),
        sa.Column("content_version_id", sa.String(length=128), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("rights_status", sa.String(length=32), nullable=False),
        sa.Column("difficulty_status", sa.String(length=32), nullable=False),
        sa.Column("reason_code", sa.String(length=64), nullable=False),
        sa.Column("eligible_when_assigned", sa.Boolean(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("task_id", "ordinal", name="uq_task_material_ordinal"),
    )
    op.create_table(
        "task_annotations",
        sa.Column("annotation_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "task_id",
            sa.String(length=128),
            sa.ForeignKey("learning_tasks.task_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("content_version_id", sa.String(length=128), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("paragraph_id", sa.String(length=128), nullable=False),
        sa.Column("span_start", sa.Integer(), nullable=False),
        sa.Column("span_end", sa.Integer(), nullable=False),
        sa.Column("text_quote", sa.Text(), nullable=False),
        sa.Column("text_hash", sa.String(length=64), nullable=False),
        sa.Column("user_explanation", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("span_start >= 0 AND span_end > span_start", name="ck_annotation_span"),
    )
    op.create_table(
        "material_assignment_invalidations",
        sa.Column("invalidation_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "assignment_id",
            sa.String(length=128),
            sa.ForeignKey("task_material_assignments.assignment_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("reason_code", sa.String(length=64), nullable=False),
        sa.Column("invalidated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "attempt_versions",
        sa.Column("attempt_version_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "task_id",
            sa.String(length=128),
            sa.ForeignKey("learning_tasks.task_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("independence", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("task_id", "version", name="uq_attempt_task_version"),
        sa.CheckConstraint("version >= 1", name="ck_attempt_version"),
    )
    op.create_table(
        "ai_interventions",
        sa.Column("intervention_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "task_id",
            sa.String(length=128),
            sa.ForeignKey("learning_tasks.task_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "input_attempt_version_id",
            sa.String(length=128),
            sa.ForeignKey("attempt_versions.attempt_version_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("hint_level", sa.SmallInteger(), nullable=False),
        sa.Column("intervention_type", sa.String(length=32), nullable=False),
        sa.Column("model_adapter", sa.String(length=64), nullable=False),
        sa.Column("prompt_version", sa.String(length=128), nullable=False),
        sa.Column("result_status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("hint_level BETWEEN 1 AND 4", name="ck_intervention_hint_level"),
    )
    op.create_table(
        "revision_events",
        sa.Column("revision_event_id", sa.String(length=128), primary_key=True),
        sa.Column(
            "task_id",
            sa.String(length=128),
            sa.ForeignKey("learning_tasks.task_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "from_attempt_version_id",
            sa.String(length=128),
            sa.ForeignKey("attempt_versions.attempt_version_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "to_attempt_version_id",
            sa.String(length=128),
            sa.ForeignKey("attempt_versions.attempt_version_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "intervention_id",
            sa.String(length=128),
            sa.ForeignKey("ai_interventions.intervention_id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("result_status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "domain_events",
        sa.Column("event_id", sa.String(length=128), primary_key=True),
        sa.Column("event_type", sa.String(length=96), nullable=False),
        sa.Column("aggregate_id", sa.String(length=128), nullable=False),
        sa.Column("aggregate_version", sa.Integer(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_domain_events_aggregate",
        "domain_events",
        ["aggregate_id", "aggregate_version"],
    )
    op.create_table(
        "audit_events",
        sa.Column("audit_event_id", sa.String(length=128), primary_key=True),
        sa.Column("workflow_run_id", sa.String(length=128), nullable=False),
        sa.Column("actor_type", sa.String(length=32), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("reason_code", sa.String(length=64), nullable=False),
        sa.Column("target_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_index("ix_domain_events_aggregate", table_name="domain_events")
    op.drop_table("domain_events")
    op.drop_table("revision_events")
    op.drop_table("ai_interventions")
    op.drop_table("attempt_versions")
    op.drop_table("material_assignment_invalidations")
    op.drop_table("task_annotations")
    op.drop_table("task_material_assignments")
    op.drop_index("ix_learning_tasks_run", table_name="learning_tasks")
    op.drop_table("learning_tasks")
    op.drop_table("workflow_runs")
    op.drop_table("learner_profile_snapshots")
