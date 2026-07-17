import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LearnerHomePage from "./page";
import { completedStageProgress } from "./learning-experience";
import { saveExperienceProfile } from "../lib/experience-storage";

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

    fireEvent.click(screen.getByRole("button", { name: "偏好设置" }));
    expect(screen.getByRole("heading", { name: "让辅助按你的节奏出现" })).toBeVisible();
    expect(screen.getByLabelText(/行内辅助出现方式/)).toBeVisible();
    expect(screen.getByRole("button", { name: "保存偏好" })).toBeEnabled();
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
