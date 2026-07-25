# Language provider benchmark seed v1

This pack defines the normalized inputs and outputs used to compare lexical and
syntax Provider candidates without changing the application contract.

The current five cases are engineering seeds only. Their `gold_status` and the
manifest status must remain pending until language/teaching reviewers verify the
sense keys, structure labels, coverage mix, and release thresholds. Provider
results are normalized with
`contracts/agent-quality/v1/language-provider-result.schema.json` and scored by
`scripts/benchmark_language_providers.py`.

The benchmark deliberately separates three claims:

1. contract and character-offset integrity;
2. agreement with frozen labels;
3. runtime latency.

Passing it does not prove that Chinese teaching explanations, translations, or
learning outcomes are correct.
