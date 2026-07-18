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
    allowed_annotations: [
      "vocabulary",
      "grammar",
      "claim",
      "evidence",
      "logic",
      "uncertain",
      "reusable_expression",
    ],
    question: {
      question_id: "calibration_a_q1",
      prompt: "What was the main effect of the library's new booking rule?",
      options: [
        { option_id: "A", text: "It created several new rooms." },
        { option_id: "B", text: "It helped more students use existing rooms." },
        { option_id: "C", text: "It removed all booking limits." },
      ],
    },
    grammar_challenge: {
      challenge_id: "calibration_a_grammar_02",
      status: "resolved",
      attempt_count: 1,
      hint_revealed: false,
      error_type: null,
      hint: null,
      answer: "found",
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

test("collector skin forms a readable h1 hero and paints bubbles while scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    const preferences = {
      assistanceMode: "ask_first",
      feedbackDetail: "balanced",
      correctionTone: "gentle",
      showDecisionTrace: true,
      temporaryTasksEnabled: true,
      readingComfort: "comfortable",
      reducedMotion: false,
      skin: "seal-summer",
    };
    queueMicrotask(() => {
      localStorage.setItem(
        "binnagent:learner-preferences:v1:learner_synthetic_local",
        JSON.stringify(preferences),
      );
      localStorage.setItem(
        "binnagent:theme:v1",
        JSON.stringify({ theme: "seal-summer", density: "comfortable", motion: "full" }),
      );
    });
  });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme-tier", "collector");
  const heading = page.getByRole("heading", { name: "语境实验室 × 表达实验室" });
  await expect(heading).toHaveClass(/collector-particle-heading/);
  await expect(heading).toHaveClass(/collector-particle-heading-cjk/);
  const headingCanvas = heading.locator(".collector-particle-heading-canvas");
  await expect(headingCanvas).toBeVisible();
  await expect
    .poll(async () => (await heading.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(48);
  await expect.poll(async () => (await heading.boundingBox())?.height ?? 0).toBeLessThan(70);
  await expect
    .poll(() =>
      headingCanvas.evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const pixels = canvas
          .getContext("2d")
          ?.getImageData(0, 0, canvas.width, canvas.height).data;
        if (!pixels) return 0;
        let painted = 0;
        for (let index = 3; index < pixels.length; index += 4) {
          if ((pixels[index] ?? 0) > 0) painted += 1;
        }
        return painted;
      }),
    )
    .toBeGreaterThan(20);

  await page.mouse.move(590, 390);
  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(35);
  const trailCanvas = page.locator(".collector-pointer-trail-canvas");
  await expect(trailCanvas).toBeVisible();
  const trailPixels = await trailCanvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    const scale = canvas.width / window.innerWidth;
    const pixels = context?.getImageData(500 * scale, 300 * scale, 180 * scale, 180 * scale).data;
    if (!pixels) return 0;
    let painted = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if ((pixels[index] ?? 0) > 0) painted += 1;
    }
    return painted;
  });
  expect(trailPixels).toBeGreaterThan(10);
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

test("grammar challenge can reveal a hint or give up and display the answer", async ({ page }) => {
  const incorrectParagraphs = workspace.material.paragraphs.map((paragraph) =>
    paragraph.paragraph_id === "calibration_a_p2"
      ? { ...paragraph, text: paragraph.text.replace("found", "finds") }
      : paragraph,
  );
  const pendingWorkspace = {
    ...workspace,
    material: {
      ...workspace.material,
      paragraphs: incorrectParagraphs,
      grammar_challenge: {
        challenge_id: "calibration_a_grammar_02",
        status: "pending",
        attempt_count: 0,
        hint_revealed: false,
        error_type: null,
        hint: null,
        answer: null,
      },
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
      body: JSON.stringify(pendingWorkspace),
    });
  });
  await page.route(
    "**/api/learner/v1/tasks/task_browser_0001/grammar-challenge/hint",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paragraphs: incorrectParagraphs,
          grammar_challenge: {
            ...pendingWorkspace.material.grammar_challenge,
            hint_revealed: true,
            error_type: "时态与谓语形式",
            hint: "留意上下文的叙事时态。",
            answer: null,
          },
          verification_correct: null,
          feedback: null,
        }),
      });
    },
  );
  await page.route(
    "**/api/learner/v1/tasks/task_browser_0001/grammar-challenge/verify",
    async (route) => {
      const body = route.request().postDataJSON() as { correction: string };
      const correct = body.correction === "found";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paragraphs: correct ? workspace.material.paragraphs : incorrectParagraphs,
          grammar_challenge: {
            challenge_id: "calibration_a_grammar_02",
            status: correct ? "resolved" : "pending",
            attempt_count: 1,
            hint_revealed: true,
            error_type: "时态与谓语形式",
            hint: "留意上下文的叙事时态。",
            answer: correct ? "found" : null,
          },
          verification_correct: correct,
          feedback: correct
            ? "修改正确，文章已恢复为正确原文。"
            : "还不正确，文章暂未修改。请结合句子结构再检查一次。",
        }),
      });
    },
  );
  await page.route(
    "**/api/learner/v1/tasks/task_browser_0001/grammar-challenge/answer",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paragraphs: workspace.material.paragraphs,
          grammar_challenge: {
            challenge_id: "calibration_a_grammar_02",
            status: "resolved",
            attempt_count: 1,
            hint_revealed: true,
            error_type: "时态与谓语形式",
            hint: "留意上下文的叙事时态。",
            answer: "found",
          },
          verification_correct: null,
          feedback: "已放弃本次作答，正确写法和恢复后的原文已显示。",
        }),
      });
    },
  );

  await page.goto("/");
  await page.getByRole("button", { name: "开始独立校准" }).click();

  await expect(page.getByRole("heading", { name: "文章中藏着 1 处语法错误" })).toBeVisible();
  await expect(page.getByText(/more students finds a place/)).toBeVisible();
  await page.getByRole("button", { name: "查看提示（错误类型）" }).click();
  await expect(page.getByText(/错误类型：.*时态与谓语形式/)).toBeVisible();
  await page.getByLabel("正确写法").fill("find");
  await page.getByRole("button", { name: "验证修改" }).click();
  await expect(page.getByText(/还不正确，文章暂未修改/)).toBeVisible();
  await expect(page.getByText(/more students finds a place/)).toBeVisible();
  await page.getByRole("button", { name: "放弃并显示答案" }).click();

  await expect(page.getByRole("heading", { name: "语法找茬已完成，原文已恢复" })).toBeVisible();
  await expect(page.getByText("found", { exact: true })).toBeVisible();
  await expect(page.getByText(/more students found a place/)).toBeVisible();
  await expect(page.getByText(/more students finds a place/)).toHaveCount(0);
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
    const quote = workspace.material.paragraphs[0].text;
    const responseTask = {
      ...workspace.task,
      version: 2,
      annotation_count: 1,
      annotations: [
        {
          annotation_id: "annotation_browser_0001",
          kind: "grammar",
          span: {
            paragraph_id: "calibration_a_p1",
            start: 0,
            end: quote.length,
            text_quote: quote,
          },
          user_explanation: "请优先给出当前选区的完整中文翻译，并展示句子主干、从句和修饰关系。",
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
          selection_scope: "sentence_or_paragraph",
          translation: "一家社区图书馆改变了最繁忙时段自习室的共享方式。",
          vocabulary_note: null,
          grammar_structure: [
            "主干：A neighborhood library changed how...",
            "宾语从句：how its study rooms were shared",
            "时间状语：during the busiest hour",
          ],
          diagnosis: "这个卡点更像是主干和修饰层级混在了一起。",
          breakdown: ["先找谓语和主语。", "暂时拿掉修饰语。", "再逐层放回原句。"],
          next_check: "去掉修饰后，你能否说出谁做了什么？",
          source: "model",
          reason_code: "annotation_analysis_model_validated",
          boundary_note: "只解释当前选区，不回答题目；整句翻译不会扩展为全文代读。",
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
  await expect(
    page.getByRole("heading", { name: "A Quiet Hour at the Library", level: 2 }),
  ).toBeVisible();
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
    range.setStart(textNode, 0);
    range.setEnd(textNode, textNode.textContent?.length ?? 0);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await paragraph.dispatchEvent("mouseup");

  await expect(page.getByRole("toolbar", { name: "选区语义工具" })).toBeVisible();
  await page.getByRole("button", { name: "翻译 + 拆结构" }).click();
  await expect(page.getByText(/先找谓语|为边界拆成两层/)).toBeVisible();
  await page.getByRole("button", { name: "语法重点", exact: true }).first().click();
  await page.getByRole("button", { name: "整句翻译 + 语法结构" }).click();
  await expect(page.getByText("一家社区图书馆改变了最繁忙时段自习室的共享方式。")).toBeVisible();
  await expect(page.getByText("宾语从句：how its study rooms were shared")).toBeVisible();
  await expect(page.getByText("这个卡点更像是主干和修饰层级混在了一起。")).toBeVisible();
  await expect(page.getByText("下一步自查", { exact: true })).toBeVisible();
  await expect(page.getByText("AI 模型分析")).toBeVisible();
  await page.getByRole("button", { name: "保存标注与分析" }).click();

  await expect(page.getByText("1 条 · 原文中的痕迹也已保留")).toBeVisible();
  await expect(page.getByText(/请优先给出当前选区的完整中文翻译/)).toBeVisible();
  await expect(page.getByRole("button", { name: /语法重点.*标记/ })).toBeVisible();
  await page.getByRole("button", { name: "返回本步任务" }).click();

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
    page.getByRole("heading", { name: "Helpful Support Without Skill Replacement", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Helpful Support Without Skill Replacement" }),
  ).toHaveCount(1);
  await expect(page.getByRole("tab", { name: /标注列表/ })).toHaveCount(0);

  const leftTabs = page.locator('[data-movable-tab-strip="left"]');
  const rightTabs = page.locator('[data-movable-tab-strip="right"]');
  const boardTab = leftTabs.getByRole("tab", { name: /白板/ });
  const boardBox = await boardTab.boundingBox();
  const leftTabsBox = await leftTabs.boundingBox();
  const rightTabsBox = await rightTabs.boundingBox();
  expect(boardBox).not.toBeNull();
  expect(leftTabsBox).not.toBeNull();
  expect(rightTabsBox).not.toBeNull();
  expect(Math.abs(leftTabsBox!.y - rightTabsBox!.y)).toBeLessThan(1);
  expect(Math.abs(leftTabsBox!.height - rightTabsBox!.height)).toBeLessThan(1);
  await page.mouse.move(boardBox!.x + boardBox!.width / 2, boardBox!.y + boardBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await expect(boardTab).toHaveClass(/dragging/);
  await expect(boardTab).toHaveCSS("cursor", "grabbing");
  await page.mouse.move(
    rightTabsBox!.x + rightTabsBox!.width - 18,
    rightTabsBox!.y + rightTabsBox!.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(leftTabs.getByRole("tab", { name: /白板/ })).toHaveCount(0);
  await expect(rightTabs.getByRole("tab", { name: /白板/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".expression-lab-board")).toHaveCSS("overflow", "hidden");
  await expect(page.locator(".expression-board")).toHaveCSS("overflow", "auto");
  await page.getByRole("button", { name: "论点", exact: true }).click();
  const note = page.locator(".expression-note-claim");
  const noteHandle = page.getByRole("button", { name: "拖动论点便签" });
  const noteHandleBox = await noteHandle.boundingBox();
  expect(noteHandleBox).not.toBeNull();
  const noteTransformBefore = await note.getAttribute("style");
  await page.mouse.move(
    noteHandleBox!.x + noteHandleBox!.width / 2,
    noteHandleBox!.y + noteHandleBox!.height / 2,
  );
  await page.mouse.down();
  await expect(note).toHaveClass(/dragging/);
  await expect(noteHandle).toHaveCSS("cursor", "grabbing");
  await page.mouse.move(noteHandleBox!.x + 70, noteHandleBox!.y + 45, { steps: 5 });
  await page.mouse.up();
  await expect(note).not.toHaveClass(/dragging/);
  await expect(note).not.toHaveAttribute("style", noteTransformBefore ?? "");

  const readExpressionTheme = () =>
    page.evaluate(() => {
      const styleOf = (selector: string) => getComputedStyle(document.querySelector(selector)!);
      const lab = styleOf(".expression-lab-board");
      const board = styleOf(".expression-board");
      const noteStyle = styleOf(".expression-note-claim");
      const title = styleOf(".expression-workspace-shared-heading h2");
      const tab = styleOf('[data-movable-tab="board"]');
      const pane = styleOf('[data-ui-anchor="workspace-pane"]');
      return {
        labBackground: lab.backgroundColor,
        boardBackground: board.backgroundColor,
        noteBackground: noteStyle.backgroundColor,
        titleFont: title.fontFamily,
        tabRadius: tab.borderRadius,
        paneBackground: pane.backgroundColor,
      };
    });
  const paperTheme = await readExpressionTheme();
  await page.locator("html").evaluate((element) => {
    element.setAttribute("data-theme", "ragdoll");
  });
  const ragdollTheme = await readExpressionTheme();
  expect(ragdollTheme.labBackground).not.toBe(paperTheme.labBackground);
  expect(ragdollTheme.boardBackground).not.toBe(paperTheme.boardBackground);
  expect(ragdollTheme.noteBackground).not.toBe(paperTheme.noteBackground);
  expect(ragdollTheme.titleFont).not.toBe(paperTheme.titleFont);
  expect(ragdollTheme.tabRadius).not.toBe(paperTheme.tabRadius);
  expect(ragdollTheme.paneBackground).not.toBe(paperTheme.paneBackground);
  await page.locator("html").evaluate((element) => {
    element.setAttribute("data-theme", "paper");
  });

  await rightTabs.getByRole("tab", { name: /随时记/ }).click();
  const readNotesTheme = () =>
    page.evaluate(() => {
      const textarea = getComputedStyle(document.querySelector(".anytime-notes textarea")!);
      const starter = getComputedStyle(document.querySelector(".note-starters button")!);
      const heading = getComputedStyle(document.querySelector(".workspace-panel-intro h2")!);
      return {
        background: textarea.backgroundColor,
        borderColor: textarea.borderColor,
        font: textarea.fontFamily,
        starterRadius: starter.borderRadius,
        headingFont: heading.fontFamily,
      };
    });
  const paperNotesTheme = await readNotesTheme();
  await page.locator("html").evaluate((element) => {
    element.setAttribute("data-theme", "ragdoll");
  });
  const ragdollNotesTheme = await readNotesTheme();
  expect(ragdollNotesTheme.background).not.toBe(paperNotesTheme.background);
  expect(ragdollNotesTheme.borderColor).not.toBe(paperNotesTheme.borderColor);
  expect(ragdollNotesTheme.font).not.toBe(paperNotesTheme.font);
  expect(ragdollNotesTheme.starterRadius).not.toBe(paperNotesTheme.starterRadius);
  expect(ragdollNotesTheme.headingFont).not.toBe(paperNotesTheme.headingFont);
  await page.locator("html").evaluate((element) => {
    element.setAttribute("data-theme", "paper");
  });

  await rightTabs.getByRole("tab", { name: /临时任务/ }).click();
  const readTemporaryTaskTheme = () =>
    page.evaluate(() => {
      const panel = getComputedStyle(document.querySelector(".temporary-task-panel")!);
      const empty = getComputedStyle(document.querySelector(".temporary-task-empty")!);
      const heading = getComputedStyle(document.querySelector(".temporary-task-panel h2")!);
      return {
        background: panel.backgroundColor,
        borderColor: panel.borderColor,
        radius: panel.borderRadius,
        emptyBackground: empty.backgroundColor,
        headingFont: heading.fontFamily,
      };
    });
  const paperTemporaryTaskTheme = await readTemporaryTaskTheme();
  await page.locator("html").evaluate((element) => {
    element.setAttribute("data-theme", "ragdoll");
  });
  const ragdollTemporaryTaskTheme = await readTemporaryTaskTheme();
  expect(ragdollTemporaryTaskTheme.background).not.toBe(paperTemporaryTaskTheme.background);
  expect(ragdollTemporaryTaskTheme.borderColor).not.toBe(paperTemporaryTaskTheme.borderColor);
  expect(ragdollTemporaryTaskTheme.radius).not.toBe(paperTemporaryTaskTheme.radius);
  expect(ragdollTemporaryTaskTheme.emptyBackground).not.toBe(
    paperTemporaryTaskTheme.emptyBackground,
  );
  expect(ragdollTemporaryTaskTheme.headingFont).not.toBe(paperTemporaryTaskTheme.headingFont);
  await page.locator("html").evaluate((element) => {
    element.setAttribute("data-theme", "paper");
  });

  await rightTabs.getByRole("tab", { name: /本步任务/ }).click();

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
  await expect(
    page.getByRole("heading", { name: "A New Material for Transfer", level: 2 }),
  ).toBeVisible();
  await expect(page.getByText("第 1 / 3 步")).toBeVisible();
  await expect(page.getByText("校准 A", { exact: true })).toHaveCount(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
