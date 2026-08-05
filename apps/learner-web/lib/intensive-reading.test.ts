import { describe, expect, it } from "vitest";

import {
  addComponentMark,
  applyComponentStyle,
  compareComponentMarks,
  DEFAULT_COMPONENT_STYLES,
  resolveIntensiveSentence,
  sentenceRanges,
} from "./intensive-reading";

describe("intensive reading sentence normalization", () => {
  const paragraph = 'First sentence. "A second sentence?" Third one has no final mark';

  it("parses punctuation, closing quotes, and the trailing sentence", () => {
    expect(
      sentenceRanges(paragraph).map((range) => paragraph.slice(range.start, range.end)),
    ).toEqual(["First sentence.", '"A second sentence?"', "Third one has no final mark"]);
  });

  it("chooses the sentence with the greatest overlap for a partial cross-sentence selection", () => {
    const start = paragraph.indexOf("second");
    const end = paragraph.indexOf("Third") + 2;
    expect(resolveIntensiveSentence("p1", paragraph, start, end).textQuote).toBe(
      '"A second sentence?"',
    );
  });

  it("returns the complete containing sentence for a partial selection", () => {
    const start = paragraph.indexOf("second");
    const result = resolveIntensiveSentence("p1", paragraph, start, start + 6);
    expect(result.textQuote).toBe('"A second sentence?"');
    expect(result.usedParagraphFallback).toBe(false);
  });
});

describe("intensive reading component styles and marks", () => {
  it("atomically clears the previous owner when a style is reassigned", () => {
    const next = applyComponentStyle(DEFAULT_COMPONENT_STYLES, "subject", "double");
    expect(next.subject).toBe("double");
    expect(next.object).toBe("none");
  });

  it("replaces overlapping learner marks instead of silently stacking them", () => {
    const sentence = "Readers examine evidence carefully.";
    const initial = {
      id: "m1",
      role: "subject" as const,
      start: 0,
      end: 7,
      textQuote: "Readers",
    };
    const next = {
      id: "m2",
      role: "predicate" as const,
      start: 0,
      end: 15,
      textQuote: "Readers examine",
    };
    const result = addComponentMark(sentence, [initial], next);
    expect(result.replaced).toEqual([initial]);
    expect(result.marks).toEqual([next]);
  });

  it("compares learner marks with validated candidates without calling unverified marks wrong", () => {
    const learnerMarks = [
      { id: "m1", role: "subject" as const, start: 0, end: 7, textQuote: "Readers" },
      { id: "m2", role: "object" as const, start: 16, end: 24, textQuote: "evidence" },
      { id: "m3", role: "adverbial" as const, start: 25, end: 34, textQuote: "carefully" },
    ];
    const candidates = [
      {
        role: "subject" as const,
        start: 0,
        end: 7,
        text_quote: "Readers",
        explanation: "动作发出者。",
      },
      {
        role: "predicate" as const,
        start: 8,
        end: 24,
        text_quote: "examine evidence",
        explanation: "谓语及其宾语构成谓语部分。",
      },
    ];

    expect(compareComponentMarks(learnerMarks, candidates).map((row) => row.status)).toEqual([
      "matched",
      "role_difference",
      "unverified",
    ]);
  });
});
