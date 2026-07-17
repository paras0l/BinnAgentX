import asyncio
from decimal import Decimal

import pytest
from binnagent_agent import (
    DeterministicPriorityFeedbackAdapter,
    GatewayOutcome,
    ModelAdapterResponse,
    ModelBudget,
    PriorityFeedbackGateway,
    PriorityFeedbackRequest,
)


def request() -> PriorityFeedbackRequest:
    return PriorityFeedbackRequest(
        workflow_run_id="workflow_run_gateway",
        task_id="task_gateway",
        input_attempt_version_id="attempt_version_gateway",
        content_version_id="content_version_gateway",
        attempt_text="The tool is useful, but learners should reason before relying on it.",
        fallback_reason_code="priority_feedback_sequence",
        fallback_feedback="State what reasoning the learner should try before using the tool.",
    )


def budget(*, calls: int = 0, cost: str = "0") -> ModelBudget:
    return ModelBudget(
        call_count=calls,
        cost_usd=Decimal(cost),
        max_calls=3,
        max_cost_usd=Decimal("0.20"),
    )


class StubRemoteAdapter:
    name = "stub_remote"
    is_remote = True
    estimated_cost_usd = Decimal("0.05")

    def __init__(self, payload: object, *, delay: float = 0) -> None:
        self.payload = payload
        self.delay = delay
        self.called = False

    async def generate(self, _: PriorityFeedbackRequest) -> ModelAdapterResponse:
        self.called = True
        if self.delay:
            await asyncio.sleep(self.delay)
        return ModelAdapterResponse(payload=self.payload, actual_cost_usd=Decimal("0.04"))


def valid_payload() -> dict[str, object]:
    return {
        "schema_version": "1.0.0",
        "focus": "logic",
        "feedback": "State the missing reasoning step before relying on the tool.",
        "evidence_quote": "learners should reason",
        "replacement_text": None,
    }


@pytest.mark.asyncio
async def test_fixture_output_is_validated_and_evidence_is_not_copied_to_audit() -> None:
    result = await PriorityFeedbackGateway(
        DeterministicPriorityFeedbackAdapter(), timeout_seconds=1
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.VALIDATED_FIXTURE
    assert result.used_remote_call is False
    assert result.actual_cost_usd == Decimal("0")
    assert result.evidence_start == 0
    assert result.evidence_end == 68
    assert result.evidence_hash is not None
    assert not hasattr(result, "evidence_quote")


@pytest.mark.asyncio
async def test_remote_adapter_is_not_called_when_remote_execution_is_disabled() -> None:
    adapter = StubRemoteAdapter(valid_payload())
    result = await PriorityFeedbackGateway(adapter, timeout_seconds=1).generate(request(), budget())

    assert adapter.called is False
    assert result.outcome is GatewayOutcome.REMOTE_DISABLED_FALLBACK
    assert result.rejection_code == "remote_model_calls_disabled"


@pytest.mark.asyncio
async def test_budget_rejection_happens_before_remote_call() -> None:
    adapter = StubRemoteAdapter(valid_payload())
    result = await PriorityFeedbackGateway(adapter, timeout_seconds=1, allow_remote=True).generate(
        request(), budget(calls=3)
    )

    assert adapter.called is False
    assert result.outcome is GatewayOutcome.BUDGET_FALLBACK
    assert result.rejection_code == "model_budget_exhausted"


@pytest.mark.asyncio
async def test_valid_remote_candidate_is_accepted_only_after_schema_and_evidence_checks() -> None:
    adapter = StubRemoteAdapter(valid_payload())
    result = await PriorityFeedbackGateway(adapter, timeout_seconds=1, allow_remote=True).generate(
        request(), budget()
    )

    assert result.outcome is GatewayOutcome.VALIDATED_MODEL
    assert result.reason_code == "priority_feedback_model_validated"
    assert result.actual_cost_usd == Decimal("0.04")
    assert result.focus == "logic"
    assert result.evidence_hash is not None


@pytest.mark.asyncio
async def test_timeout_uses_reviewed_fallback_and_conservatively_charges_estimate() -> None:
    adapter = StubRemoteAdapter(valid_payload(), delay=0.05)
    result = await PriorityFeedbackGateway(
        adapter, timeout_seconds=0.005, allow_remote=True
    ).generate(request(), budget())

    assert result.outcome is GatewayOutcome.TIMEOUT_FALLBACK
    assert result.used_remote_call is True
    assert result.actual_cost_usd == adapter.estimated_cost_usd
    assert result.delivered_content == request().fallback_feedback


@pytest.mark.asyncio
async def test_extra_or_writer_fields_are_rejected() -> None:
    payload = valid_payload() | {"replacement_text": "The model writes it for the learner."}
    adapter = StubRemoteAdapter(payload)
    result = await PriorityFeedbackGateway(adapter, timeout_seconds=1, allow_remote=True).generate(
        request(), budget()
    )

    assert result.outcome is GatewayOutcome.INVALID_OUTPUT_FALLBACK
    assert result.rejection_code == "model_output_schema_invalid"


@pytest.mark.asyncio
async def test_whitespace_only_feedback_is_rejected() -> None:
    payload = valid_payload() | {"feedback": " " * 20}
    adapter = StubRemoteAdapter(payload)
    result = await PriorityFeedbackGateway(adapter, timeout_seconds=1, allow_remote=True).generate(
        request(), budget()
    )

    assert result.outcome is GatewayOutcome.INVALID_OUTPUT_FALLBACK


@pytest.mark.asyncio
async def test_evidence_quote_must_be_an_exact_attempt_substring() -> None:
    payload = valid_payload() | {"evidence_quote": "words that were never written"}
    adapter = StubRemoteAdapter(payload)
    result = await PriorityFeedbackGateway(adapter, timeout_seconds=1, allow_remote=True).generate(
        request(), budget()
    )

    assert result.outcome is GatewayOutcome.EVIDENCE_MISMATCH_FALLBACK
    assert result.rejection_code == "model_evidence_not_in_attempt"
