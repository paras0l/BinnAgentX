import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              learner_id: "learner_synthetic_local",
              nickname: "本地学习者",
              email: "local@binnagent.invalid",
              invite_code: "BINN-LOCAL",
              account_type: "registered",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
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
    fireEvent.click(screen.getByRole("radio", { name: /布偶猫陪伴/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存偏好" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "ragdoll");

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
        return Response.json({ detail: "not_found" }, { status: 404 });
      }),
    );

    render(<LearnerHomePage />);

    expect(await screen.findByRole("button", { name: "继续上次任务" })).toBeEnabled();
    expect(screen.getByText(/任务位置与未提交草稿都已保留/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "继续上次任务" }));
    expect(screen.getByRole("heading", { name: "Cached Passage" })).toBeVisible();
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

    fireEvent.click(screen.getByRole("button", { name: "收起左侧导航" }));
    expect(frame).toHaveClass("nav-collapsed");
    expect(screen.getByRole("button", { name: "展开左侧导航" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "新增资产" }));
    fireEvent.change(screen.getByLabelText("标题"), {
      target: { value: "转折后找作者判断" },
    });
    fireEvent.change(screen.getByLabelText("内容"), {
      target: { value: "优先检查 but 与 however 后的判断。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存到资产库" }));
    expect(screen.getByRole("heading", { name: "转折后找作者判断" })).toBeVisible();
    expect(screen.getByText("掌握度 10%")).toBeVisible();
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
