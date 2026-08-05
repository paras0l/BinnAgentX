import { describe, expect, it } from "vitest";

import {
  classifySelection,
  defaultAnalysisQuestion,
  normalizeAnnotationSelection,
  recommendedAnnotationKind,
  selectionScope,
  splitAnnotationDisplayText,
} from "./annotation-selection";

describe("annotation selection routing", () => {
  it("removes accidentally selected surrounding spaces without shifting the word", () => {
    const paragraph = "Sixth grade is an exciting year.";
    const rawStart = paragraph.indexOf("exciting") - 1;
    const selection = normalizeAnnotationSelection(" exciting ", rawStart);

    expect(selection).toEqual({
      start: paragraph.indexOf("exciting"),
      end: paragraph.indexOf("exciting") + "exciting".length,
      textQuote: "exciting",
    });
    expect(
      `${paragraph.slice(0, selection.start)}[${selection.textQuote}]${paragraph.slice(selection.end)}`,
    ).toBe("Sixth grade is an [exciting] year.");
    expect(splitAnnotationDisplayText("exciting ")).toEqual({
      leadingWhitespace: "",
      annotatedText: "exciting",
      trailingWhitespace: " ",
    });
  });

  it("routes a word and a short phrase to vocabulary help", () => {
    for (const text of ["capacity", "existing space"]) {
      const scale = classifySelection(text);
      expect(selectionScope(scale)).toBe("word_or_phrase");
      expect(recommendedAnnotationKind(scale)).toBe("vocabulary");
      expect(defaultAnalysisQuestion(scale)).toContain("语境");
    }
  });

  it("routes a long sentence to translation and grammar help", () => {
    const text =
      "The result came from sharing the existing space more carefully, not from adding capacity.";
    const scale = classifySelection(text);

    expect(scale).toBe("sentence");
    expect(selectionScope(scale)).toBe("sentence_or_paragraph");
    expect(recommendedAnnotationKind(scale)).toBe("grammar");
    expect(defaultAnalysisQuestion(scale)).toContain("完整中文翻译");
  });

  it("recognizes a full paragraph even when it contains one sentence", () => {
    const paragraph =
      "After the change, more students found a place to work without creating more rooms.";

    expect(classifySelection(paragraph, paragraph)).toBe("paragraph");
  });
});
