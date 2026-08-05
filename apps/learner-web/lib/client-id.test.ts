import { afterEach, expect, it, vi } from "vitest";

import { createClientToken } from "./client-id";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("creates a client token when randomUUID is unavailable on an HTTP origin", () => {
  vi.stubGlobal("crypto", {
    getRandomValues: (bytes: Uint8Array) => {
      bytes.fill(10);
      return bytes;
    },
  });

  expect(createClientToken()).toBe("0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a");
});
