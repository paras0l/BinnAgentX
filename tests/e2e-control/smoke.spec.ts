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

test("control shell exposes managed experience access with an explicit boundary", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "开发者控制舱" })).toBeVisible();
  await expect(page.getByText(/体验码可写入/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "体验码管理" })).toBeVisible();
  await expect(page.getByRole("button", { name: "生成新体验码" })).toBeEnabled();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
