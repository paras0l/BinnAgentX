import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LearnerHomePage from "./page";
import { completedStageProgress } from "./learning-experience";
import type { LearnerWorkspaceView } from "../lib/contracts";
import { loadDraft, loadResumeRunId, saveResumeRunId } from "../lib/draft-storage";
import { saveExperienceProfile } from "../lib/experience-storage";

const resumableWorkspace = {
  run: {
    workflow_run_id: "workflow_run_resume_0001",
    run_kind: "practice",
    predecessor_run_id: null,
    lifecycle: "active",
    stage: "matched_reading",
    version: 3,
    current_task_id: "task_resume_0001",
    task_refs: [],
    match_decisions: [],
    calibration_fallback_approved: false,
    difficulty_feedback_status: "pending",
    difficulty_rating: null,
    next_task_placeholder_id: null,
    completion_gaps: [],
    created_at: "2026-07-18T08:00:00Z",
    updated_at: "2026-07-18T08:10:00Z",
    replayed: false,
  },
  task: {
    task_id: "task_resume_0001",
    workflow_run_id: "workflow_run_resume_0001",
    task_type: "matched_reading",
    state: "active",
    version: 1,
    highest_hint_level: 0,
    current_content_version_id: "reading_resume_v1",
    annotation_count: 0,
    annotations: [],
    attempts: [],
    interventions: [],
    revisions: [],
    intervention_count: 0,
    revision_count: 0,
    completion_gaps: [],
    replayed: false,
  },
  material: {
    content_type: "matched_reading",
    content_version_id: "reading_resume_v1",
    title: "Cached Passage",
    paragraphs: [{ paragraph_id: "paragraph_1", text: "A cached learning task remains intact." }],
    allowed_annotations: ["vocabulary", "logic"],
    question: {
      question_id: "question_resume_0001",
      prompt: "What is preserved?",
      options: [
        { option_id: "A", text: "The task position" },
        { option_id: "B", text: "Nothing" },
      ],
    },
    grammar_challenge: {
      challenge_id: "grammar_resume_0001",
      status: "pending",
      attempt_count: 0,
      hint_revealed: false,
      error_type: null,
      hint: null,
      answer: null,
    },
  },
} satisfies LearnerWorkspaceView;

describe("learner home", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
    let serverPreferences = {
      assistance_mode: "ask_first",
      feedback_detail: "balanced",
      correction_tone: "gentle",
      show_decision_trace: true,
      temporary_tasks_enabled: true,
      reading_comfort: "comfortable",
      reduced_motion: false,
      skin: "paper",
      navigation_collapsed: false,
      collector_mode: "day",
    };
    let preferencesPersisted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/v1/preferences")) {
          if (init?.method === "PUT") {
            serverPreferences = JSON.parse(String(init.body)) as typeof serverPreferences;
            preferencesPersisted = true;
          }
          return new Response(
            JSON.stringify({
              preferences: serverPreferences,
              version: preferencesPersisted ? 1 : 0,
              persisted: preferencesPersisted,
              updated_at: preferencesPersisted ? "2026-07-23T12:00:00Z" : null,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            learner_id: "learner_synthetic_local",
            nickname: "本地学习者",
            email: "local@binnagent.invalid",
            invite_code: "BINN-LOCAL",
            account_type: "registered",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
  });

  it("keeps the experience focused on reading and learner output", async () => {
    render(<LearnerHomePage />);

    expect(await screen.findByRole("heading", { name: "语境实验室 × 表达实验室" })).toBeVisible();
    expect(screen.getByText(/不会给出伪精确能力分/)).toBeVisible();
    expect(screen.getByRole("button", { name: "开始独立校准" })).toBeEnabled();
    expect(screen.queryByText(/聊天/)).not.toBeInTheDocument();
  });

  it("keeps a deferred learner's saved skin aligned after reload", async () => {
    const firstRender = render(<LearnerHomePage />);
    fireEvent.click(await screen.findByRole("button", { name: "下次再说" }));
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "学习功能导航" })).getByRole("button", {
        name: "偏好设置",
      }),
    );
    expect(document.querySelector('[data-ui-anchor="settings-form"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-ui-anchor="settings-section"]')).toHaveLength(3);
    expect(screen.getByRole("checkbox", { name: /展示判断依据/ }).parentElement).toHaveAttribute(
      "data-ui-anchor",
      "toggle-control",
    );
    fireEvent.click(screen.getByRole("radio", { name: /布偶猫陪伴/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存偏好" }));
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme", "ragdoll"));

    firstRender.unmount();
    render(<LearnerHomePage />);
    expect(await screen.findByRole("button", { name: "下次再说" })).toBeEnabled();
    expect(document.documentElement).toHaveAttribute("data-theme", "ragdoll");

    fireEvent.click(screen.getByRole("button", { name: "下次再说" }));
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "学习功能导航" })).getByRole("button", {
        name: "偏好设置",
      }),
    );
    expect(screen.getByRole("radio", { name: /布偶猫陪伴/ })).toBeChecked();
  });

  it("returns a known learner to a persistent learning home", async () => {
    saveExperienceProfile("learner_synthetic_local", {
      exam_track: "english_2",
      target_score: 75,
      weekly_minutes: 300,
      self_reported_level: "developing",
      prior_exam_seen: true,
      session_minutes: 30,
      feedback_density: "minimal",
      timed: false,
      evidence_count: 0,
      confidence_band: "low",
    });

    render(<LearnerHomePage />);

    expect(await screen.findByRole("heading", { name: "语境实验室 × 表达实验室" })).toBeVisible();
    expect(screen.getByText("英语二")).toBeVisible();
    expect(screen.getByRole("button", { name: "查看学习画像" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: "偏好设置" })[0]).toBeEnabled();
    expect(screen.getByRole("button", { name: "开始独立校准" })).toBeEnabled();
  });

  it("pages account-scoped training history from the server", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });
    const historyItems = Array.from({ length: 6 }, (_, index) => ({
      workflow_run_id: `workflow_run_history_${index + 1}`,
      run_version: 10 + index,
      run_kind: index === 5 ? "first_experience" : "practice",
      completed_at: `2026-07-${String(22 - index).padStart(2, "0")}T08:00:00Z`,
      difficulty_rating: "matched",
      completed_task_count: 2,
      supported_task_count: index === 1 ? 1 : 0,
      matched_content_version_id: `reading_${index + 1}`,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/session")) {
          return Response.json({
            learner_id: "learner_synthetic_local",
            nickname: "本地学习者",
            email: "local@binnagent.invalid",
            invite_code: "BINN-LOCAL",
            account_type: "registered",
          });
        }
        if (url.includes("/training-history")) {
          const page = Number(new URL(url, "http://test").searchParams.get("page") ?? "1");
          return Response.json({
            items: page === 1 ? historyItems.slice(0, 5) : historyItems.slice(5),
            page,
            page_size: 5,
            total_items: 6,
            total_pages: 2,
            summary: {
              completed_sessions: 6,
              independent_sessions: 5,
              completed_tasks: 12,
              supported_tasks: 1,
              completed_last_7_days: 6,
            },
          });
        }
        if (url.endsWith("/assets") || url.endsWith("/training-materials")) {
          return Response.json([]);
        }
        return Response.json({});
      }),
    );

    render(<LearnerHomePage />);

    expect(await screen.findByText("第 1 / 2 页")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    expect(await screen.findByText("第 2 / 2 页")).toBeVisible();
    expect(screen.getByText("已保存到当前账号")).toBeVisible();
  });

  it("keeps a resumable task on the home page and caches an immediate draft when leaving", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });
    saveResumeRunId("learner_synthetic_local", resumableWorkspace.run.workflow_run_id);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/session")) {
          return Response.json({
            learner_id: "learner_synthetic_local",
            nickname: "本地学习者",
            email: "local@binnagent.invalid",
            invite_code: "BINN-LOCAL",
            account_type: "registered",
          });
        }
        if (url.endsWith("/resume-workspace")) {
          return Response.json({ available: true, workspace: resumableWorkspace });
        }
        if (url.endsWith("/material-feedback")) {
          return Response.json({
            sentiment: "good",
            created_at: "2026-07-23T12:00:00Z",
          });
        }
        return Response.json({ detail: "not_found" }, { status: 404 });
      }),
    );

    render(<LearnerHomePage />);

    expect(await screen.findByRole("button", { name: "继续上次任务" })).toBeEnabled();
    expect(screen.getByText(/任务位置与未提交草稿都已保留/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "继续上次任务" }));
    expect(screen.getByRole("heading", { name: "Cached Passage" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "这篇文章有帮助" }));
    expect(await screen.findByText("反馈已记录，谢谢你")).toBeVisible();
    expect(screen.getByRole("button", { name: "这篇文章没帮助" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: /我的解释 · V1/ }), {
      target: { value: "My cached explanation." },
    });

    fireEvent.click(screen.getByRole("button", { name: "学习首页" }));
    expect(screen.getByRole("button", { name: "继续上次任务" })).toBeEnabled();
    expect(loadDraft(resumableWorkspace)?.text).toBe("My cached explanation.");
  });

  it("keeps the cached run pointer when the resume service is temporarily unavailable", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });
    saveResumeRunId("learner_synthetic_local", resumableWorkspace.run.workflow_run_id);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/session")) {
          return Response.json({
            learner_id: "learner_synthetic_local",
            nickname: "本地学习者",
            email: "local@binnagent.invalid",
            invite_code: "BINN-LOCAL",
            account_type: "registered",
          });
        }
        return Response.json({ detail: "temporarily_unavailable" }, { status: 503 });
      }),
    );

    render(<LearnerHomePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("缓存位置仍已保留");
    expect(loadResumeRunId("learner_synthetic_local")).toBe(resumableWorkspace.run.workflow_run_id);
  });

  it("opens the evidence-based profile and preference controls", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });

    render(<LearnerHomePage />);
    fireEvent.click(await screen.findByRole("button", { name: "查看学习画像" }));
    expect(screen.getByRole("heading", { name: "你的读写学习画像" })).toBeVisible();
    expect(screen.getByText(/不预测分数/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "返回" })).not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "学习功能导航" })).getByRole("button", {
        name: "偏好设置",
      }),
    );
    expect(screen.getByRole("heading", { name: "让辅助按你的节奏出现" })).toBeVisible();
    expect(screen.getByLabelText(/行内辅助出现方式/)).toBeVisible();
    expect(screen.getByRole("button", { name: "保存偏好" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "取消" })).not.toBeInTheDocument();

    const legendaryTier = screen.getByRole("button", { name: "查看传说等级说明" });
    expect(legendaryTier).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(legendaryTier);
    expect(screen.getByRole("region", { name: "传说等级效果" })).toHaveTextContent(
      "皮肤专属页面布局和角色安全区",
    );
    const collectorTier = screen.getByRole("button", { name: "查看典藏等级说明" });
    fireEvent.click(collectorTier);
    expect(screen.getByRole("region", { name: "典藏等级效果" })).toHaveTextContent("完整外观");
    expect(screen.getByRole("radio", { name: /纸上专注/ })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: /布偶猫陪伴/ }));
    expect(document.documentElement).toHaveAttribute("data-theme", "ragdoll");
    expect(document.querySelector('[data-ui-anchor="app-shell"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "学习首页" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "paper");

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "学习功能导航" })).getByRole("button", {
        name: "偏好设置",
      }),
    );
    expect(screen.getByRole("radio", { name: /纸上专注/ })).toBeChecked();
    expect(document.documentElement).toHaveAttribute("data-theme", "paper");

    fireEvent.click(screen.getByRole("radio", { name: /布偶猫陪伴/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存偏好" }));
    expect(screen.getByRole("radio", { name: /布偶猫陪伴/ })).toBeChecked();
    expect(document.documentElement).toHaveAttribute("data-theme", "ragdoll");
  });

  it("opens the collector artbook after previewing the summer seal skin", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });

    render(<LearnerHomePage />);
    await screen.findByRole("heading", { name: "语境实验室 × 表达实验室" });
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "学习功能导航" })).getByRole("button", {
        name: "偏好设置",
      }),
    );
    fireEvent.click(screen.getByRole("radio", { name: /海豹夏日乐园/ }));

    expect(document.documentElement).toHaveAttribute("data-theme", "seal-summer");
    expect(document.documentElement).toHaveAttribute("data-theme-tier", "collector");
    fireEvent.click(screen.getByRole("button", { name: "打开海豹夏日乐园皮肤图鉴" }));
    expect(screen.getByRole("dialog", { name: "海豹夏日乐园" })).toBeVisible();
    expect(screen.getByRole("img", { name: "海豹夏日乐园角色概念设定" })).toBeVisible();
    expect(screen.getByRole("img", { name: "海豹夏日乐园组件装饰资源" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "关闭皮肤图鉴" }));
    expect(screen.queryByRole("dialog", { name: "海豹夏日乐园" })).not.toBeInTheDocument();
  });

  it("switches the collector skin between complete day and night presentations", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });

    render(<LearnerHomePage />);
    await screen.findByRole("heading", { name: "语境实验室 × 表达实验室" });
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "学习功能导航" })).getByRole("button", {
        name: "偏好设置",
      }),
    );
    fireEvent.click(screen.getByRole("radio", { name: /海豹夏日乐园/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存偏好" }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("binnagent:theme:v1") ?? "{}")).toMatchObject({
        theme: "seal-summer",
        collectorMode: "day",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "学习首页" }));

    const modeGroup = screen.getByRole("group", { name: "典藏昼夜模式" });
    const dayComponentCount = document.querySelectorAll("button, input, select, textarea").length;
    expect(within(modeGroup).queryByText("典藏昼夜")).not.toBeInTheDocument();
    expect(within(modeGroup).getByRole("button", { name: "白昼" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "查看学习画像" })).toBeVisible();
    expect(
      within(document.querySelector(".home-topbar-actions") as HTMLElement).getByRole("button", {
        name: "偏好设置",
      }),
    ).toBeVisible();

    fireEvent.click(within(modeGroup).getByRole("button", { name: "月夜" }));
    expect(document.documentElement).toHaveAttribute("data-collector-mode", "night");
    expect(within(modeGroup).getByRole("button", { name: "月夜" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(document.querySelectorAll("button, input, select, textarea")).toHaveLength(
      dayComponentCount,
    );

    fireEvent.click(within(modeGroup).getByRole("button", { name: "白昼" }));
    expect(document.documentElement).toHaveAttribute("data-collector-mode", "day");
    expect(document.querySelectorAll("button, input, select, textarea")).toHaveLength(
      dayComponentCount,
    );
  });

  it("keeps authenticated navigation on the left and supports learning assets", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });

    render(<LearnerHomePage />);
    const assetNavigation = await screen.findByRole("button", { name: "学习资产" });
    const frame = assetNavigation.closest(".experience-frame");
    expect(frame).toHaveClass("training-frame");

    fireEvent.click(assetNavigation);
    expect(screen.getByRole("heading", { name: /把读过的痕迹/ })).toBeVisible();
    expect(frame).toHaveClass("training-frame");
    const summary = screen.getByRole("region", { name: "学习资产总览" });
    expect(within(summary).getByRole("group", { name: "资产统计" })).toBeVisible();
    expect(within(summary).getByRole("group", { name: "同步连接" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "收起左侧导航" }));
    expect(frame).toHaveClass("nav-collapsed");
    expect(screen.getByRole("button", { name: "展开左侧导航" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "新增资产" }));
    fireEvent.change(screen.getByLabelText("标题"), {
      target: { value: "转折后找作者判断" },
    });
    expect(screen.queryByLabelText("内容")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建索引" })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "训练任务队列" })).not.toBeInTheDocument();
  });

  it("queues the existing Inbox organizer flow from the asset page", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/session")) {
        return Response.json({
          learner_id: "learner_synthetic_local",
          nickname: "本地学习者",
          email: "local@binnagent.invalid",
          invite_code: "BINN-LOCAL",
          account_type: "registered",
        });
      }
      if (url.endsWith("/v1/assets/obsidian-organizer-runs")) {
        expect(init?.method).toBe("POST");
        return Response.json(
          {
            run_id: "organizer_manual_1",
            status: "queued",
            next_step: "sync_obsidian_plugin",
          },
          { status: 202 },
        );
      }
      if (url.endsWith("/v1/assets")) return Response.json([]);
      if (url.endsWith("/vault-status")) {
        return Response.json({ adapter: "disabled", connected: false, detail: "disabled" });
      }
      if (url.endsWith("/obsidian-plugin-status")) {
        return Response.json({ paired: true, synced_context_count: 2, last_synced_at: null });
      }
      if (url.endsWith("/v1/training-materials")) return Response.json([]);
      return Response.json({ detail: "not_found" }, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LearnerHomePage />);
    fireEvent.click(await screen.findByRole("button", { name: "学习资产" }));
    fireEvent.click(await screen.findByRole("button", { name: "整理 Obsidian 收件箱" }));

    expect(await screen.findByText("整理任务已提交")).toBeVisible();
    expect(screen.getByText(/插件通常会在 60 秒内自动整理/)).toBeVisible();
    expect(screen.getByText("Sync approved learning context")).toBeVisible();
    expect(screen.getByText(/看到“整理 N 条 Inbox 笔记”即表示完成/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learner/v1/assets/obsidian-organizer-runs",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("opens a plugin-synced asset through its Obsidian URI without calling the bridge", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });
    const documentUri = "obsidian://open?vault=bin01&file=BinnAgentX%2FAssets%2Ffirst-day.md";
    const openWindow = vi.fn();
    vi.stubGlobal("open", openWindow);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/session")) {
        return Response.json({
          learner_id: "learner_synthetic_local",
          nickname: "本地学习者",
          email: "local@binnagent.invalid",
          invite_code: "BINN-LOCAL",
          account_type: "registered",
        });
      }
      if (url.endsWith("/v1/assets")) {
        return Response.json([
          {
            asset_id: "asset_first_day",
            kind: "vocabulary",
            title: "第一天词汇",
            tags: ["binnagent", "vocabulary"],
            source_type: "obsidian",
            source_title: "Obsidian",
            source_task_id: null,
            evidence_status: "pending_validation",
            evidence_count: 0,
            last_verified_at: null,
            next_review_at: null,
            starred: false,
            sync_status: "synced",
            sync_error_code: null,
            document_uri: documentUri,
            document_updated_at: "2026-07-21T12:00:00Z",
            created_at: "2026-07-21T12:00:00Z",
            updated_at: "2026-07-21T12:00:00Z",
            version: 1,
          },
        ]);
      }
      if (url.endsWith("/vault-status")) {
        return Response.json({ adapter: "disabled", connected: false, detail: "disabled" });
      }
      if (url.endsWith("/obsidian-plugin-status")) {
        return Response.json({ paired: true, synced_context_count: 1, last_synced_at: null });
      }
      if (url.endsWith("/v1/training-materials")) return Response.json([]);
      return Response.json({ detail: "not_found" }, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LearnerHomePage />);
    fireEvent.click(await screen.findByRole("button", { name: "学习资产" }));
    fireEvent.click(await screen.findByRole("button", { name: "在 Obsidian 中打开" }));

    expect(openWindow).toHaveBeenCalledWith(documentUri, "_blank", "noopener,noreferrer");
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/v1/assets/asset_first_day/open"),
      expect.anything(),
    );
    expect(screen.queryByText(/操作未完成（503）/)).not.toBeInTheDocument();
  });

  it("shows persistent personalized materials in the home training queue", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });
    const material = {
      material_id: "training_material_0001",
      title: "Why Shared Workspaces Keep Growing",
      paragraphs: [
        "Although older offices separated teams, recent evidence supports shared spaces.",
        "Readers should distinguish the concession from the writer's main claim.",
        "The same structure can carry a new judgment in a different context.",
      ],
      focus_points: ["让步信息与主句判断"],
      source_context_count: 2,
      training_eligible: true,
      start_block_reason: null,
      status: "ready",
      started_at: null,
      completed_at: null,
      created_at: "2026-07-21T12:00:00Z",
      updated_at: "2026-07-21T12:00:00Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/session")) {
          return Response.json({
            learner_id: "learner_synthetic_local",
            nickname: "本地学习者",
            email: "local@binnagent.invalid",
            invite_code: "BINN-LOCAL",
            account_type: "registered",
          });
        }
        if (url.endsWith("/v1/assets")) return Response.json([]);
        if (url.endsWith("/vault-status")) {
          return Response.json({ adapter: "disabled", connected: false, detail: "disabled" });
        }
        if (url.endsWith("/obsidian-plugin-status")) {
          return Response.json({
            paired: true,
            synced_context_count: 2,
            last_synced_at: "2026-07-21T12:00:00Z",
          });
        }
        if (url.endsWith("/v1/training-materials") && !init?.method) {
          return Response.json([material]);
        }
        if (url.endsWith("/v1/runs/personalized/training_material_0001")) {
          return Response.json({
            ...resumableWorkspace,
            run: {
              ...resumableWorkspace.run,
              workflow_run_id: "workflow_run_personalized_0001",
              current_task_id: "task_personalized_0001",
            },
            task: {
              ...resumableWorkspace.task,
              task_id: "task_personalized_0001",
              workflow_run_id: "workflow_run_personalized_0001",
              current_content_version_id: material.material_id,
            },
            material: {
              ...resumableWorkspace.material,
              content_version_id: material.material_id,
              title: material.title,
              paragraphs: material.paragraphs.map((text, index) => ({
                paragraph_id: `personalized_p_0${index + 1}`,
                text,
              })),
              question: {
                ...resumableWorkspace.material.question,
                prompt: "Which statement best captures the central purpose of the passage?",
                options: resumableWorkspace.material.question.options.map((option, index) => ({
                  ...option,
                  option_id: `option_${String.fromCharCode(97 + index)}`,
                })),
              },
            },
          });
        }
        return Response.json({ detail: "not_found" }, { status: 404 });
      }),
    );

    render(<LearnerHomePage />);

    expect(await screen.findByRole("heading", { name: "训练任务队列" })).toBeVisible();
    expect(screen.getByText("个性化阅读 · 3 段 · 综合 2 篇笔记 · 7/21")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "选择并开始" }));
    expect(await screen.findByText(/recent evidence supports shared spaces/)).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Which statement best captures the central purpose of the passage?",
      }),
    ).toBeVisible();
    expect(screen.queryByText("option_a")).not.toBeInTheDocument();
    expect(screen.getByText("A", { selector: ".option-list strong" })).toBeVisible();
    expect(screen.getByRole("button", { name: "保存 V1（不结束本步）" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "提前结束本步" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "完成本次阅读" })).not.toBeInTheDocument();
  });

  it("routes an unconfigured Obsidian queue action directly to setup", async () => {
    saveExperienceProfile("learner_synthetic_local", {
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
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/session")) {
          return Response.json({
            learner_id: "learner_synthetic_local",
            nickname: "本地学习者",
            email: "local@binnagent.invalid",
            invite_code: "BINN-LOCAL",
            account_type: "registered",
          });
        }
        if (url.endsWith("/v1/assets")) return Response.json([]);
        if (url.endsWith("/vault-status")) {
          return Response.json({ adapter: "disabled", connected: false, detail: "disabled" });
        }
        if (url.endsWith("/obsidian-plugin-status")) {
          return Response.json({ paired: false, synced_context_count: 0, last_synced_at: null });
        }
        if (url.endsWith("/v1/training-materials")) return Response.json([]);
        return Response.json({ detail: "not_found" }, { status: 404 });
      }),
    );

    render(<LearnerHomePage />);

    const configureButton = await screen.findByRole("button", { name: "去配置 Obsidian" });
    expect(screen.queryByRole("button", { name: /从 Obsidian 笔记生成新材料/ })).toBeNull();
    fireEvent.click(configureButton);
    expect(screen.getByRole("dialog", { name: "连接你的知识库" })).toBeVisible();
    expect(screen.getByRole("heading", { name: /把读过的痕迹/ })).toBeVisible();
  });

  it("starts stage progress at zero before any stage is completed", () => {
    expect(completedStageProgress(0, 3)).toBe(0);
    expect(completedStageProgress(1, 3)).toBe(50);
    expect(completedStageProgress(2, 3)).toBe(100);
  });

  it("defers calibration only for the current mounted login experience", async () => {
    render(<LearnerHomePage />);
    fireEvent.click(await screen.findByRole("button", { name: "下次再说" }));

    expect(screen.getByText(/本次先浏览，尚未形成校准记录/)).toBeVisible();
    expect(screen.getByRole("button", { name: "开始独立校准" })).toBeEnabled();
    expect(
      Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).some(
        (key) => key?.startsWith("binnagent:learner-experience:v1:"),
      ),
    ).toBe(false);

    cleanup();
    render(<LearnerHomePage />);
    expect(await screen.findByRole("button", { name: "下次再说" })).toBeEnabled();
    expect(screen.queryByText(/本次先浏览，尚未形成校准记录/)).not.toBeInTheDocument();
  });

  it("completes email verification and first-account registration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/session")) {
          return new Response(JSON.stringify({ detail: "authentication_required" }), {
            status: 401,
          });
        }
        if (url.endsWith("/email-verifications")) {
          return Response.json({ resend_after_seconds: 60 }, { status: 202 });
        }
        if (url.endsWith("/email-verifications/confirm")) {
          return Response.json({ verification_token: "verified-email-token-0001" });
        }
        if (url.endsWith("/lookup")) {
          return Response.json({ accounts: [] });
        }
        if (url.endsWith("/register")) {
          return Response.json(
            {
              learner_id: "learner_registered_0001",
              nickname: "小林",
              email: "lin@example.com",
              invite_code: "BINN-NEXT",
            },
            { status: 201 },
          );
        }
        return new Response(null, { status: 404 });
      }),
    );

    render(<LearnerHomePage />);
    expect(await screen.findByRole("heading", { name: "登录或创建学习账号" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "lin@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "获取验证码" }));
    fireEvent.change(await screen.findByLabelText("6 位验证码"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "验证并继续" }));
    fireEvent.change(await screen.findByLabelText("昵称"), { target: { value: "小林" } });
    fireEvent.change(screen.getByLabelText("邀请码"), {
      target: { value: "BINN-LOCAL-FIRST" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建并进入" }));

    expect(await screen.findByRole("heading", { name: "语境实验室 × 表达实验室" })).toBeVisible();
    expect(screen.getByText("小林")).toBeVisible();
  });

  it("opens the quiet experience-code entry and enters with code plus username", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/session")) {
          return Response.json({ detail: "authentication_required" }, { status: 401 });
        }
        if (url.endsWith("/experience-login")) {
          return Response.json({
            learner_id: "learner_experience_0001",
            nickname: "小林",
            email: "",
            invite_code: "",
            account_type: "experience",
          });
        }
        return new Response(null, { status: 404 });
      }),
    );

    render(<LearnerHomePage />);
    fireEvent.click(await screen.findByRole("button", { name: "有体验码？直接体验" }));
    expect(screen.getByRole("heading", { name: "体验码直接进入" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("体验码"), {
      target: { value: "TRY-8K4MN-9KX2P" },
    });
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "小林" } });
    fireEvent.click(screen.getByRole("button", { name: "进入体验" }));

    expect(await screen.findByRole("heading", { name: "语境实验室 × 表达实验室" })).toBeVisible();
    expect(screen.getByText("体验账号")).toBeVisible();
  });
});
