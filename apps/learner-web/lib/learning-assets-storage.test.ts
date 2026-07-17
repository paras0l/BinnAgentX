import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addLearningAsset,
  loadLearningAssets,
  reviewLearningAsset,
  setLearningAssetMastery,
  toggleLearningAssetStar,
} from "./learning-assets-storage";

describe("learning asset storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("starts empty and ignores corrupt storage", () => {
    expect(loadLearningAssets("learner_1").items).toEqual([]);
    localStorage.setItem("binnagent:learning-assets:v1:learner_1", "not-json");
    expect(loadLearningAssets("learner_1").items).toEqual([]);
  });

  it("adds and deduplicates the same learner asset", () => {
    const first = addLearningAsset("learner_1", loadLearningAssets("learner_1"), {
      kind: "vocabulary",
      title: "account for",
      content: "解释；占比",
      sourceTitle: "Sample reading",
    });
    const second = addLearningAsset("learner_1", first, {
      kind: "vocabulary",
      title: "ACCOUNT FOR",
      content: "解释；构成比例",
      sourceTitle: "Sample reading",
    });

    expect(second.items).toHaveLength(1);
    expect(second.items[0]?.content).toBe("解释；构成比例");
    expect(loadLearningAssets("learner_1").items).toHaveLength(1);
  });

  it("records review progress, mastery and stars", () => {
    const added = addLearningAsset("learner_1", loadLearningAssets("learner_1"), {
      kind: "reading_skill",
      title: "先定位转折",
      content: "转折后的判断通常更接近作者立场。",
    });
    const id = added.items[0]!.assetId;
    const reviewed = reviewLearningAsset("learner_1", added, id);
    const starred = toggleLearningAssetStar("learner_1", reviewed, id);
    const mastered = setLearningAssetMastery("learner_1", starred, id, 100);

    expect(mastered.items[0]).toMatchObject({ reviewCount: 1, mastery: 100, starred: true });
    expect(mastered.items[0]?.lastReviewedAt).toEqual(expect.any(String));
  });
});
