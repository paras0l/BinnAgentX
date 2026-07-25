from binnagent_agent.language import (
    AnalysisStatus,
    InMemoryLanguageAnalysisCache,
    LexicalAnalysisRequest,
    SyntaxAnalysisRequest,
    analyze_lexical,
    analyze_syntax,
)
from binnagent_agent.language.analysis import (
    LexicalSenseCandidate,
    SyntaxProviderOutput,
    TextOffset,
    TranslationAlignment,
)


class _LexicalFixture:
    provider_id = "licensed-fixture"
    provider_version = "2026.1"

    def __init__(self, candidates: tuple[LexicalSenseCandidate, ...]) -> None:
        self.candidates = candidates
        self.calls = 0

    def lookup(self, _request: LexicalAnalysisRequest) -> tuple[LexicalSenseCandidate, ...]:
        self.calls += 1
        return self.candidates


class _SyntaxFixture:
    provider_id = "parser-fixture"
    provider_version = "1.0"

    def __init__(self, output: SyntaxProviderOutput) -> None:
        self.output = output
        self.calls = 0

    def parse(self, _request: SyntaxAnalysisRequest) -> SyntaxProviderOutput:
        self.calls += 1
        return self.output


def test_lexical_analysis_abstains_without_provider_sense() -> None:
    provider = _LexicalFixture(())
    result = analyze_lexical(
        LexicalAnalysisRequest(
            lemma="bank",
            selected_text="bank",
            paragraph_context="They sat by the bank.",
        ),
        provider,
        InMemoryLanguageAnalysisCache(),
    )

    assert result.status is AnalysisStatus.ABSTAINED
    assert result.reason_code == "lexical_provider_no_candidate"


def test_lexical_cache_is_stable_for_provider_version_and_request() -> None:
    provider = _LexicalFixture(
        (
            LexicalSenseCandidate(
                sense_id="bank.n.02",
                part_of_speech="noun",
                gloss="the land beside a river",
                confidence=0.95,
            ),
        )
    )
    cache = InMemoryLanguageAnalysisCache()
    request = LexicalAnalysisRequest(
        lemma="bank",
        selected_text="bank",
        paragraph_context="They sat by the bank.",
    )

    first = analyze_lexical(request, provider, cache)
    second = analyze_lexical(request, provider, cache)

    assert first == second
    assert first.status is AnalysisStatus.RESOLVED
    assert provider.calls == 1


def test_syntax_analysis_rejects_provider_offset_mismatch() -> None:
    selected = "Although it rained, we left."
    request = SyntaxAnalysisRequest(
        selected_text=selected,
        paragraph_context=f"Before. {selected} After.",
        selection_start=8,
        selection_end=8 + len(selected),
    )
    provider = _SyntaxFixture(
        SyntaxProviderOutput(
            structures=(
                TextOffset(
                    start=0,
                    end=8,
                    text_quote="However",
                    label="concession",
                ),
            ),
            confidence=0.95,
        )
    )

    result = analyze_syntax(request, provider, InMemoryLanguageAnalysisCache())

    assert result.status is AnalysisStatus.ABSTAINED
    assert result.structures == ()
    assert result.reason_code == "syntax_span_invalid"


def test_syntax_low_confidence_is_review_required_not_resolved() -> None:
    selected = "Although it rained, we left."
    request = SyntaxAnalysisRequest(
        selected_text=selected,
        paragraph_context=selected,
        selection_start=0,
        selection_end=len(selected),
    )
    source = TextOffset(
        start=0,
        end=18,
        text_quote="Although it rained",
        label="concession_clause",
    )
    provider = _SyntaxFixture(
        SyntaxProviderOutput(
            structures=(source,),
            translation="尽管下雨了, 我们还是离开了。",
            translation_alignment=(
                TranslationAlignment(source=source, translated_text="尽管下雨了"),
            ),
            confidence=0.62,
        )
    )

    result = analyze_syntax(request, provider, InMemoryLanguageAnalysisCache())

    assert result.status is AnalysisStatus.REVIEW_REQUIRED
    assert result.reason_code == "syntax_confidence_below_threshold"
