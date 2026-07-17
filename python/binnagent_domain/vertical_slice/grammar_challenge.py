from dataclasses import dataclass
from hashlib import sha256
from unicodedata import normalize


@dataclass(frozen=True)
class GrammarChallenge:
    challenge_id: str
    paragraph_id: str
    correct_text: str
    incorrect_text: str
    error_type: str
    hint: str


def select_grammar_challenge(
    task_id: str,
    content_version_id: str,
    candidates: tuple[GrammarChallenge, ...],
) -> GrammarChallenge:
    if not candidates:
        raise ValueError("grammar_challenge_candidates_missing")
    digest = sha256(f"{task_id}:{content_version_id}".encode()).digest()
    return candidates[int.from_bytes(digest[:8], "big") % len(candidates)]


def project_grammar_error(paragraph: str, challenge: GrammarChallenge) -> str:
    if len(challenge.correct_text) != len(challenge.incorrect_text):
        raise ValueError("grammar_challenge_replacement_length_mismatch")
    if paragraph.count(challenge.correct_text) != 1:
        raise ValueError("grammar_challenge_correct_text_not_unique")
    return paragraph.replace(challenge.correct_text, challenge.incorrect_text, 1)


def is_correct_grammar_correction(correction: str, challenge: GrammarChallenge) -> bool:
    return _normalized(correction) == _normalized(challenge.correct_text)


def _normalized(value: str) -> str:
    return " ".join(normalize("NFKC", value).strip().split())
