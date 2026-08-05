"""Expand workflow model ledger guardrails for dedicated Agent budgets.

Revision ID: 0039_model_budget_guardrails
Revises: 0038_imported_articles
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0039_model_budget_guardrails"
down_revision: str | None = "0038_imported_articles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_run_model_calls", "workflow_runs", type_="check")
    op.drop_constraint("ck_run_cost", "workflow_runs", type_="check")
    op.create_check_constraint(
        "ck_run_model_calls",
        "workflow_runs",
        "model_call_count BETWEEN 0 AND 100",
    )
    op.create_check_constraint(
        "ck_run_cost",
        "workflow_runs",
        "cost_usd BETWEEN 0 AND 10",
    )


def downgrade() -> None:
    op.drop_constraint("ck_run_model_calls", "workflow_runs", type_="check")
    op.drop_constraint("ck_run_cost", "workflow_runs", type_="check")
    op.create_check_constraint(
        "ck_run_model_calls",
        "workflow_runs",
        "model_call_count BETWEEN 0 AND 3",
    )
    op.create_check_constraint(
        "ck_run_cost",
        "workflow_runs",
        "cost_usd BETWEEN 0 AND 0.2",
    )
