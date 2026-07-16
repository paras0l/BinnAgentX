import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("control shell makes the boundary explicit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "开发者控制舱" })).toBeVisible();
  await expect(page.getByText(/只观测合成运行/)).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
