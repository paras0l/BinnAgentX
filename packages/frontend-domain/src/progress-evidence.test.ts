import { describe, expect, it } from "vitest";

import { canDescribeStableProgress } from "./progress-evidence";

describe("progress evidence wording gate", () => {
  it("allows stable wording only for delayed independent evidence", () => {
    expect(canDescribeStableProgress("attempted")).toBe(false);
    expect(canDescribeStableProgress("completed_this_time")).toBe(false);
    expect(canDescribeStableProgress("independent_new_material")).toBe(false);
    expect(canDescribeStableProgress("delayed_independent")).toBe(true);
  });
});
