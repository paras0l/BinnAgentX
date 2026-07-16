from binnagent_domain.evidence import EvidenceLevel, can_describe_stable_mastery
from hypothesis import given
from hypothesis import strategies as st


@given(st.sampled_from(EvidenceLevel))
def test_stable_mastery_requires_delayed_independent_evidence(level: EvidenceLevel) -> None:
    assert can_describe_stable_mastery(level) is (level is EvidenceLevel.DELAYED_INDEPENDENT)
