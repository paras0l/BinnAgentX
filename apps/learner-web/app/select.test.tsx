import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Select } from "./select";

describe("Select", () => {
  afterEach(cleanup);

  it("opens a styled listbox and emits the selected value", () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="反馈详细程度" value="balanced" onChange={onChange}>
        <option value="concise">一句话</option>
        <option value="balanced">关键依据 + 下一步</option>
        <option value="detailed">完整反馈 + 修改步骤</option>
      </Select>,
    );

    const trigger = screen.getByRole("button", { name: "反馈详细程度" });
    expect(trigger.closest('[data-ui-anchor="select-control"]')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toHaveAttribute("data-ui-anchor", "popover");
    fireEvent.click(screen.getByRole("option", { name: "完整反馈 + 修改步骤" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { name: undefined, value: "detailed" } }),
    );
  });

  it("supports keyboard selection", () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="页面留白" defaultValue="comfortable" onChange={onChange}>
        <option value="compact">紧凑</option>
        <option value="comfortable">舒适</option>
        <option value="spacious">宽松</option>
      </Select>,
    );

    const trigger = screen.getByRole("button", { name: "页面留白" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { name: undefined, value: "spacious" } }),
    );
  });
});
