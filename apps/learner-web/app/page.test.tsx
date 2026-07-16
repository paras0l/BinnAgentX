import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LearnerHomePage from "./page";

describe("learner home", () => {
  it("keeps the experience focused on reading and learner output", () => {
    render(<LearnerHomePage />);

    expect(screen.getByRole("heading", { name: "语境实验室 × 表达实验室" })).toBeVisible();
    expect(screen.getByText(/不会替你完成答案/)).toBeVisible();
    expect(screen.queryByText(/聊天/)).not.toBeInTheDocument();
  });
});
