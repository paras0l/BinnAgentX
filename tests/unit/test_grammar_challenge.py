from binnagent_domain.vertical_slice.grammar_challenge import (
    GrammarChallenge,
    is_correct_grammar_correction,
    project_grammar_error,
    select_grammar_challenge,
)


def _candidate(challenge_id: str, correct: str, incorrect: str) -> GrammarChallenge:
    return GrammarChallenge(
        challenge_id=challenge_id,
        paragraph_id="paragraph_01",
        correct_text=correct,
        incorrect_text=incorrect,
        error_type="主谓一致",
        hint="检查主语和谓语形式。",
    )


def test_selection_is_stable_for_the_same_task_and_content() -> None:
    candidates = (
        _candidate("grammar_candidate_01", "found", "finds"),
        _candidate("grammar_candidate_02", "shows", "shown"),
    )

    first = select_grammar_challenge("task_stable_01", "content_version_01", candidates)
    second = select_grammar_challenge("task_stable_01", "content_version_01", candidates)

    assert first == second
    assert first in candidates


def test_projection_inserts_exactly_one_reviewed_error() -> None:
    challenge = _candidate("grammar_candidate_01", "found", "finds")

    projected = project_grammar_error("More students found a place.", challenge)

    assert projected == "More students finds a place."


def test_correction_normalizes_surrounding_and_repeated_whitespace() -> None:
    challenge = _candidate("grammar_candidate_01", "should act", "should ate")

    assert is_correct_grammar_correction("  should   act  ", challenge) is True
    assert is_correct_grammar_correction("should ate", challenge) is False
