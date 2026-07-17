import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { expectNoBrowserFailures, observeBrowserFailures } from "../browser-diagnostics";

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
      {
        paragraph_id: "calibration_a_p3",
        text: "The result came from sharing the existing space more carefully, not from adding capacity.",
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
  observeBrowserFailures(page);
  await page.setViewportSize({ width: 1440, height: 900 });
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
  await page.route("**/api/learner/v1/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        learner_id: "learner_synthetic_local",
        nickname: "本地学习者",
        email: "local@binnagent.invalid",
        invite_code: "BINN-LOCAL",
      }),
    });
  });
  await page.addInitScript(() => {
    if (sessionStorage.getItem("binnagent:e2e-initialized")) return;
    localStorage.clear();
    sessionStorage.setItem("binnagent:e2e-initialized", "true");
  });
});

test.afterEach(async ({ page }) => {
  expectNoBrowserFailures(page);
});

test("expired local resume pointer returns to onboarding without a red browser error", async ({
  page,
}) => {
  await page.route(
    "**/api/learner/v1/runs/workflow_run_expired/resume-workspace",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ available: false, workspace: null }),
      });
    },
  );

  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "binnagent:learner-resume:v1:learner_synthetic_local",
      JSON.stringify({ schemaVersion: 1, workflowRunId: "workflow_run_expired" }),
    );
  });
  await page.reload();

  await expect(page.getByRole("button", { name: "开始独立校准" })).toBeEnabled();
  await expect(page.locator(".global-error")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("binnagent:learner-resume:v1:learner_synthetic_local"),
      ),
    )
    .toBeNull();
});

test("learner entry is desktop-focused and accessible", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "语境实验室 × 表达实验室" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始独立校准" })).toBeEnabled();
  await expect(page.getByText(/伪精确能力分/)).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("known learner can inspect profile evidence and control assistance preferences", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "binnagent:learner-experience:v1:learner_synthetic_local",
      JSON.stringify({
        schemaVersion: 1,
        profile: {
          exam_track: "english_1",
          target_score: 70,
          weekly_minutes: 420,
          self_reported_level: "developing",
          prior_exam_seen: false,
          session_minutes: 45,
          feedback_density: "minimal",
          timed: false,
          evidence_count: 0,
          confidence_band: "low",
        },
        sessions: [],
      }),
    );
  });
  await page.reload();

  await page.getByRole("button", { name: "查看学习画像" }).click();
  await expect(page.getByRole("heading", { name: "你的读写学习画像" })).toBeVisible();
  await expect(page.getByText("证据不足", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "偏好设置" }).click();
  await expect(page.getByRole("heading", { name: "让辅助按你的节奏出现" })).toBeVisible();
  await page.getByLabel(/行内辅助出现方式/).selectOption("proactive");
  await page.getByLabel(/页面留白/).selectOption("spacious");
  await page.getByRole("button", { name: "保存偏好" }).click();
  await expect(page.getByLabel(/行内辅助出现方式/)).toHaveValue("proactive");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("a completed stage stops at a calm checkpoint before advancing", async ({ page }) => {
  const completedWorkspace = {
    ...workspace,
    task: {
      ...workspace.task,
      state: "completed",
      version: 3,
      attempts: [
        {
          attempt_version_id: "attempt_version_rest_checkpoint",
          version: 1,
          text: "选择 B。\nThe change helped more students use the existing rooms.",
          content_hash: "d".repeat(64),
          independence: "independent",
          created_at: "2026-07-16T12:01:00Z",
        },
      ],
      completion_gaps: [],
    },
  };
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
      body: JSON.stringify(completedWorkspace),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "开始独立校准" }).click();

  await expect(
    page.getByRole("heading", { name: "第一段已经保存，先把注意力放下来" }),
  ).toBeVisible();
  await expect(page.getByText("这里没有倒计时")).toBeVisible();
  await expect(page.getByRole("button", { name: "准备好后继续" })).toBeVisible();

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
  await page.route(
    "**/api/learner/v1/runs/workflow_run_browser_0001/resume-workspace",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          available: true,
          workspace: { ...workspace, task: persistedTask },
        }),
      });
    },
  );
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
  await page.route(
    "**/api/learner/v1/tasks/task_browser_0001/annotations/analyze",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          analysis_id: "annotation_analysis_browser_0001",
          focus: "syntax",
          diagnosis: "这个卡点更像是主干和修饰层级混在了一起。",
          breakdown: ["先找谓语和主语。", "暂时拿掉修饰语。", "再逐层放回原句。"],
          next_check: "去掉修饰后，你能否说出谁做了什么？",
          source: "model",
          reason_code: "annotation_analysis_model_validated",
          boundary_note: "只分析这处卡点，不直接给题目答案。",
        }),
      });
    },
  );
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

  await expect(page.getByRole("button", { name: "休息一下" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A Quiet Hour at the Library" })).toBeVisible();
  await expect(page.getByText(/阅读呼吸点/)).toBeVisible();
  await expect(page.getByLabel(/^我的解释/)).toBeVisible();
  await expect(page.getByText("看不懂时，选中原文并标出卡点")).toBeVisible();
  await expect(page.getByRole("button", { name: /不知道怎么想/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /临时任务.*0.*0/ })).toBeVisible();
  await expect(page.getByText(/正确答案|完整解析/)).toHaveCount(0);

  await page.getByRole("button", { name: "加入临时任务" }).click();
  await expect(page.getByRole("heading", { name: "把突然出现的练习先接住" })).toBeVisible();
  await expect(page.getByRole("list", { name: "临时任务列表" }).getByRole("listitem")).toHaveCount(
    1,
  );
  await page.getByLabel("临时任务 1 的回答").fill("规则变化让更多学生使用现有空间。");
  await page.getByRole("button", { name: "完成并查看自检" }).click();
  await expect(page.getByText("迁移尝试已记录")).toBeVisible();
  await page.getByRole("button", { name: "+ 新增一个临时任务" }).click();
  await expect(page.getByRole("list", { name: "临时任务列表" }).getByRole("listitem")).toHaveCount(
    2,
  );
  await expect(page.getByRole("tab", { name: /临时任务.*已完成 1 个，共 2 个/ })).toBeVisible();
  await page.getByLabel("临时任务 2 的回答").fill("只有开放时段覆盖晚间，自习空间才真正可用。");
  await page.getByRole("button", { name: "完成并查看自检" }).click();
  await expect(page.getByRole("tab", { name: /临时任务.*已完成 2 个，共 2 个/ })).toBeVisible();
  await page.getByRole("button", { name: "返回主任务" }).click();

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
  await page.getByRole("button", { name: "拆结构" }).click();
  await expect(page.getByText(/先找谓语|为边界拆成两层/)).toBeVisible();
  await page.getByRole("button", { name: "这句看不懂" }).click();
  await expect(page.getByRole("group", { name: "看不懂的原因" })).toBeVisible();
  await expect(page.getByRole("button", { name: "长句", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "AI 分析这处卡点" })).toBeDisabled();
  await page.getByRole("button", { name: "长句", exact: true }).click();
  await page.getByRole("button", { name: "AI 分析这处卡点" }).click();
  await expect(page.getByText("这个卡点更像是主干和修饰层级混在了一起。")).toBeVisible();
  await expect(page.getByText("下一步自查", { exact: true })).toBeVisible();
  await expect(page.getByText("AI 模型分析")).toBeVisible();
  await page.getByRole("button", { name: "保存标注与分析" }).click();

  await expect(page.getByText("1 条 · 原文中的痕迹也已保留")).toBeVisible();
  await expect(page.getByText("我还没理清这个长句的主干和修饰关系。")).toBeVisible();
  await expect(page.getByRole("button", { name: /看不懂.*标记/ })).toBeVisible();

  await page.getByRole("radio", { name: /B It helped/ }).check();
  await page.getByLabel(/^我的解释/).fill("The change helped more students use the rooms.");
  await page.getByRole("button", { name: "保存 V1（不结束本步）" }).click();
  await expect(page.getByRole("heading", { name: "独立版本已保存" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "V1 已保存，尚未结束本步" })).toBeVisible();
  await page.getByRole("button", { name: "领取反馈后修改" }).click();
  await expect(page.getByText("Look for the result reported after the trial.")).toBeVisible();
  await page.getByText("查看这条反馈为什么出现").click();
  await expect(page.getByText("观察输入")).toBeVisible();
  await expect(page.getByText(/不展示模型隐藏思维链/)).toBeVisible();
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

test("expression workspace keeps V1, gives one priority check, and requires learner V2", async ({
  page,
}) => {
  const expressionRun = {
    ...run,
    workflow_run_id: "workflow_run_expression_browser_0001",
    stage: "micro_expression",
    version: 4,
    current_task_id: "task_expression_browser_0001",
    task_refs: [
      {
        task_id: "task_expression_browser_0001",
        role: "micro_expression",
        task_type: "micro_expression",
        content_version_id: "micro_expression_01_v1",
        completed: false,
        completed_task_version: null,
        highest_hint_level: null,
      },
    ],
    completion_gaps: ["micro_expression_completed"],
  };
  const expressionTask = {
    ...workspace.task,
    task_id: "task_expression_browser_0001",
    workflow_run_id: expressionRun.workflow_run_id,
    task_type: "micro_expression",
    current_content_version_id: "micro_expression_01_v1",
    completion_gaps: ["learner_attempt"],
  };
  const expressionMaterial = {
    content_type: "micro_expression",
    content_version_id: "micro_expression_01_v1",
    title: "Helpful Support Without Skill Replacement",
    situation:
      "A classmate accepts complete translations before trying to understand sentence structure. Give practical advice that preserves useful support.",
    audience: "A classmate preparing for an English exam",
    purpose: "Recommend a better sequence for using assistance",
    target_argument_move: "Acknowledge a benefit, set a limit, and propose an action sequence",
    optional_active_resource: "Assistance should not replace the act being learned.",
    forbidden_mechanical_use: ["Do not copy the resource sentence"],
    output_requirement: {
      sentence_min: 2,
      sentence_max: 4,
      word_min: 35,
      word_max: 90,
      language: "en",
    },
    v1_minimum: [
      "States one legitimate benefit of the tool",
      "Names the reading action to attempt independently",
      "Gives a usable order of actions",
    ],
  };
  const v1Text =
    "Translation tools can help learners check unfamiliar details, but complete translations may replace careful reading practice. Learners should still examine sentence structure and identify the main relation themselves, using support only for details that remain unclear.";
  const v2Text =
    "Translation tools can help learners check unfamiliar details, but complete translations may replace careful reading practice. First, learners should examine sentence structure and identify the main relation themselves. Then they can use support only for details that remain unclear.";
  const v1 = {
    attempt_version_id: "attempt_version_expression_browser_v1",
    version: 1,
    text: v1Text,
    content_hash: "d".repeat(64),
    independence: "independent",
    created_at: "2026-07-16T14:00:00Z",
  };
  const intervention = {
    intervention_id: "intervention_expression_browser_0001",
    input_attempt_version_id: v1.attempt_version_id,
    hint_level: 2,
    intervention_type: "priority_feedback",
    reason_code: "priority_feedback_sequence",
    delivered_content:
      "Make the action order explicit: state what the learner should try before using the tool and when support should enter.",
    content_hash: "e".repeat(64),
    result_status: "delivered",
    created_at: "2026-07-16T14:01:00Z",
  };
  const v2 = {
    attempt_version_id: "attempt_version_expression_browser_v2",
    version: 2,
    text: v2Text,
    content_hash: "f".repeat(64),
    independence: "hinted_low",
    created_at: "2026-07-16T14:02:00Z",
  };
  let currentExpressionTask: Record<string, unknown> = expressionTask;

  await page.route("**/api/learner/v1/runs", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(expressionRun),
    });
  });
  await page.route(
    `**/api/learner/v1/runs/${expressionRun.workflow_run_id}/workspace`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          run: expressionRun,
          task: currentExpressionTask,
          material: expressionMaterial,
        }),
      });
    },
  );
  await page.route(`**/api/learner/v1/tasks/${expressionTask.task_id}/attempts`, async (route) => {
    const body = route.request().postDataJSON() as { expected_version: number };
    currentExpressionTask =
      body.expected_version === 1
        ? { ...expressionTask, version: 2, state: "saved", attempts: [v1] }
        : {
            ...expressionTask,
            version: 4,
            state: "saved",
            highest_hint_level: 2,
            attempts: [v1, v2],
            interventions: [intervention],
          };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentExpressionTask),
    });
  });
  await page.route(
    `**/api/learner/v1/tasks/${expressionTask.task_id}/feedback/priority`,
    async (route) => {
      currentExpressionTask = {
        ...expressionTask,
        version: 3,
        state: "hinted",
        highest_hint_level: 2,
        attempts: [v1],
        interventions: [intervention],
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(currentExpressionTask),
      });
    },
  );
  await page.route(`**/api/learner/v1/tasks/${expressionTask.task_id}/revisions`, async (route) => {
    currentExpressionTask = {
      ...expressionTask,
      version: 5,
      state: "saved",
      highest_hint_level: 2,
      attempts: [v1, v2],
      interventions: [intervention],
      revisions: [
        {
          revision_event_id: "revision_event_expression_browser_0001",
          from_attempt_version_id: v1.attempt_version_id,
          to_attempt_version_id: v2.attempt_version_id,
          intervention_id: intervention.intervention_id,
          result_status: "needs_review",
          created_at: "2026-07-16T14:03:00Z",
        },
      ],
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentExpressionTask),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "开始独立校准" }).click();
  await expect(
    page.getByRole("heading", { name: "Helpful Support Without Skill Replacement" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /标注列表/ })).toHaveCount(0);
  await page.getByLabel(/^我的作品/).fill(v1Text);
  await page.getByRole("button", { name: "保存 V1（不结束本步）" }).click();
  await expect(page.getByRole("button", { name: "查看单项反馈" })).toBeVisible();
  await page.getByRole("button", { name: "查看单项反馈" }).click();
  await expect(page.getByText(/Make the action order explicit/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "只处理一个优先问题，保留自己的表达" }),
  ).toBeVisible();
  await page.getByLabel(/^我的作品 · V2/).fill(v2Text);
  await page.getByRole("button", { name: "保存 V2 并建立引用" }).click();

  await expect(page.getByRole("heading", { name: "V1 与 V2 都已保留" })).toBeVisible();
  await expect(page.getByText("V1 → 反馈 → V2 引用已保存；是否改善仍待验证。")).toBeVisible();
  const versions = page.locator(".attempt-versions article");
  await expect(versions.nth(0)).toContainText(v1Text);
  await expect(versions.nth(1)).toContainText(v2Text);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("completed learner returns home and continues with a new practice material", async ({
  page,
}) => {
  const predecessorRunId = "workflow_run_completed_browser_0001";
  const practiceRun = {
    ...run,
    workflow_run_id: "workflow_run_practice_browser_0001",
    run_kind: "practice",
    predecessor_run_id: predecessorRunId,
    stage: "matched_reading",
    version: 1,
    current_task_id: "task_practice_browser_0001",
    task_refs: [
      {
        task_id: "task_practice_browser_0001",
        role: "matched_reading",
        task_type: "matched_reading",
        content_version_id: "matched_reading_02_v1",
        completed: false,
        completed_task_version: null,
        highest_hint_level: null,
      },
    ],
    match_decisions: [
      {
        decision_id: "match_decision_practice_browser_0001",
        selected_content_version_id: "matched_reading_02_v1",
        policy_version: "continuous_practice_match_v1",
        conservative: true,
        reason_codes: ["recent_material_excluded"],
      },
    ],
    created_at: "2026-07-16T15:00:00Z",
    updated_at: "2026-07-16T15:00:00Z",
  };
  const practiceWorkspace = {
    run: practiceRun,
    task: {
      ...workspace.task,
      task_id: "task_practice_browser_0001",
      workflow_run_id: practiceRun.workflow_run_id,
      task_type: "matched_reading",
      current_content_version_id: "matched_reading_02_v1",
      completion_gaps: ["learner_attempt", "semantic_annotation"],
    },
    material: {
      ...workspace.material,
      content_type: "matched_reading",
      content_version_id: "matched_reading_02_v1",
      title: "A New Material for Transfer",
    },
  };

  await page.route(`**/api/learner/v1/runs/${predecessorRunId}/continue`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(practiceRun),
    });
  });
  await page.route(
    `**/api/learner/v1/runs/${practiceRun.workflow_run_id}/workspace`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(practiceWorkspace),
      });
    },
  );

  await page.goto("/");
  await page.evaluate((completedRunId) => {
    localStorage.setItem(
      "binnagent:learner-experience:v1:learner_synthetic_local",
      JSON.stringify({
        schemaVersion: 1,
        profile: {
          exam_track: "english_1",
          target_score: 70,
          weekly_minutes: 420,
          self_reported_level: "developing",
          prior_exam_seen: false,
          session_minutes: 45,
          feedback_density: "minimal",
          timed: false,
          evidence_count: 0,
          confidence_band: "low",
        },
        sessions: [
          {
            workflowRunId: completedRunId,
            runVersion: 10,
            runKind: "first_experience",
            completedAt: "2026-07-16T14:30:00Z",
            difficultyRating: "matched",
            completedTaskCount: 4,
            supportedTaskCount: 0,
            matchedContentVersionId: "matched_reading_01_v1",
          },
        ],
      }),
    );
  }, predecessorRunId);
  await page.reload();

  await expect(page.getByRole("heading", { name: "换一篇新材料，继续验证读写迁移" })).toBeVisible();
  await page.getByRole("button", { name: "开始下一次训练" }).click();
  await expect(page.getByRole("heading", { name: "A New Material for Transfer" })).toBeVisible();
  await expect(page.getByText("第 1 / 3 步")).toBeVisible();
  await expect(page.getByText("校准 A", { exact: true })).toHaveCount(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
