import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { expectNoBrowserFailures, observeBrowserFailures } from "../browser-diagnostics";

test.beforeEach(async ({ page }) => {
  observeBrowserFailures(page);
  await page.route("**/api/control/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/content-generation/status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          worker: {
            online: true,
            state: "idle",
            current_job_id: null,
            started_at: "2026-07-21T12:00:00Z",
            heartbeat_at: "2026-07-21T12:00:00Z",
          },
          langfuse: { configured: false, reachable: false, url: "http://localhost:3100" },
          model_provider: "deterministic_fixture",
          model_name: "deterministic_fixture",
          queue_depth: 0,
          running_count: 0,
          failed_count: 0,
          active_pack_job_id: null,
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.addInitScript(() => {
    const markExtensionMutation = () => {
      document.documentElement?.setAttribute("data-browser-extension-probe", "installed");
      document.body?.setAttribute("data-browser-extension-probe", "installed");
    };
    new MutationObserver(markExtensionMutation).observe(document, {
      childList: true,
      subtree: true,
    });
    markExtensionMutation();
  });
});

test.afterEach(async ({ page }) => {
  expectNoBrowserFailures(page);
});

test("control shell exposes managed experience access with an explicit boundary", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "材料生产控制台" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "个性化阅读生成" })).toBeVisible();
  await expect(page.getByText("还没有学习者发起个性化材料生成。")).toBeVisible();
  const accessNavigation = page.getByRole("button", { name: "体验访问", exact: true });
  await accessNavigation.click();
  await expect(accessNavigation).toHaveClass(/active/);
  await expect(page.getByRole("heading", { name: "体验访问管理" })).toBeVisible();
  await expect(page.getByText(/明文只展示一次/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "生成体验码" })).toBeVisible();
  await expect(page.getByRole("button", { name: "生成新体验码" })).toBeEnabled();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
