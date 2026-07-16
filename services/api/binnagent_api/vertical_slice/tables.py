import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

metadata = sa.MetaData()

learner_profile_snapshots = sa.Table(
    "learner_profile_snapshots",
    metadata,
    sa.Column("learner_snapshot_id", sa.String(128), primary_key=True),
    sa.Column("snapshot", postgresql.JSONB(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
)
workflow_runs = sa.Table(
    "workflow_runs",
    metadata,
    sa.Column("workflow_run_id", sa.String(128), primary_key=True),
    sa.Column("workflow_version", sa.String(128), nullable=False),
    sa.Column("state", sa.String(32), nullable=False),
    sa.Column("checkpoint_id", sa.String(128), nullable=False),
    sa.Column("model_call_count", sa.Integer(), nullable=False),
    sa.Column("cost_usd", sa.Numeric(8, 4), nullable=False),
    sa.Column("version", sa.Integer(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
)
learning_tasks = sa.Table(
    "learning_tasks",
    metadata,
    sa.Column("task_id", sa.String(128), primary_key=True),
    sa.Column("workflow_run_id", sa.String(128), nullable=False),
    sa.Column("learner_snapshot_id", sa.String(128), nullable=False),
    sa.Column("task_type", sa.String(32), nullable=False),
    sa.Column("state", sa.String(32), nullable=False),
    sa.Column("state_before_pause", sa.String(32), nullable=True),
    sa.Column("highest_hint_level", sa.SmallInteger(), nullable=False),
    sa.Column("version", sa.Integer(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
)
task_material_assignments = sa.Table(
    "task_material_assignments",
    metadata,
    sa.Column("assignment_id", sa.String(128), primary_key=True),
    sa.Column("task_id", sa.String(128), nullable=False),
    sa.Column("ordinal", sa.Integer(), nullable=False),
    sa.Column("content_id", sa.String(128), nullable=False),
    sa.Column("content_version_id", sa.String(128), nullable=False),
    sa.Column("content_hash", sa.String(64), nullable=False),
    sa.Column("rights_status", sa.String(32), nullable=False),
    sa.Column("difficulty_status", sa.String(32), nullable=False),
    sa.Column("reason_code", sa.String(64), nullable=False),
    sa.Column("eligible_when_assigned", sa.Boolean(), nullable=False),
    sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
)
task_annotations = sa.Table(
    "task_annotations",
    metadata,
    sa.Column("annotation_id", sa.String(128), primary_key=True),
    sa.Column("task_id", sa.String(128), nullable=False),
    sa.Column("content_version_id", sa.String(128), nullable=False),
    sa.Column("kind", sa.String(32), nullable=False),
    sa.Column("paragraph_id", sa.String(128), nullable=False),
    sa.Column("span_start", sa.Integer(), nullable=False),
    sa.Column("span_end", sa.Integer(), nullable=False),
    sa.Column("text_quote", sa.Text(), nullable=False),
    sa.Column("text_hash", sa.String(64), nullable=False),
    sa.Column("user_explanation", sa.Text(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
)
material_assignment_invalidations = sa.Table(
    "material_assignment_invalidations",
    metadata,
    sa.Column("invalidation_id", sa.String(128), primary_key=True),
    sa.Column("assignment_id", sa.String(128), nullable=False),
    sa.Column("reason_code", sa.String(64), nullable=False),
    sa.Column("invalidated_at", sa.DateTime(timezone=True), nullable=False),
)
attempt_versions = sa.Table(
    "attempt_versions",
    metadata,
    sa.Column("attempt_version_id", sa.String(128), primary_key=True),
    sa.Column("task_id", sa.String(128), nullable=False),
    sa.Column("version", sa.Integer(), nullable=False),
    sa.Column("text", sa.Text(), nullable=False),
    sa.Column("content_hash", sa.String(64), nullable=False),
    sa.Column("independence", sa.String(32), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
)
ai_interventions = sa.Table(
    "ai_interventions",
    metadata,
    sa.Column("intervention_id", sa.String(128), primary_key=True),
    sa.Column("task_id", sa.String(128), nullable=False),
    sa.Column("input_attempt_version_id", sa.String(128), nullable=False),
    sa.Column("hint_level", sa.SmallInteger(), nullable=False),
    sa.Column("intervention_type", sa.String(32), nullable=False),
    sa.Column("model_adapter", sa.String(64), nullable=False),
    sa.Column("prompt_version", sa.String(128), nullable=False),
    sa.Column("result_status", sa.String(32), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
)
revision_events = sa.Table(
    "revision_events",
    metadata,
    sa.Column("revision_event_id", sa.String(128), primary_key=True),
    sa.Column("task_id", sa.String(128), nullable=False),
    sa.Column("from_attempt_version_id", sa.String(128), nullable=False),
    sa.Column("to_attempt_version_id", sa.String(128), nullable=False),
    sa.Column("intervention_id", sa.String(128), nullable=True),
    sa.Column("result_status", sa.String(32), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
)
domain_events = sa.Table(
    "domain_events",
    metadata,
    sa.Column("event_id", sa.String(128), primary_key=True),
    sa.Column("event_type", sa.String(96), nullable=False),
    sa.Column("aggregate_id", sa.String(128), nullable=False),
    sa.Column("aggregate_version", sa.Integer(), nullable=False),
    sa.Column("payload", postgresql.JSONB(), nullable=False),
    sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
)
audit_events = sa.Table(
    "audit_events",
    metadata,
    sa.Column("audit_event_id", sa.String(128), primary_key=True),
    sa.Column("workflow_run_id", sa.String(128), nullable=False),
    sa.Column("actor_type", sa.String(32), nullable=False),
    sa.Column("action", sa.String(64), nullable=False),
    sa.Column("reason_code", sa.String(64), nullable=False),
    sa.Column("target_version", sa.Integer(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
)
idempotency_records = sa.Table(
    "idempotency_records",
    metadata,
    sa.Column("idempotency_key", sa.String(128), primary_key=True),
    sa.Column("command_name", sa.String(96), nullable=False),
    sa.Column("request_hash", sa.String(64), nullable=False),
    sa.Column("response_reference", sa.String(160), nullable=True),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
)
outbox_messages = sa.Table(
    "outbox_messages",
    metadata,
    sa.Column("message_id", postgresql.UUID(as_uuid=True), primary_key=True),
    sa.Column("topic", sa.String(96), nullable=False),
    sa.Column("aggregate_id", sa.String(128), nullable=False),
    sa.Column("payload", postgresql.JSONB(), nullable=False),
    sa.Column("status", sa.String(32), nullable=False),
    sa.Column("attempt_count", sa.Integer(), nullable=False),
    sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
)
