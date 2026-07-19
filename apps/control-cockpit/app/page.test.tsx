import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ControlHomePage from "./page";

const STATUS = {
  worker: {
    online: true,
    state: "idle",
    current_job_id: null,
    started_at: "2026-07-19T10:00:00Z",
    heartbeat_at: "2026-07-19T12:00:00Z",
  },
  langfuse: { configured: true, reachable: true, url: "http://localhost:3100" },
  prefect: {
    configured: true,
    reachable: true,
    url: "http://localhost:4200",
    active_workers: 1,
  },
  model_provider: "longcat",
  model_name: "LongCat-2.0",
  queue_depth: 0,
  running_count: 0,
  failed_count: 0,
  active_pack_job_id: null,
};

describe("control cockpit home", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("content-generation/status")) return Response.json(STATUS);
        if (url.endsWith("content-generation/jobs")) return Response.json([]);
        if (url.endsWith("experience-codes") && init?.method === "POST") {
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

  it("shows real worker, model, Langfuse and content pipeline status", async () => {
    render(<ControlHomePage />);

    expect(screen.getByRole("heading", { name: "材料生产控制台" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "材料生成与发布" })).toBeVisible();
    expect(screen.getByRole("link", { name: /打开 Langfuse/ })).toHaveAttribute(
      "href",
      "http://localhost:3100",
    );
    await waitFor(() => expect(screen.getByText("在线待命")).toBeVisible());
    expect(screen.getByText("longcat / LongCat-2.0")).toBeVisible();
    expect(screen.getByText("已连接")).toBeVisible();
    expect(screen.getByText("1 个任务 Worker")).toBeVisible();
  });

  it("creates an experience code and exposes plaintext only in the one-time result", async () => {
    render(<ControlHomePage />);
    fireEvent.click(screen.getByRole("button", { name: "体验访问" }));
    fireEvent.change(screen.getByLabelText("用途备注"), { target: { value: "内测班" } });
    fireEvent.change(screen.getByLabelText("体验人数"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "生成新体验码" }));

    expect(await screen.findByText("TRY-8K4MN-9KX2P")).toBeVisible();
    expect(screen.getByText("内测班")).toBeVisible();
    expect(screen.getByText("0 / 12 人")).toBeVisible();
  });
});
