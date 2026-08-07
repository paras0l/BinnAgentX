"use client";

import { useEffect, useState, useTransition } from "react";

import {
  ControlApiError,
  getControlRunReplay,
  getOperationalTimeline,
  listControlRuns,
  listKnowledgeProposals,
  listOperationalInvocations,
  listOperationalTraces,
  reviewKnowledgeProposal,
  type ControlRunReplay,
  type ControlRunSummary,
  type KnowledgeProposal,
  type OperationalInvocationPage,
  type OperationalTracePage,
  type OperationalTimeline,
} from "../lib/control-api";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function errorMessage(reason: unknown): string {
  return reason instanceof ControlApiError || reason instanceof Error
    ? reason.message
    : "control_request_failed";
}

export function OperationsConsole() {
  const [runs, setRuns] = useState<ControlRunSummary[]>([]);
  const [totalRuns, setTotalRuns] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [replay, setReplay] = useState<ControlRunReplay | null>(null);
  const [proposals, setProposals] = useState<KnowledgeProposal[]>([]);
  const [invocations, setInvocations] = useState<OperationalInvocationPage | null>(null);
  const [traces, setTraces] = useState<OperationalTracePage | null>(null);
  const [operationalTimeline, setOperationalTimeline] = useState<OperationalTimeline | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = async (runQuery = query) => {
    const [runPage, reviewItems, tracePage] = await Promise.all([
      listControlRuns({ query: runQuery }),
      listKnowledgeProposals(),
      listOperationalTraces(),
    ]);
    setRuns(runPage.items);
    setTotalRuns(runPage.total_items);
    setProposals(reviewItems);
    setTraces(tracePage);
    const nextRunId = runPage.items.some((item) => item.workflow_run_id === selectedRunId)
      ? selectedRunId
      : (runPage.items[0]?.workflow_run_id ?? null);
    setSelectedRunId(nextRunId);
    if (nextRunId) {
      const [nextReplay, nextInvocations, nextTimeline] = await Promise.all([
        getControlRunReplay(nextRunId),
        listOperationalInvocations({ workflowRunId: nextRunId }),
        getOperationalTimeline(nextRunId),
      ]);
      setReplay(nextReplay);
      setInvocations(nextInvocations);
      setOperationalTimeline(nextTimeline);
    } else {
      setReplay(null);
      setInvocations(null);
      setOperationalTimeline(null);
    }
  };

  useEffect(() => {
    let active = true;
    void Promise.all([listControlRuns(), listKnowledgeProposals(), listOperationalTraces()])
      .then(async ([runPage, reviewItems, tracePage]) => {
        if (!active) return;
        setRuns(runPage.items);
        setTotalRuns(runPage.total_items);
        setProposals(reviewItems);
        setTraces(tracePage);
        const firstRunId = runPage.items[0]?.workflow_run_id ?? null;
        setSelectedRunId(firstRunId);
        if (!firstRunId) return;
        const [firstReplay, firstInvocations, firstTimeline] = await Promise.all([
          getControlRunReplay(firstRunId),
          listOperationalInvocations({ workflowRunId: firstRunId }),
          getOperationalTimeline(firstRunId),
        ]);
        if (!active) return;
        setReplay(firstReplay);
        setInvocations(firstInvocations);
        setOperationalTimeline(firstTimeline);
      })
      .catch((reason: unknown) => active && setError(errorMessage(reason)));
    return () => {
      active = false;
    };
  }, []);

  const selectRun = (runId: string) => {
    setSelectedRunId(runId);
    setError(null);
    startTransition(async () => {
      try {
        const [nextReplay, nextInvocations, nextTimeline] = await Promise.all([
          getControlRunReplay(runId),
          listOperationalInvocations({ workflowRunId: runId }),
          getOperationalTimeline(runId),
        ]);
        setReplay(nextReplay);
        setInvocations(nextInvocations);
        setOperationalTimeline(nextTimeline);
      } catch (reason) {
        setError(errorMessage(reason));
      }
    });
  };

  const review = (proposalId: string, action: "approve" | "reject") => {
    setError(null);
    startTransition(async () => {
      try {
        await reviewKnowledgeProposal(proposalId, action);
        setProposals((current) => current.filter((item) => item.proposal_id !== proposalId));
      } catch (reason) {
        setError(errorMessage(reason));
      }
    });
  };

  return (
    <section className="configuration-console">
      <div className="page-intro">
        <div>
          <p className="eyebrow">AGENT OPERATIONS</p>
          <h1>运行与复核中心</h1>
          <p>复用学习运行回放和知识提案审核，定位执行阶段、检查点和待人工决策事项。</p>
        </div>
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await load();
              } catch (reason) {
                setError(errorMessage(reason));
              }
            })
          }
          type="button"
        >
          刷新
        </button>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="configuration-summary">
        <span>
          学习运行 <strong>{totalRuns}</strong>
        </span>
        <span>
          当前页 <strong>{runs.length}</strong>
        </span>
        <span>
          待人工复核 <strong>{proposals.length}</strong>
        </span>
      </div>
      <div className="configuration-filters">
        <input
          aria-label="搜索学习运行"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="运行 ID、学习者隔离标识、阶段或状态"
          value={query}
        />
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await load(query);
              } catch (reason) {
                setError(errorMessage(reason));
              }
            })
          }
          type="button"
        >
          查询
        </button>
      </div>

      <div className="operations-grid">
        <div className="operations-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">WORKFLOW RUNS</p>
              <h2>学习运行</h2>
            </div>
          </div>
          <div className="job-table">
            {runs.length === 0 ? <p className="empty-state">没有匹配的学习运行。</p> : null}
            {runs.map((run) => (
              <button
                className={`job-row ${selectedRunId === run.workflow_run_id ? "selected" : ""}`}
                key={run.workflow_run_id}
                onClick={() => selectRun(run.workflow_run_id)}
                type="button"
              >
                <span className="job-identity">
                  <span className={`status-pill ${run.lifecycle}`}>{run.lifecycle}</span>
                  <strong>{run.workflow_run_id}</strong>
                  <small>{dateFormatter.format(new Date(run.updated_at))}</small>
                </span>
                <span>
                  <strong>{run.stage ?? "无阶段"}</strong>
                  <small>v{run.version}</small>
                </span>
                <span>
                  <strong>{run.task_count} 个任务</strong>
                  <small>{run.model_call_count} 次模型调用</small>
                </span>
                <span>
                  <strong>${Number(run.cost_usd).toFixed(4)}</strong>
                  <small>{run.checkpoint_id}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
        <aside className="detail-panel" aria-label="学习运行回放">
          {replay ? (
            <>
              <p className="eyebrow">RUN REPLAY</p>
              <h2>{replay.workflow_run_id}</h2>
              <p>
                {replay.lifecycle} · {replay.stage} · 当前任务 {replay.current_task_id ?? "无"}
              </p>
              {replay.completion_gaps.length ? (
                <div className="error-banner">完成缺口：{replay.completion_gaps.join(" · ")}</div>
              ) : null}
              <div className="timeline">
                {replay.event_chain.map((event, index) => (
                  <article
                    className="timeline-item"
                    key={event.event_id ?? `${event.event_type}-${index}`}
                  >
                    <span />
                    <div>
                      <strong>{event.event_type ?? "domain_event"}</strong>
                      <small>聚合版本 {event.aggregate_version ?? "—"}</small>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="detail-empty">
              <strong>选择一次学习运行</strong>
              <span>查看任务和脱敏事件链。</span>
            </div>
          )}
        </aside>
      </div>

      <div className="section-heading review-heading">
        <div>
          <p className="eyebrow">LANGFUSE TRACES</p>
          <h2>模型追踪</h2>
        </div>
        <span>{traces?.total_items ?? 0} 条 · 具体证据在 Langfuse</span>
      </div>
      <div className="job-table">
        {traces?.items.length === 0 ? <p className="empty-state">当前没有模型追踪。</p> : null}
        {traces?.items.map((trace) => (
          <article className="invocation-row" key={trace.trace_id}>
            <div>
              <span className="status-pill recorded">recorded</span>
              <strong>{trace.name}</strong>
              <code>{trace.trace_id}</code>
            </div>
            <dl>
              <div>
                <dt>操作</dt>
                <dd>{String(trace.metadata.operation ?? "—")}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{String(trace.metadata.provider ?? "—")}</dd>
              </div>
              <div>
                <dt>模型观察</dt>
                <dd>{trace.observation_count}</dd>
              </div>
              <div>
                <dt>耗时</dt>
                <dd>{trace.latency_ms}ms</dd>
              </div>
              <div>
                <dt>费用</dt>
                <dd>${Number(trace.total_cost_usd).toFixed(4)}</dd>
              </div>
              <div>
                <dt>时间</dt>
                <dd>{dateFormatter.format(new Date(trace.timestamp))}</dd>
              </div>
            </dl>
            <small>
              {Object.entries(trace.metadata)
                .filter(([key]) => !["operation", "provider", "project_key"].includes(key))
                .slice(0, 5)
                .map(([key, value]) => `${key}=${String(value)}`)
                .join(" · ") || "无附加业务元数据"}
            </small>
            <a href={trace.evidence_url} target="_blank" rel="noreferrer">
              在 Langfuse 查看具体证据
            </a>
          </article>
        ))}
      </div>

      <div className="section-heading review-heading">
        <div>
          <p className="eyebrow">INVOCATIONS & AUDIT</p>
          <h2>调用与审计</h2>
        </div>
        <span>{selectedRunId ? `关联 ${selectedRunId}` : "未选择运行"}</span>
      </div>
      <div className="configuration-summary">
        <span>
          调用 <strong>{invocations?.metrics.total_invocations ?? 0}</strong>
        </span>
        <span>
          模型 <strong>{invocations?.metrics.model_invocations ?? 0}</strong>
        </span>
        <span>
          Fallback <strong>{invocations?.metrics.fallback_count ?? 0}</strong>
        </span>
        <span>
          费用 <strong>${Number(invocations?.metrics.actual_cost_usd ?? 0).toFixed(4)}</strong>
        </span>
        <span>
          平均耗时 <strong>{invocations?.metrics.average_latency_ms ?? 0}ms</strong>
        </span>
      </div>
      <div className="operations-grid invocation-grid">
        <div className="operations-column">
          <div className="job-table">
            {invocations?.items.length === 0 ? (
              <p className="empty-state">该运行还没有 Tool 调用记录。</p>
            ) : null}
            {invocations?.items.map((invocation) => (
              <article className="invocation-row" key={invocation.invocation_key}>
                <div>
                  <span
                    className={`status-pill ${invocation.used_fallback ? "warning" : invocation.status}`}
                  >
                    {invocation.used_fallback ? "fallback" : invocation.status}
                  </span>
                  <strong>{invocation.tool_name}</strong>
                  <code>{invocation.invocation_key}</code>
                </div>
                <dl>
                  <div>
                    <dt>来源</dt>
                    <dd>{invocation.source}</dd>
                  </div>
                  <div>
                    <dt>模型</dt>
                    <dd>{invocation.adapter ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Prompt</dt>
                    <dd>{invocation.prompt_version ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>结果</dt>
                    <dd>{invocation.outcome ?? invocation.reason_code ?? "已准入"}</dd>
                  </div>
                  <div>
                    <dt>耗时</dt>
                    <dd>{invocation.latency_ms === null ? "—" : `${invocation.latency_ms}ms`}</dd>
                  </div>
                  <div>
                    <dt>费用</dt>
                    <dd>${Number(invocation.actual_cost_usd).toFixed(4)}</dd>
                  </div>
                </dl>
                <small>
                  {invocation.audit_event_id
                    ? `audit ${invocation.audit_event_id}`
                    : "历史记录未关联审计"}
                </small>
              </article>
            ))}
          </div>
        </div>
        <aside className="detail-panel" aria-label="统一审计时间线">
          <p className="eyebrow">CORRELATED TIMELINE</p>
          <h2>事件关联</h2>
          <div className="timeline">
            {operationalTimeline?.items.length === 0 ? (
              <p className="empty-state">暂无关联事件。</p>
            ) : null}
            {operationalTimeline?.items.map((item) => (
              <article className="timeline-item" key={`${item.kind}-${item.record_id}`}>
                <span />
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.kind} · {item.status ?? "recorded"}
                    {item.version ? ` · v${item.version}` : ""}
                  </small>
                  {item.invocation_key ? <code>{item.invocation_key}</code> : null}
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <div className="section-heading review-heading">
        <div>
          <p className="eyebrow">HUMAN REVIEW</p>
          <h2>知识提案复核</h2>
        </div>
        <span>{proposals.length} 项待处理</span>
      </div>
      <div className="tool-catalog">
        {proposals.length === 0 ? <p className="empty-state">当前没有待复核知识提案。</p> : null}
        {proposals.map((proposal) => (
          <article className="tool-card" key={proposal.proposal_id}>
            <header>
              <div>
                <span>{proposal.knowledge_kind}</span>
                <h2>{proposal.title}</h2>
                <code>{proposal.canonical_key}</code>
              </div>
            </header>
            <p>{proposal.claim}</p>
            <dl>
              <div>
                <dt>动作</dt>
                <dd>{proposal.action}</dd>
              </div>
              <div>
                <dt>目标</dt>
                <dd>{proposal.destination}</dd>
              </div>
              <div>
                <dt>置信度</dt>
                <dd>{Number(proposal.confidence).toFixed(2)}</dd>
              </div>
              <div>
                <dt>冲突</dt>
                <dd>{proposal.conflicts.length}</dd>
              </div>
            </dl>
            <div className="intro-actions">
              <button
                disabled={isPending}
                onClick={() => review(proposal.proposal_id, "approve")}
                type="button"
              >
                批准
              </button>
              <button
                className="danger-button"
                disabled={isPending}
                onClick={() => review(proposal.proposal_id, "reject")}
                type="button"
              >
                拒绝
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
