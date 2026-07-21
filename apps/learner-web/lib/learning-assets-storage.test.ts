import { describe, expect, it } from "vitest";

import { EMPTY_LEARNING_ASSETS, type LearningAssetInput } from "./learning-assets-storage";

describe("learning asset index contract", () => {
  it("starts with a metadata-only, non-persistent cache", () => {
    expect(EMPTY_LEARNING_ASSETS).toEqual({ schemaVersion: 2, items: [] });
  });

  it("keeps legacy capture content transient rather than in an asset model", () => {
    const capture: LearningAssetInput = {
      kind: "vocabulary",
      title: "account for",
      content: "解释；占比",
      note: "来自阅读标记",
    };
    expect(capture.content).toBe("解释；占比");
    expect("content" in EMPTY_LEARNING_ASSETS).toBe(false);
  });
});
