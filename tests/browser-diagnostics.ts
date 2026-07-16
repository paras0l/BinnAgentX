import { expect, type Page } from "@playwright/test";

const failures = new WeakMap<Page, string[]>();

export function observeBrowserFailures(page: Page): void {
  const observed: string[] = [];
  failures.set(page, observed);

  page.on("console", (message) => {
    if (message.type() === "error") observed.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => observed.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    observed.push(
      `requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
    );
  });
}

export function expectNoBrowserFailures(page: Page): void {
  expect(failures.get(page) ?? [], "browser Console/page/network failures").toEqual([]);
}
