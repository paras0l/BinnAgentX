import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import LearnerHomePage from "./page";

describe("learner home", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps the experience focused on reading and learner output", async () => {
    render(<LearnerHomePage />);

    expect(await screen.findByRole("heading", { name: "语境实验室 × 表达实验室" })).toBeVisible();
    expect(screen.getByText(/不会给出伪精确能力分/)).toBeVisible();
    expect(screen.getByRole("button", { name: "开始独立校准" })).toBeEnabled();
    expect(screen.queryByText(/聊天/)).not.toBeInTheDocument();
  });
});
