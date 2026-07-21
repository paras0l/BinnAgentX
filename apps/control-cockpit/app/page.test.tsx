import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ControlHomePage from "./page";

const STATUS = {
  worker: {
    online: true,
    state: "idle",
    current_job_id: null,
    started_at: "2026-07-19T10:00:00Z",
    heartbeat_at: "2026-07-19T12:00:00Z",
  },
  langfuse: { configured: true, reachable: true, url: "http://localhost:3100" },
  model_provider: "longcat",
  model_name: "LongCat-2.0",
  queue_depth: 0,
  running_count: 0,
  failed_count: 0,
  personalized_queue_depth: 0,
  personalized_running_count: 0,
  personalized_failed_count: 1,
  active_pack_job_id: null,
};

const PERSONALIZED_JOB = {
  material_id: "training_material_failed_0001",
  learner_id: "learner_managed_0001",
  title: "正在生成个性化阅读",
  status: "generation_failed",
  requested_goal: "复习让步结构",
  requested_kinds: ["grammar"],
  source_context_count: 2,
  evidence_target_count: 0,
  generation_attempt_count: 3,
  generation_error_code: "ValueError:personalized_evidence_targets_missing",
  next_generation_attempt_at: null,
  claimed_by: null,
  lease_expires_at: null,
  created_at: "2026-07-21T12:00:00Z",
  updated_at: "2026-07-21T12:03:00Z",
} as const;

const TOOL = {
  project_key: "binnagentx",
  name: "obsidian.read_learning_context.v1",
  display_name: "检索学习者记忆（Obsidian）",
  version: "1.0.0",
  description: "读取当前学习者已授权同步的有限摘录。",
  kind: "query",
  risk_level: "moderate",
  source: "agent_memory",
  enabled: true,
  allowed_actor_types: ["orchestrator"],
  required_permission_scopes: ["obsidian:read"],
  requires_human_approval: false,
  requires_idempotency_key: false,
  input_schema: { type: "object" },
  output_schema: { type: "object" },
  policy_version: 1,
  updated_at: null,
};

const PROMPT = {
  project_key: "binnagentx",
  prompt_id: "personalized_reading.generate",
  prompt_version: "v1",
  owner: "learning_content",
  purpose: "根据已授权 Obsidian 学习上下文生成个性化英语阅读。",
  template_text: "围绕 {{contexts}} 生成新阅读，只输出 {{output_schema}}。",
  variables: ["contexts", "output_schema"],
  model_policy: { temperature: 0.45, max_tokens: 1800 },
  status: "active",
  content_hash: "a".repeat(64),
  version: 1,
  created_by_role: "developer_reviewer",
  activated_at: "2026-07-21T12:00:00Z",
  created_at: "2026-07-21T12:00:00Z",
  updated_at: "2026-07-21T12:00:00Z",
};

describe("control cockpit home", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("content-generation/status")) return Response.json(STATUS);
        if (url.endsWith("content-generation/personalized-jobs"))
          return Response.json([PERSONALIZED_JOB]);
        if (url.endsWith(`content-generation/personalized-jobs/${PERSONALIZED_JOB.material_id}`)) {
          return Response.json({
            job: PERSONALIZED_JOB,
            events: [
              {
                event_id: 1,
                event_type: "generation_failed",
                stage: "generation_failed",
                attempt: 3,
                message: "个性化材料生成失败, 已达到最大尝试次数",
                detail: { error_code: PERSONALIZED_JOB.generation_error_code },
                occurred_at: PERSONALIZED_JOB.updated_at,
              },
            ],
          });
        }
        if (url.endsWith("content-generation/jobs")) return Response.json([]);
        if (url.endsWith("/tools")) return Response.json([TOOL]);
        if (url.includes("/tools/") && init?.method === "PATCH") {
          return Response.json({ ...TOOL, enabled: false, policy_version: 2 });
        }
        if (url.endsWith("/prompts")) return Response.json([PROMPT]);
        if (url.endsWith("/users")) {
          return Response.json([
            {
              learner_id: "learner_managed_0001",
              nickname: "Aya",
              email: "aya@example.com",
              account_type: "registered",
              created_at: "2026-07-20T09:00:00Z",
              updated_at: "2026-07-21T09:00:00Z",
              last_login_at: "2026-07-21T09:00:00Z",
              active_session_count: 1,
              completed_run_count: 2,
              asset_count: 5,
              obsidian_paired: true,
            },
          ]);
        }
        if (url.endsWith("experience-codes") && init?.method === "POST") {
          return Response.json(
            {
              code_id: "experience_code_0001",
              code_hint: "TRY-…-9KX2P",
              label: "内测班",
              status: "active",
              max_uses: 12,
              used_count: 0,
              available_uses: 12,
              created_at: "2026-07-16T12:00:00Z",
              expires_at: "2026-07-23T12:00:00Z",
              last_used_at: null,
              revoked_at: null,
              experience_code: "TRY-8K4MN-9KX2P",
            },
            { status: 201 },
          );
        }
        return Response.json([]);
      }),
    );
  });

  it("shows real worker, model, Langfuse and content pipeline status", async () => {
    render(<ControlHomePage />);

    expect(screen.getByRole("heading", { name: "材料生产控制台" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "材料生成与发布" })).toBeVisible();
    expect(screen.getByRole("link", { name: /打开 Langfuse/ })).toHaveAttribute(
      "href",
      "http://localhost:3100",
    );
    await waitFor(() => expect(screen.getByText("在线待命")).toBeVisible());
    expect(screen.getByText("longcat / LongCat-2.0")).toBeVisible();
    expect(screen.getByText("已连接")).toBeVisible();
    expect(screen.getByText("在线待命")).toBeVisible();
    expect(screen.getByRole("heading", { name: "个性化阅读生成" })).toBeVisible();
    expect((await screen.findAllByText("复习让步结构")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/旧版要求迁移重点逐字包含笔记标题/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "个性化生成时间线" })).toBeVisible();
  });

  it("creates an experience code and exposes plaintext only in the one-time result", async () => {
    render(<ControlHomePage />);
    fireEvent.click(screen.getByRole("button", { name: "体验访问" }));
    fireEvent.change(screen.getByLabelText("用途备注"), { target: { value: "内测班" } });
    fireEvent.change(screen.getByLabelText("体验人数"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "生成新体验码" }));

    expect(await screen.findByText("TRY-8K4MN-9KX2P")).toBeVisible();
    expect(screen.getByText("内测班")).toBeVisible();
    expect(screen.getByText("0 / 12 人")).toBeVisible();
  });

  it("lists learners and their operational state in user management", async () => {
    render(<ControlHomePage />);
    fireEvent.click(screen.getByRole("button", { name: "用户管理" }));

    expect(await screen.findByRole("heading", { name: "用户管理" })).toBeVisible();
    expect(screen.getByText("aya@example.com")).toBeVisible();
    expect(screen.getByText("2 次完整训练")).toBeVisible();
    expect(screen.getByText("5 条资产")).toBeVisible();
    expect(screen.getAllByText("Obsidian 已配对")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "退出所有设备" })).toBeEnabled();
  });

  it("manages the isolated Obsidian tool catalog", async () => {
    render(<ControlHomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Tools" }));

    expect(await screen.findByRole("heading", { name: "Tools 管理" })).toBeVisible();
    expect(screen.getByText("检索学习者记忆（Obsidian）")).toBeVisible();
    expect(screen.getByText("obsidian:read")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "停用" }));
    expect(await screen.findByRole("button", { name: "启用" })).toBeVisible();
  });

  it("shows versioned BinnAgentX prompts without crossing project boundaries", async () => {
    render(<ControlHomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Prompts" }));

    expect(await screen.findByRole("heading", { name: "Prompt 管理" })).toBeVisible();
    expect(screen.getByText("project: binnagentx")).toBeVisible();
    expect(screen.getAllByText("personalized_reading.generate").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByDisplayValue(/围绕 \{\{contexts\}\}/)).toBeDisabled());
  });
});
