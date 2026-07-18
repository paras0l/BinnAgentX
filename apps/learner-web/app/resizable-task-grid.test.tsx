import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ResizableTaskGrid } from "./resizable-task-grid";

describe("ResizableTaskGrid", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("workspace-resizing");
  });

  it("supports keyboard resizing and persists the chosen split", () => {
    const { container } = render(
      <ResizableTaskGrid
        className="reading-grid"
        defaultSplit={64}
        storageKey="split-test"
        separatorLabel="调整左右区域宽度"
      >
        <article>左侧</article>
        <section>右侧</section>
      </ResizableTaskGrid>,
    );
    const separator = screen.getByRole("separator", { name: "调整左右区域宽度" });
    const grid = container.querySelector<HTMLElement>(".resizable-task-grid");

    fireEvent.keyDown(separator, { key: "ArrowRight" });

    expect(separator).toHaveAttribute("aria-valuenow", "66");
    expect(grid?.style.getPropertyValue("--workspace-split")).toBe("66%");
    expect(window.localStorage.getItem("split-test")).toBe("66.00");

    fireEvent.doubleClick(separator);

    expect(separator).toHaveAttribute("aria-valuenow", "64");
    expect(window.localStorage.getItem("split-test")).toBe("64.00");
  });

  it("restores a previous split and clamps it to the supported range", () => {
    window.localStorage.setItem("split-test", "95");
    render(
      <ResizableTaskGrid
        className="expression-grid"
        defaultSplit={52}
        storageKey="split-test"
        separatorLabel="调整表达区域宽度"
      >
        <article>左侧</article>
        <section>右侧</section>
      </ResizableTaskGrid>,
    );

    expect(screen.getByRole("separator", { name: "调整表达区域宽度" })).toHaveAttribute(
      "aria-valuenow",
      "76",
    );
  });
});
