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
    annotations: [],
    attempts: [],
    interventions: [],
    revisions: [],
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
  await page.addInitScript(() => {
    if (sessionStorage.getItem("binnagent:e2e-initialized")) return;
    localStorage.clear();
    sessionStorage.setItem("binnagent:e2e-initialized", "true");
  });
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
  let persistedTask: Record<string, unknown> = workspace.task;
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
      body: JSON.stringify({ ...workspace, task: persistedTask }),
    });
  });
  await page.route("**/api/learner/v1/tasks/task_browser_0001/annotations", async (route) => {
    const quote = workspace.material.paragraphs[0].text.slice(2, 24);
    const responseTask = {
      ...workspace.task,
      version: 2,
      annotation_count: 1,
      annotations: [
        {
          annotation_id: "annotation_browser_0001",
          kind: "uncertain",
          span: {
            paragraph_id: "calibration_a_p1",
            start: 2,
            end: 24,
            text_quote: quote,
          },
          user_explanation: "我还没理清这个长句的主干和修饰关系。",
          created_at: "2026-07-16T12:00:00Z",
        },
      ],
    };
    persistedTask = responseTask;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseTask),
    });
  });
  await page.route("**/api/learner/v1/tasks/task_browser_0001/attempts", async (route) => {
    const body = route.request().postDataJSON() as { expected_version: number; text: string };
    const isV2 = body.expected_version === 4;
    const v1 = {
      attempt_version_id: "attempt_version_browser_v1",
      version: 1,
      text: "选择 B。\nThe change helped more students use the rooms.",
      content_hash: "a".repeat(64),
      independence: "independent",
      created_at: "2026-07-16T12:01:00Z",
    };
    const v2 = {
      attempt_version_id: "attempt_version_browser_v2",
      version: 2,
      text: body.text,
      content_hash: "b".repeat(64),
      independence: "hinted_low",
      created_at: "2026-07-16T12:03:00Z",
    };
    const responseTask = {
      ...workspace.task,
      version: isV2 ? 5 : 3,
      state: "saved",
      annotation_count: 1,
      annotations: [],
      attempts: isV2 ? [v1, v2] : [v1],
      interventions: isV2
        ? [
            {
              intervention_id: "intervention_browser_h1",
              input_attempt_version_id: v1.attempt_version_id,
              hint_level: 1,
              intervention_type: "task_restatement",
              reason_code: "learner_requested_h1",
              delivered_content: "Look for the result reported after the trial.",
              content_hash: "c".repeat(64),
              result_status: "delivered",
              created_at: "2026-07-16T12:02:00Z",
            },
          ]
        : [],
      revisions: [],
    };
    persistedTask = responseTask;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseTask),
    });
  });
  await page.route("**/api/learner/v1/tasks/task_browser_0001/hints/h1", async (route) => {
    const v1 = {
      attempt_version_id: "attempt_version_browser_v1",
      version: 1,
      text: "选择 B。\nThe change helped more students use the rooms.",
      content_hash: "a".repeat(64),
      independence: "independent",
      created_at: "2026-07-16T12:01:00Z",
    };
    const responseTask = {
      ...workspace.task,
      version: 4,
      state: "hinted",
      highest_hint_level: 1,
      attempts: [v1],
      interventions: [
        {
          intervention_id: "intervention_browser_h1",
          input_attempt_version_id: v1.attempt_version_id,
          hint_level: 1,
          intervention_type: "task_restatement",
          reason_code: "learner_requested_h1",
          delivered_content: "Look for the result reported after the trial.",
          content_hash: "c".repeat(64),
          result_status: "delivered",
          created_at: "2026-07-16T12:02:00Z",
        },
      ],
      revisions: [],
    };
    persistedTask = responseTask;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseTask),
    });
  });
  await page.route("**/api/learner/v1/tasks/task_browser_0001/revisions", async (route) => {
    const v1 = {
      attempt_version_id: "attempt_version_browser_v1",
      version: 1,
      text: "选择 B。\nThe change helped more students use the rooms.",
      content_hash: "a".repeat(64),
      independence: "independent",
      created_at: "2026-07-16T12:01:00Z",
    };
    const v2 = {
      attempt_version_id: "attempt_version_browser_v2",
      version: 2,
      text: "选择 B。\nThe result was broader access without building new rooms.",
      content_hash: "b".repeat(64),
      independence: "hinted_low",
      created_at: "2026-07-16T12:03:00Z",
    };
    const intervention = {
      intervention_id: "intervention_browser_h1",
      input_attempt_version_id: v1.attempt_version_id,
      hint_level: 1,
      intervention_type: "task_restatement",
      reason_code: "learner_requested_h1",
      delivered_content: "Look for the result reported after the trial.",
      content_hash: "c".repeat(64),
      result_status: "delivered",
      created_at: "2026-07-16T12:02:00Z",
    };
    const responseTask = {
      ...workspace.task,
      version: 6,
      state: "saved",
      highest_hint_level: 1,
      attempts: [v1, v2],
      interventions: [intervention],
      revisions: [
        {
          revision_event_id: "revision_event_browser_0001",
          from_attempt_version_id: v1.attempt_version_id,
          to_attempt_version_id: v2.attempt_version_id,
          intervention_id: intervention.intervention_id,
          result_status: "needs_review",
          created_at: "2026-07-16T12:04:00Z",
        },
      ],
    };
    persistedTask = responseTask;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseTask),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "开始独立校准" }).click();

  await expect(page.getByRole("heading", { name: "先留下你的判断，再请求帮助" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A Quiet Hour at the Library" })).toBeVisible();
  await expect(page.getByLabel(/^我的解释/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "3 项必做动作" })).toBeVisible();
  await expect(page.getByText("看不懂时，选中原文并标出卡点")).toBeVisible();
  await expect(page.getByRole("button", { name: /不知道怎么想/ })).toBeVisible();
  await expect(page.getByText(/正确答案|完整解析/)).toHaveCount(0);

  await page.getByRole("button", { name: /不知道怎么想/ }).click();
  await expect(page.getByText("方法示例，不对应当前题目；不会给出当前答案。")).toBeVisible();

  const paragraph = page.locator('[data-paragraph-id="calibration_a_p1"]');
  await paragraph.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode();
    if (!textNode) throw new Error("Expected paragraph text node");
    const range = document.createRange();
    range.setStart(textNode, 2);
    range.setEnd(textNode, 24);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await paragraph.dispatchEvent("mouseup");

  await expect(page.getByRole("toolbar", { name: "选区语义工具" })).toBeVisible();
  await page.getByRole("button", { name: "这句看不懂" }).click();
  await expect(page.getByRole("group", { name: "看不懂的原因" })).toBeVisible();
  await expect(page.getByRole("button", { name: "长句", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "长句", exact: true }).click();
  await page.getByRole("button", { name: "保存这条判断" }).click();

  await expect(page.getByText("1 条 · 原文中的痕迹也已保留")).toBeVisible();
  await expect(page.getByText("我还没理清这个长句的主干和修饰关系。")).toBeVisible();
  await expect(page.getByRole("button", { name: /看不懂.*标记/ })).toBeVisible();

  await page.getByRole("radio", { name: /B It helped/ }).check();
  await page.getByLabel(/^我的解释/).fill("The change helped more students use the rooms.");
  await page.getByRole("button", { name: "保存 V1（不结束本步）" }).click();
  await expect(page.getByRole("heading", { name: "V1 已保存，尚未结束本步" })).toBeVisible();
  await page.getByRole("button", { name: "领取 H1" }).click();
  await expect(page.getByText("Look for the result reported after the trial.")).toBeVisible();
  await page
    .getByLabel(/^我的解释/)
    .fill("The result was broader access without building new rooms.");
  await page.getByRole("button", { name: "保存 V2 并建立引用" }).click();
  await expect(page.getByRole("heading", { name: "V1 与 V2 都已保留" })).toBeVisible();
  await expect(page.getByText("V1 → H1 → V2 引用已保存；是否改善仍待验证。")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel(/^我的解释 · V2/)).toHaveValue(
    "The result was broader access without building new rooms.",
  );
  await expect(page.getByText("Look for the result reported after the trial.")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
