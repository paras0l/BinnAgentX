import { describe, expect, it } from "vitest";

import { layoutKnuthPlassParagraph } from "./knuth-plass-layout";

describe("layoutKnuthPlassParagraph", () => {
  it("returns source-aligned lines with globally calculated spacing", () => {
    const text = "Alpha beta gamma delta epsilon";
    const segments = ["Alpha", " ", "beta", " ", "gamma", " ", "delta", " ", "epsilon"];
    const widths = [42, 5, 34, 5, 45, 5, 36, 5, 49];

    const lines = layoutKnuthPlassParagraph(text, { segments, widths }, 105);

    expect(lines).not.toBeNull();
    expect(lines?.[0]?.start).toBe(0);
    expect(lines?.at(-1)?.end).toBe(text.length);
    expect(lines?.map((line) => text.slice(line.start, line.end)).join("")).toBe(text);
    expect(lines?.slice(0, -1).every((line) => Number.isFinite(line.wordSpacing))).toBe(true);
    expect(lines?.at(-1)?.wordSpacing).toBe(0);
  });

  it("uses paragraph-wide optimization instead of always taking the fullest first line", () => {
    const text = "aa bb cc dd ee ff gg hh";
    const segments = ["aa", " ", "bb", " ", "cc", " ", "dd", " ", "ee", " ", "ff", " ", "gg", " ", "hh"];
    const widths = [18, 8, 45, 8, 21, 8, 41, 8, 16, 8, 44, 8, 33, 8, 27];

    const lines = layoutKnuthPlassParagraph(text, { segments, widths }, 100);

    expect(lines).not.toBeNull();
    expect(text.slice(lines![0]!.start, lines![0]!.end).trim()).toBe("aa bb");
    expect(text.slice(lines![1]!.start, lines![1]!.end).trim()).toBe("cc dd ee");
    expect(lines![0]!.adjustmentRatio).toBeGreaterThan(0.8);
    expect(lines![0]!.wordSpacing).toBe(0);
  });

  it("falls back when Pretext normalization no longer maps exactly to source offsets", () => {
    expect(
      layoutKnuthPlassParagraph(
        "two  spaces",
        { segments: ["two", " ", "spaces"], widths: [24, 4, 48] },
        120,
      ),
    ).toBeNull();
  });
});
