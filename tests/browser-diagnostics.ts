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
    // Navigating or unmounting a React tree can intentionally cancel in-flight
    // fetches. Chromium reports those cancellations as request failures even
    // though the application handled them correctly.
    if (request.failure()?.errorText === "net::ERR_ABORTED") return;
    observed.push(
      `requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
    );
  });
}

export function expectNoBrowserFailures(page: Page): void {
  expect(failures.get(page) ?? [], "browser Console/page/network failures").toEqual([]);
}
