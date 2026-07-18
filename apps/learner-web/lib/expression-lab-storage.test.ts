import { beforeEach, describe, expect, it } from "vitest";

import type { LearningAsset } from "./learning-assets-storage";
import {
  buildExpressionAssistSuggestions,
  createExpressionNote,
  loadExpressionLab,
  saveExpressionLab,
} from "./expression-lab-storage";

describe("expression lab storage", () => {
  beforeEach(() => localStorage.clear());

  it("scopes the idea board to a task and content version", () => {
    const note = { ...createExpressionNote("claim", 0), text: "My own claim" };
    saveExpressionLab({
      schemaVersion: 1,
      taskId: "task_expression_01",
      contentVersionId: "content_v1",
      notes: [note],
      updatedAt: new Date(0).toISOString(),
    });

    expect(loadExpressionLab("task_expression_01", "content_v1").notes).toEqual([note]);
    expect(loadExpressionLab("task_expression_01", "content_v2").notes).toEqual([]);
  });

  it("prioritizes recent learning assets while retaining an expansion prompt", () => {
    const asset = (id: string, createdAt: string): LearningAsset => ({
      assetId: id,
      kind: "writing_expression",
      title: `Asset ${id}`,
      content: `Reusable expression ${id}`,
      note: "",
      sourceTitle: "Practice",
      createdAt,
      lastReviewedAt: null,
      reviewCount: 0,
      mastery: 10,
      starred: false,
    });
    const suggestions = buildExpressionAssistSuggestions("wording", [
      asset("old", "2026-01-01T00:00:00.000Z"),
      asset("new", "2026-02-01T00:00:00.000Z"),
    ]);

    expect(suggestions.map((item) => item.source)).toEqual([
      "recent_asset",
      "recent_asset",
      "expansion",
    ]);
    expect(suggestions[0]?.title).toBe("Asset new");
  });
});
