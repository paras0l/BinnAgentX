import { describe, expect, it } from "vitest";

import {
  defaultExpressionTabLayout,
  moveExpressionTab,
  normalizeExpressionTabLayout,
} from "./movable-workspace-tabs";

describe("expression workspace tab layout", () => {
  it("reorders a tab within the same pane", () => {
    const layout = defaultExpressionTabLayout(true);

    expect(moveExpressionTab(layout, "review", { pane: "left", index: 0 })).toEqual({
      left: ["review", "brief", "board"],
      right: ["task", "temporary", "notes"],
    });
  });

  it("moves a tab across panes at the requested position", () => {
    const layout = defaultExpressionTabLayout(true);

    expect(moveExpressionTab(layout, "board", { pane: "right", index: 1 })).toEqual({
      left: ["brief", "review"],
      right: ["task", "board", "temporary", "notes"],
    });
  });

  it("repairs duplicate, unknown, and newly enabled tabs from saved layouts", () => {
    expect(
      normalizeExpressionTabLayout(
        {
          left: ["notes", "brief", "brief", "unknown"],
          right: ["task", "board"],
        },
        true,
      ),
    ).toEqual({
      left: ["notes", "brief", "review"],
      right: ["task", "board", "temporary"],
    });
  });

  it("removes the temporary tab when the preference is disabled", () => {
    expect(
      normalizeExpressionTabLayout(
        { left: ["brief", "temporary"], right: ["task", "board", "review", "notes"] },
        false,
      ),
    ).toEqual({
      left: ["brief"],
      right: ["task", "board", "review", "notes"],
    });
  });
});
