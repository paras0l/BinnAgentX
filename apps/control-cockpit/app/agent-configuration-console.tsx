"use client";

import { useMemo, useState } from "react";

import type {
  ManagedAgent,
  ManagedPrompt,
  ManagedTool,
  PromptDraftInput,
} from "../lib/control-api";

const RISK_LABELS: Record<ManagedTool["risk_level"], string> = {
  low: "低风险",
  moderate: "受约束",
  high: "高风险",
  control: "控制面",
};

const EXECUTION_LABELS: Record<ManagedAgent["execution_kind"], string> = {
  workflow: "持久化工作流",
  model: "模型 Agent",
  deterministic: "确定性 Agent",
};

export function AgentsConsole({
  agents,
  error,
  onRefresh,
  onNavigateDependency,
}: {
  agents: ManagedAgent[];
  error: string | null;
  onRefresh: () => void;
  onNavigateDependency: (kind: "prompt" | "tool", id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const domains = useMemo(() => [...new Set(agents.map((agent) => agent.domain))], [agents]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return agents.filter(
      (agent) =>
        (domain === "all" || agent.domain === domain) &&
        (!normalized ||
          `${agent.agent_id} ${agent.display_name} ${agent.description} ${agent.workflow}`
            .toLowerCase()
            .includes(normalized)),
    );
  }, [agents, domain, query]);

  return (
    <section className="configuration-console">
      <ConfigurationHeader
        eyebrow="AVAILABLE AGENT CATALOG"
        title="Agents"
        detail="展示当前代码已注册的 Agent，以及活动 Prompt、Tool 策略和恢复能力形成的真实可用状态。"
        onRefresh={onRefresh}
      />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="configuration-summary">
        <span>
          已注册 <strong>{agents.length}</strong>
        </span>
        <span>
          当前可用{" "}
          <strong>{agents.filter((agent) => agent.availability === "available").length}</strong>
        </span>
        <span>
          支持检查点恢复{" "}
          <strong>{agents.filter((agent) => agent.supports_checkpoint_resume).length}</strong>
        </span>
      </div>
      <div className="configuration-filters">
        <input
          aria-label="搜索 Agent"
          placeholder="搜索名称、领域、工作流或描述"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Agent 领域"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
        >
          <option value="all">全部领域</option>
          {domains.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="tool-catalog agent-catalog">
        {filtered.map((agent) => (
          <article
            className={agent.availability === "available" ? "tool-card enabled" : "tool-card"}
            key={agent.agent_id}
          >
            <header>
              <div>
                <span>{agent.domain}</span>
                <h2>{agent.display_name}</h2>
                <code>{agent.agent_id}</code>
              </div>
              <span className={`agent-availability ${agent.availability}`}>
                {agent.availability === "available" ? "可用" : "依赖阻塞"}
              </span>
            </header>
            <p>{agent.description}</p>
            <dl>
              <div>
                <dt>运行方式</dt>
                <dd>{EXECUTION_LABELS[agent.execution_kind]}</dd>
              </div>
              <div>
                <dt>模型</dt>
                <dd>{agent.model_provider}</dd>
              </div>
              <div>
                <dt>工作流</dt>
                <dd>{agent.workflow}</dd>
              </div>
              <div>
                <dt>控制能力</dt>
                <dd>
                  {[
                    agent.supports_checkpoint_resume ? "检查点恢复" : null,
                    agent.requires_human_review ? "人工门禁" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "标准执行"}
                </dd>
              </div>
            </dl>
            <details>
              <summary>查看 Prompt、Tool 与阻塞项</summary>
              <div className="agent-dependencies">
                <span>Prompts</span>
                {agent.prompt_ids.length ? (
                  <div className="agent-dependency-links">
                    {agent.prompt_ids.map((promptId) => (
                      <button
                        type="button"
                        className="agent-dependency-link"
                        key={promptId}
                        onClick={() => onNavigateDependency("prompt", promptId)}
                      >
                        {promptId}
                      </button>
                    ))}
                  </div>
                ) : (
                  <code>无模型 Prompt</code>
                )}
                <span>Tools</span>
                {agent.tool_names.length ? (
                  <div className="agent-dependency-links">
                    {agent.tool_names.map((toolName) => (
                      <button
                        type="button"
                        className="agent-dependency-link"
                        key={toolName}
                        onClick={() => onNavigateDependency("tool", toolName)}
                      >
                        {toolName}
                      </button>
                    ))}
                  </div>
                ) : (
                  <code>无 Tool 依赖</code>
                )}
                {agent.blockers.length ? (
                  <>
                    <span>阻塞项</span>
                    <code>{agent.blockers.join(" · ")}</code>
                  </>
                ) : null}
              </div>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ToolsConsole({
  tools,
  focusToolName,
  pending,
  error,
  onRefresh,
  onToggle,
}: {
  tools: ManagedTool[];
  focusToolName?: string | null;
  pending: boolean;
  error: string | null;
  onRefresh: () => void;
  onToggle: (tool: ManagedTool) => void;
}) {
  const [query, setQuery] = useState(() => focusToolName ?? "");
  const [source, setSource] = useState("all");
  const sources = useMemo(() => [...new Set(tools.map((tool) => tool.source))], [tools]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tools.filter(
      (tool) =>
        (source === "all" || tool.source === source) &&
        (!normalized ||
          `${tool.name} ${tool.display_name} ${tool.description}`
            .toLowerCase()
            .includes(normalized)),
    );
  }, [query, source, tools]);

  return (
    <section className="configuration-console">
      <ConfigurationHeader
        eyebrow="AGENT TOOL CATALOG"
        title="Tools 管理"
        detail="只治理 BinnAgentX 代码已注册的工具；启停策略持久化，不接受任意代码上传。"
        onRefresh={onRefresh}
      />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="configuration-summary">
        <span>
          项目边界 <strong>binnagentx</strong>
        </span>
        <span>
          已启用 <strong>{tools.filter((tool) => tool.enabled).length}</strong>
        </span>
        <span>
          Agent Memory{" "}
          <strong>{tools.filter((tool) => tool.source === "agent_memory").length}</strong>
        </span>
      </div>
      <div className="configuration-filters">
        <input
          aria-label="搜索 Tool"
          placeholder="搜索名称、用途或描述"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Tool 来源"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          <option value="all">全部来源</option>
          {sources.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="tool-catalog">
        {filtered.map((tool) => (
          <article className={tool.enabled ? "tool-card enabled" : "tool-card"} key={tool.name}>
            <header>
              <div>
                <span>{tool.source}</span>
                <h2>{tool.display_name}</h2>
                <code>
                  {tool.name}@{tool.version}
                </code>
              </div>
              <button
                type="button"
                className={tool.enabled ? "danger-button" : "primary-button"}
                disabled={pending}
                onClick={() => onToggle(tool)}
              >
                {tool.enabled ? "停用" : "启用"}
              </button>
            </header>
            <p>{tool.description}</p>
            <dl>
              <div>
                <dt>类型</dt>
                <dd>{tool.kind}</dd>
              </div>
              <div>
                <dt>风险</dt>
                <dd>{RISK_LABELS[tool.risk_level]}</dd>
              </div>
              <div>
                <dt>权限</dt>
                <dd>{tool.required_permission_scopes.join(" · ") || "无额外权限"}</dd>
              </div>
              <div>
                <dt>策略版本</dt>
                <dd>v{tool.policy_version}</dd>
              </div>
            </dl>
            <details>
              <summary>查看 Schema 与调用边界</summary>
              <pre>
                {JSON.stringify({ input: tool.input_schema, output: tool.output_schema }, null, 2)}
              </pre>
              <small>
                Actor: {tool.allowed_actor_types.join(", ")}
                {tool.requires_idempotency_key ? " · 需要幂等键" : ""}
                {tool.requires_human_approval ? " · 需要人工审批" : ""}
              </small>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PromptsConsole({
  prompts,
  focusPromptId,
  pending,
  error,
  onRefresh,
  onCreate,
  onUpdate,
  onActivate,
}: {
  prompts: ManagedPrompt[];
  focusPromptId?: string | null;
  pending: boolean;
  error: string | null;
  onRefresh: () => void;
  onCreate: (input: PromptDraftInput) => void;
  onUpdate: (
    prompt: ManagedPrompt,
    input: Omit<PromptDraftInput, "prompt_id" | "prompt_version">,
  ) => void;
  onActivate: (prompt: ManagedPrompt) => void;
}) {
  const [selectedKey, setSelectedKey] = useState("");
  const [creating, setCreating] = useState(false);
  const focusedPrompt = focusPromptId
    ? (prompts.find((item) => item.prompt_id === focusPromptId && item.status === "active") ??
      prompts.find((item) => item.prompt_id === focusPromptId))
    : null;
  const selected =
    prompts.find((item) => `${item.prompt_id}@${item.prompt_version}` === selectedKey) ??
    focusedPrompt ??
    prompts[0] ??
    null;
  const [draft, setDraft] = useState<PromptDraftInput | null>(null);
  const editorDraft = draft ?? promptInput(selected);
  const updateDraft = (patch: Partial<PromptDraftInput>) => setDraft({ ...editorDraft, ...patch });

  const startNewVersion = () => {
    const versions = prompts.filter((item) => item.prompt_id === selected?.prompt_id).length;
    setCreating(true);
    setDraft({
      ...promptInput(selected),
      prompt_version: `v${versions + 1}`,
    });
  };

  const save = () => {
    if (creating) {
      onCreate(editorDraft);
      setCreating(false);
      setDraft(null);
      return;
    }
    if (!selected) return;
    onUpdate(selected, {
      owner: editorDraft.owner,
      purpose: editorDraft.purpose,
      template_text: editorDraft.template_text,
      variables: editorDraft.variables,
      model_policy: editorDraft.model_policy,
    });
    setDraft(null);
  };

  return (
    <section className="configuration-console">
      <ConfigurationHeader
        eyebrow="VERSIONED PROMPT REGISTRY"
        title="Prompt 管理"
        detail="模板、变量和模型策略只属于 BinnAgentX；激活新版本会归档同 Prompt 的旧活动版本。"
        onRefresh={onRefresh}
      />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="prompt-workbench">
        <aside className="prompt-list">
          <div>
            <strong>{prompts.length} 个版本</strong>
            <span>project: binnagentx</span>
          </div>
          {prompts.map((prompt) => {
            const key = `${prompt.prompt_id}@${prompt.prompt_version}`;
            return (
              <button
                type="button"
                className={selected === prompt && !creating ? "active" : ""}
                key={key}
                onClick={() => {
                  setCreating(false);
                  setSelectedKey(key);
                  setDraft(promptInput(prompt));
                }}
              >
                <span className={`status-pill ${prompt.status}`}>{prompt.status}</span>
                <strong>{prompt.prompt_id}</strong>
                <small>
                  {prompt.prompt_version} · {prompt.owner}
                </small>
              </button>
            );
          })}
        </aside>
        <form
          className="prompt-editor"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <header>
            <div>
              <p className="eyebrow">{creating ? "NEW DRAFT" : selected?.status.toUpperCase()}</p>
              <h2>
                {creating
                  ? "新建 Prompt 版本"
                  : selected
                    ? `${selected.prompt_id}@${selected.prompt_version}`
                    : "暂无 Prompt"}
              </h2>
            </div>
            <button type="button" onClick={startNewVersion}>
              基于此版本新建
            </button>
          </header>
          <div className="prompt-fields two-columns">
            <label>
              Prompt ID
              <input
                disabled={!creating}
                value={editorDraft.prompt_id}
                onChange={(event) => updateDraft({ prompt_id: event.target.value })}
              />
            </label>
            <label>
              版本
              <input
                disabled={!creating}
                value={editorDraft.prompt_version}
                onChange={(event) => updateDraft({ prompt_version: event.target.value })}
              />
            </label>
            <label>
              Owner
              <input
                disabled={!creating && selected?.status !== "draft"}
                value={editorDraft.owner}
                onChange={(event) => updateDraft({ owner: event.target.value })}
              />
            </label>
            <label>
              变量（逗号分隔）
              <input
                disabled={!creating && selected?.status !== "draft"}
                value={editorDraft.variables.join(", ")}
                onChange={(event) =>
                  updateDraft({
                    variables: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </div>
          <label>
            用途
            <textarea
              disabled={!creating && selected?.status !== "draft"}
              value={editorDraft.purpose}
              onChange={(event) => updateDraft({ purpose: event.target.value })}
            />
          </label>
          <label>
            Prompt 模板
            <textarea
              className="prompt-template"
              disabled={!creating && selected?.status !== "draft"}
              value={editorDraft.template_text}
              onChange={(event) => updateDraft({ template_text: event.target.value })}
            />
          </label>
          <label>
            模型策略 JSON
            <textarea
              className="policy-json"
              disabled={!creating && selected?.status !== "draft"}
              value={JSON.stringify(editorDraft.model_policy, null, 2)}
              onChange={(event) => {
                try {
                  updateDraft({
                    model_policy: JSON.parse(event.target.value) as Record<string, unknown>,
                  });
                } catch {
                  /* Keep the last valid policy while editing. */
                }
              }}
            />
          </label>
          <footer>
            <span>
              {selected
                ? `hash ${selected.content_hash.slice(0, 12)} · revision ${selected.version}`
                : ""}
            </span>
            <div>
              {selected && selected.status !== "active" && !creating ? (
                <button type="button" disabled={pending} onClick={() => onActivate(selected)}>
                  激活此版本
                </button>
              ) : null}
              {creating || selected?.status === "draft" ? (
                <button className="primary-button" disabled={pending} type="submit">
                  保存草稿
                </button>
              ) : null}
            </div>
          </footer>
        </form>
      </div>
    </section>
  );
}

function ConfigurationHeader({
  eyebrow,
  title,
  detail,
  onRefresh,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  onRefresh: () => void;
}) {
  return (
    <div className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      <div className="intro-actions">
        <button type="button" onClick={onRefresh}>
          刷新目录
        </button>
      </div>
    </div>
  );
}

function promptInput(prompt: ManagedPrompt | null): PromptDraftInput {
  return prompt
    ? {
        prompt_id: prompt.prompt_id,
        prompt_version: prompt.prompt_version,
        owner: prompt.owner,
        purpose: prompt.purpose,
        template_text: prompt.template_text,
        variables: prompt.variables,
        model_policy: prompt.model_policy,
      }
    : {
        prompt_id: "agent.new_prompt",
        prompt_version: "v1",
        owner: "agent_runtime",
        purpose: "描述该 Prompt 在 BinnAgentX 中的单一用途。",
        template_text: "在此填写版本化 Prompt 模板，并使用 {{variable}} 声明变量。",
        variables: ["variable"],
        model_policy: { temperature: 0.2, max_tokens: 1200 },
      };
}
