import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("forwards an Obsidian plugin bearer credential to the learner API", async () => {
  vi.stubEnv("NEXT_PUBLIC_LEARNER_API_BASE_URL", "http://app:8000/learner");
  const upstream = vi.fn().mockResolvedValue(Response.json([]));
  vi.stubGlobal("fetch", upstream);

  const request = new NextRequest(
    "http://learner.example/api/learner/v1/obsidian-sync/obsync_1/exports",
    { headers: { Authorization: "Bearer plugin-secret" } },
  );
  const response = await GET(request, {
    params: Promise.resolve({ path: ["v1", "obsidian-sync", "obsync_1", "exports"] }),
  });

  expect(response.status).toBe(200);
  expect(upstream).toHaveBeenCalledOnce();
  const [url, init] = upstream.mock.calls[0] as [URL, RequestInit];
  expect(url.toString()).toBe("http://app:8000/learner/v1/obsidian-sync/obsync_1/exports");
  expect(new Headers(init.headers).get("Authorization")).toBe("Bearer plugin-secret");
});
