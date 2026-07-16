import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ControlHomePage from "./page";

describe("control cockpit home", () => {
  it("states its isolation and audited-control boundary", () => {
    render(<ControlHomePage />);

    expect(screen.getByRole("heading", { name: "开发者控制舱" })).toBeVisible();
    expect(screen.getByText(/只观测合成运行/)).toBeVisible();
    expect(screen.getByText(/不得直接修改数据库/)).toBeVisible();
  });
});
