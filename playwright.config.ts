import { defineConfig, devices } from "@playwright/test";

const apiUrl = "http://127.0.0.1:18002";
const learnerUrl = "http://127.0.0.1:13000";
const controlUrl = "http://127.0.0.1:13001";

export default defineConfig({
  testDir: "./tests",
  testMatch: "e2e-*/**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "learner-chromium",
      testMatch: "e2e-learner/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: learnerUrl },
    },
    {
      name: "control-chromium",
      testMatch: "e2e-control/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: controlUrl },
    },
  ],
  webServer: [
    {
      command: "uv run uvicorn binnagent_api.main:app --host 127.0.0.1 --port 18002",
      url: `${apiUrl}/health/ready`,
      env: {
        BINNAGENT_LEARNER_IDENTITY_ADAPTER: "synthetic",
        BINNAGENT_MODEL_ADAPTER: "deterministic_fixture",
        BINNAGENT_ENABLE_REMOTE_MODEL_CALLS: "false",
      },
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @binnagent/learner-web exec next dev --webpack --hostname 127.0.0.1 --port 13000",
      url: `${learnerUrl}/health`,
      env: {
        NEXT_PUBLIC_LEARNER_API_BASE_URL: `${apiUrl}/learner`,
      },
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @binnagent/control-cockpit exec next dev --webpack --hostname 127.0.0.1 --port 13001",
      url: `${controlUrl}/health`,
      env: {
        NEXT_PUBLIC_CONTROL_API_BASE_URL: `${apiUrl}/control`,
        BINNAGENT_ENV: "development",
        BINNAGENT_CONTROL_REQUIRED_ROLE: "developer_reviewer",
      },
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
      timeout: 120_000,
    },
  ],
});
