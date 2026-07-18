import { describe, expect, it } from "vitest";

import type { ReadingMaterialView } from "./contracts";
import { locateContextMatches } from "./context-locator";

const material: ReadingMaterialView = {
  content_type: "matched_reading",
  content_version_id: "reading_v1",
  title: "Practice",
  paragraphs: [
    { paragraph_id: "paragraph_01", text: "The rule, which began in May, changed access." },
    { paragraph_id: "paragraph_02", text: "However, the result did not last." },
    { paragraph_id: "paragraph_03", text: "Students returned because the schedule changed." },
  ],
  allowed_annotations: [],
  question: { question_id: "question_01", prompt: "Why?", options: [] },
  grammar_challenge: {
    challenge_id: "challenge_01",
    status: "pending",
    attempt_count: 0,
    hint_revealed: false,
    error_type: null,
    hint: null,
    answer: null,
  },
};

describe("context locator", () => {
  it("maps a concept query to all matching paragraphs", () => {
    expect(locateContextMatches("刚才关于定语从句的段落在哪", material, [])).toEqual([
      {
        paragraphId: "paragraph_01",
        reason: "可能包含定语从句或关系词",
        score: 4,
      },
    ]);
  });

  it("ranks an exact phrase above a broad concept match", () => {
    const matches = locateContextMatches("the result", material, []);
    expect(matches[0]?.paragraphId).toBe("paragraph_02");
    expect(matches[0]?.score).toBeGreaterThan(9);
  });
});
