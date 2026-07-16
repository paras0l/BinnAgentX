import pytest
from binnagent_api.vertical_slice.content_catalog import LocalContentCatalog
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.errors import DomainError


def test_expression_feedback_selects_first_missing_versioned_surface_check() -> None:
    catalog = LocalContentCatalog()

    reason_code, feedback = catalog.approved_expression_feedback(
        "micro_expression_01_v1",
        (
            "Translation tools can help learners check unfamiliar details, but complete "
            "translations may replace the effort needed to understand sentence structure."
        ),
    )

    assert reason_code == "priority_feedback_sequence"
    assert "what the learner should try before" in feedback


def test_expression_feedback_uses_reviewed_fallback_when_surface_checks_are_present() -> None:
    catalog = LocalContentCatalog()

    reason_code, feedback = catalog.approved_expression_feedback(
        "micro_expression_01_v1",
        (
            "Translation tools can help with details, but learners should first inspect the "
            "sentence structure themselves. They can then check only what remains unclear "
            "after that attempt."
        ),
    )

    assert reason_code == "priority_feedback_fallback"
    assert "each sentence has one job" in feedback


def test_expression_feedback_refuses_text_too_short_to_support_a_claim_check() -> None:
    catalog = LocalContentCatalog()

    with pytest.raises(DomainError) as raised:
        catalog.approved_expression_feedback(
            "micro_expression_01_v1",
            "Please write it for me.",
        )

    assert raised.value.code is PublicErrorCode.SAVE_NOT_CONFIRMED
    assert raised.value.reason == "expression_v1_too_short_for_priority_feedback"
