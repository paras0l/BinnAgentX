import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const run = {
  workflow_run_id: "workflow_run_browser_0001",
  lifecycle: "running",
  stage: "calibration_a",
  version: 1,
  current_task_id: "task_browser_0001",
  task_refs: [
    {
      task_id: "task_browser_0001",
      role: "calibration_a",
      task_type: "calibration_reading",
      content_version_id: "calibration_reading_a_v1",
      completed: false,
      completed_task_version: null,
      highest_hint_level: null,
    },
  ],
  match_decisions: [],
  calibration_fallback_approved: false,
  difficulty_feedback_status: "pending",
  difficulty_rating: null,
  next_task_placeholder_id: null,
  completion_gaps: ["two_calibrations_or_approved_fallback"],
  replayed: false,
};

const workspace = {
  run,
  task: {
    task_id: "task_browser_0001",
    workflow_run_id: "workflow_run_browser_0001",
    task_type: "calibration_reading",
    state: "reading",
    version: 1,
    highest_hint_level: 0,
    current_content_version_id: "calibration_reading_a_v1",
    annotation_count: 0,
    attempts: [],
    intervention_count: 0,
    revision_count: 0,
    completion_gaps: ["learner_attempt"],
    replayed: false,
  },
  material: {
    content_type: "calibration_reading",
    content_version_id: "calibration_reading_a_v1",
    title: "A Quiet Hour at the Library",
    paragraphs: [
      {
        paragraph_id: "calibration_a_p1",
        text: "A neighborhood library changed how its study rooms were shared during the busiest hour.",
      },
      {
        paragraph_id: "calibration_a_p2",
        text: "After the change, more students found a place to work without creating more rooms.",
      },
    ],
    allowed_annotations: ["claim", "evidence", "logic", "uncertain", "reusable_expression"],
    question: {
      question_id: "calibration_a_q1",
      prompt: "What was the main effect of the library's new booking rule?",
      options: [
        { option_id: "A", text: "It created several new rooms." },
        { option_id: "B", text: "It helped more students use existing rooms." },
        { option_id: "C", text: "It removed all booking limits." },
      ],
    },
  },
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.clear());
});

test("learner entry is desktop-focused and accessible", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "语境实验室 × 表达实验室" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始独立校准" })).toBeEnabled();
  await expect(page.getByText(/伪精确能力分/)).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("first experience opens the reading and output workspace", async ({ page }) => {
  await page.route("**/api/learner/v1/runs", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(run),
    });
  });
  await page.route("**/api/learner/v1/runs/workflow_run_browser_0001/workspace", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(workspace),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "开始独立校准" }).click();

  await expect(page.getByRole("heading", { name: "先留下你的判断，再请求帮助" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A Quiet Hour at the Library" })).toBeVisible();
  await expect(page.getByLabel(/^我的解释/)).toBeVisible();
  await expect(page.getByText(/正确答案|完整解析/)).toHaveCount(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
