import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { expectNoBrowserFailures, observeBrowserFailures } from "../browser-diagnostics";

test.beforeEach(async ({ page }) => {
  observeBrowserFailures(page);
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

test("control shell makes the boundary explicit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "开发者控制舱" })).toBeVisible();
  await expect(page.getByText(/只观测合成运行/)).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
