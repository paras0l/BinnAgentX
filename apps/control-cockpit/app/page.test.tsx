import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ControlHomePage from "./page";

describe("control cockpit home", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return Response.json(
            {
              code_id: "experience_code_0001",
              code_hint: "TRY-…-9KX2P",
              label: "内测班",
              status: "active",
              max_uses: 12,
              used_count: 0,
              available_uses: 12,
              created_at: "2026-07-16T12:00:00Z",
              expires_at: "2026-07-23T12:00:00Z",
              last_used_at: null,
              revoked_at: null,
              experience_code: "TRY-8K4MN-9KX2P",
            },
            { status: 201 },
          );
        }
        return Response.json([]);
      }),
    );
  });

  it("states the controlled write and learner isolation boundary", async () => {
    render(<ControlHomePage />);

    expect(screen.getByRole("heading", { name: "开发者控制舱" })).toBeVisible();
    expect(screen.getByText(/体验码可写入/)).toBeVisible();
    expect(screen.getByText(/不在数据库保存体验码明文/)).toBeVisible();
    await waitFor(() => expect(screen.getByText("0 条记录")).toBeVisible());
  });

  it("creates an experience code and exposes plaintext only in the one-time result", async () => {
    render(<ControlHomePage />);
    fireEvent.change(screen.getByLabelText("用途备注"), { target: { value: "内测班" } });
    fireEvent.change(screen.getByLabelText("体验人数"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "生成新体验码" }));

    expect(await screen.findByText("TRY-8K4MN-9KX2P")).toBeVisible();
    expect(screen.getByText("内测班")).toBeVisible();
    expect(screen.getByText(/12 人/).closest("span")).toHaveTextContent("0 / 12 人");
  });
});
