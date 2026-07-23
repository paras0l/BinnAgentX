import { describe, expect, it } from "vitest";

import { preferenceAdjustedFeedback } from "./learning-workspace";

describe("training feedback preferences", () => {
  it("makes concise feedback keep only the first actionable sentence", () => {
    expect(
      preferenceAdjustedFeedback("先检查转折后的主张。再对照第二段证据。", {
        correctionTone: "gentle",
        feedbackDetail: "concise",
      }),
    ).toBe("先看这一处：先检查转折后的主张。");
  });

  it("changes the correction tone without changing the feedback standard", () => {
    expect(
      preferenceAdjustedFeedback("检查主语与谓语是否一致。", {
        correctionTone: "direct",
        feedbackDetail: "detailed",
      }),
    ).toBe("需要修改：检查主语与谓语是否一致。");
  });
});
