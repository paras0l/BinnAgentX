"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  ControlApiError,
  cancelContentGenerationJob,
  createContentGenerationJob,
  createExperienceCode,
  getContentControlStatus,
  getContentGenerationJob,
  listContentGenerationJobs,
  listExperienceCodes,
  publishContentGenerationJob,
  retryContentGenerationJob,
  revokeExperienceCode,
  type ContentControlStatus,
  type ContentGenerationEvent,
  type ContentGenerationJob,
  type ContentGenerationJobDetail,
  type ContentGenerationJobStatus,
  type CreatedExperienceCode,
  type ExperienceCode,
  type ExperienceCodeStatus,
} from "../lib/control-api";

type View = "content" | "access";

const JOB_STATUS_LABELS: Record<ContentGenerationJobStatus, string> = {
  queued: "排队中",
  running: "运行中",
  generated: "待发布",
  validation_failed: "校验未通过",
  generation_failed: "生成失败",
  cancelled: "已取消",
};

const CODE_STATUS_LABELS: Record<ExperienceCodeStatus, string> = {
  active: "可使用",
  exhausted: "名额已满",
  expired: "已到期",
  revoked: "已停用",
};

const AGENT_LABELS: Record<string, string> = {
  generator_agent: "生成 Agent",
  review_agent: "审核 Agent",
  validator: "确定性校验器",
};

const STAGE_LABELS: Record<string, string> = {
  queued: "等待 Worker 接单",
  starting: "Worker 正在初始化",
  preparing: "读取源材料与约束",
  generating: "生成新材料",
  reviewing: "独立质量审核",
  revision_requested: "按审核意见返工",
  review_approved: "单项审核通过",
  item_completed: "单项完成",
  retrying: "准备重试",
  validating: "完整性与发布门禁校验",
  validation_failed: "完整性校验未通过",
  cancelling: "等待安全停止",
  cancelled: "已停止",
  failed: "运行失败",
  completed: "全部 Agent 审核通过",
  published: "已发布",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export default function ControlHomePage() {
  const [view, setView] = useState<View>("content");
  const [status, setStatus] = useState<ContentControlStatus | null>(null);
  const [jobs, setJobs] = useState<ContentGenerationJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<ContentGenerationJobDetail | null>(null);
  const [codes, setCodes] = useState<ExperienceCode[]>([]);
  const [contentSeed, setContentSeed] = useState(20260719);
  const [label, setLabel] = useState("小范围体验");
  const [maxUses, setMaxUses] = useState(25);
  const [validDays, setValidDays] = useState(7);
  const [createdCode, setCreatedCode] = useState<CreatedExperienceCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadContent = useCallback(
    async (preferredJobId?: string | null) => {
      const [nextStatus, nextJobs] = await Promise.all([
        getContentControlStatus(),
        listContentGenerationJobs(),
      ]);
      setStatus(nextStatus);
      setJobs(nextJobs);
      const detailId = preferredJobId ?? selectedJobId ?? nextJobs[0]?.job_id ?? null;
      if (detailId) {
        const detail = await getContentGenerationJob(detailId);
        setSelectedJobId(detailId);
        setJobDetail(detail);
      } else {
        setJobDetail(null);
      }
    },
    [selectedJobId],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      getContentControlStatus(),
      listContentGenerationJobs(),
      listExperienceCodes(),
    ])
      .then(async ([nextStatus, nextJobs, nextCodes]) => {
        if (!active) return;
        setStatus(nextStatus);
        setJobs((current) => [
          ...nextJobs,
          ...current.filter(
            (item) => !nextJobs.some((candidate) => candidate.job_id === item.job_id),
          ),
        ]);
        setCodes((current) => [
          ...nextCodes,
          ...current.filter(
            (item) => !nextCodes.some((candidate) => candidate.code_id === item.code_id),
          ),
        ]);
        const firstId = nextJobs[0]?.job_id;
        if (firstId) {
          const detail = await getContentGenerationJob(firstId);
          if (!active) return;
          setSelectedJobId(firstId);
          setJobDetail(detail);
        }
      })
      .catch((reason: unknown) => active && setError(controlErrorMessage(reason)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const hasLiveJob = jobs.some((job) => job.status === "queued" || job.status === "running");

  useEffect(() => {
    if (!hasLiveJob) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadContent().catch((reason: unknown) => setError(controlErrorMessage(reason)));
    }, 3000);
    return () => window.clearInterval(interval);
  }, [hasLiveJob, loadContent]);

  const selectedJob = jobDetail?.job ?? jobs.find((job) => job.job_id === selectedJobId) ?? null;
  const activePack = jobs.find((job) => job.is_active);
  const failedJobs = useMemo(
    () => jobs.filter((job) => job.status.includes("failed")).length,
    [jobs],
  );

  const runAction = (operation: () => Promise<ContentGenerationJob>) => {
    setError(null);
    startTransition(async () => {
      try {
        const changed = await operation();
        await loadContent(changed.job_id);
      } catch (reason) {
        setError(controlErrorMessage(reason));
      }
    });
  };

  const selectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setError(null);
    startTransition(async () => {
      try {
        setJobDetail(await getContentGenerationJob(jobId));
      } catch (reason) {
        setError(controlErrorMessage(reason));
      }
    });
  };

  return (
    <main className="cockpit-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">BX</span>
          <div>
            <strong>BinnAgentX</strong>
            <span>Operations Console</span>
          </div>
        </div>
        <nav aria-label="控制舱功能">
          <button className={view === "content" ? "active" : ""} onClick={() => setView("content")}>
            内容与 Agent
          </button>
          <button className={view === "access" ? "active" : ""} onClick={() => setView("access")}>
            体验访问
          </button>
        </nav>
        <div className="operator-chip">
          <span className="live-dot" /> developer_reviewer
        </div>
      </header>

      {view === "content" ? (
        <>
          <section className="page-intro">
            <div>
              <p className="eyebrow">CONTENT OPERATIONS</p>
              <h1>材料生产控制台</h1>
              <p>从排队、生成、审核到发布，一处定位每个 Agent 当前在做什么。</p>
            </div>
            <div className="intro-actions">
              <a
                href={status?.langfuse.url ?? "http://localhost:3100"}
                target="_blank"
                rel="noreferrer"
              >
                打开 Langfuse ↗
              </a>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  void loadContent().catch((reason) => setError(controlErrorMessage(reason)))
                }
              >
                刷新状态
              </button>
            </div>
          </section>

          {error ? (
            <div className="error-banner" role="alert">
              {error}
            </div>
          ) : null}

          <section className="status-grid" aria-label="运行状态">
            <StatusCard
              label="内容 Worker"
              value={
                status?.worker.online
                  ? status.worker.state === "running"
                    ? "正在执行"
                    : "在线待命"
                  : "离线"
              }
              tone={status?.worker.online ? "healthy" : "danger"}
              detail={
                status?.worker.state === "running" && status.worker.heartbeat_at
                  ? `心跳 ${relativeTime(status.worker.heartbeat_at)}`
                  : status && status.prefect.active_workers > 0
                    ? "Prefect Worker 已注册"
                    : "尚未收到业务心跳"
              }
            />
            <StatusCard
              label="模型网关"
              value={status ? `${status.model_provider} / ${status.model_name}` : "读取中"}
              tone="healthy"
              detail="生成与审核使用同一供应商、独立 Prompt"
            />
            <StatusCard
              label="Langfuse"
              value={
                status?.langfuse.reachable
                  ? "已连接"
                  : status?.langfuse.configured
                    ? "不可达"
                    : "未配置"
              }
              tone={status?.langfuse.reachable ? "healthy" : "warning"}
              detail="记录 Prompt、输出、耗时与模型调用"
            />
            <StatusCard
              label="Prefect"
              value={
                status?.prefect.reachable
                  ? `${status.prefect.active_workers} 个任务 Worker`
                  : status?.prefect.configured
                    ? "服务不可达"
                    : "未启用"
              }
              tone={status?.prefect.reachable ? "healthy" : "danger"}
              detail="负责任务投递与运行状态，不决定内容发布"
            />
            <StatusCard
              label="任务队列"
              value={`${status?.running_count ?? 0} 运行 · ${status?.queue_depth ?? 0} 等待`}
              tone={failedJobs > 0 ? "warning" : "neutral"}
              detail={`${status?.failed_count ?? 0} 次失败 · ${activePack ? "已有发布版本" : "尚无发布版本"}`}
            />
          </section>

          <section className="workbench">
            <div className="job-column">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">PIPELINE RUNS</p>
                  <h2>材料生成与发布</h2>
                </div>
                <span>{loading ? "读取中" : `${jobs.length} 次运行`}</span>
              </div>

              <form
                className="new-run-bar"
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction(() => createContentGenerationJob(contentSeed));
                }}
              >
                <div>
                  <strong>创建完整材料包</strong>
                  <span>2 篇校准阅读 · 2 篇匹配阅读 · 2 项微型表达</span>
                </div>
                <label>
                  <span>随机种子</span>
                  <input
                    type="number"
                    min={0}
                    max={2 ** 31 - 1}
                    value={contentSeed}
                    onChange={(event) => setContentSeed(event.target.valueAsNumber)}
                  />
                </label>
                <button type="submit" disabled={isPending || hasLiveJob || !status?.worker.online}>
                  {hasLiveJob ? "任务正在运行" : "开始生成"}
                </button>
              </form>

              <div className="job-table" aria-busy={loading}>
                <div className="job-table-head">
                  <span>运行</span>
                  <span>Agent 进度</span>
                  <span>模型 / 耗时</span>
                  <span>结果</span>
                </div>
                {jobs.length === 0 && !loading ? (
                  <p className="empty-state">还没有运行记录。Worker 在线后可以创建第一个材料包。</p>
                ) : null}
                {jobs.map((job) => (
                  <button
                    type="button"
                    className={`job-row ${selectedJobId === job.job_id ? "selected" : ""}`}
                    key={job.job_id}
                    onClick={() => selectJob(job.job_id)}
                  >
                    <span className="job-identity">
                      <span className={`status-pill ${job.status}`}>
                        {job.is_active ? "当前发布" : JOB_STATUS_LABELS[job.status]}
                      </span>
                      <strong>{shortId(job.job_id)}</strong>
                      <small>{formatDate(job.created_at)}</small>
                    </span>
                    <span className="job-progress-cell">
                      <span>
                        <strong>{job.progress_completed}</strong> / {job.progress_total} 项
                      </span>
                      <span className="progress-track">
                        <i style={{ width: `${progressPercent(job)}%` }} />
                      </span>
                      <small>{STAGE_LABELS[job.current_stage] ?? job.current_stage}</small>
                    </span>
                    <span className="job-model">
                      <strong>{job.model_provider ?? "—"}</strong>
                      <small>{job.model_name ?? "等待分配"}</small>
                      <small>{formatDuration(job)}</small>
                    </span>
                    <span className="job-result">
                      <strong>{job.agent_reviewed_count} 项审核通过</strong>
                      <small>
                        {job.validation_errors[0]
                          ? friendlyFailure(job.validation_errors[0])
                          : "无阻断错误"}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <aside className="detail-panel" aria-label="运行详情">
              {selectedJob ? (
                <JobDetail
                  detail={jobDetail}
                  job={selectedJob}
                  pending={isPending}
                  onCancel={() => runAction(() => cancelContentGenerationJob(selectedJob.job_id))}
                  onRetry={() => runAction(() => retryContentGenerationJob(selectedJob.job_id))}
                  onPublish={() => runAction(() => publishContentGenerationJob(selectedJob.job_id))}
                />
              ) : (
                <div className="detail-empty">
                  <strong>选择一次运行</strong>
                  <span>查看 Agent 时间线、错误与观测链接。</span>
                </div>
              )}
            </aside>
          </section>
        </>
      ) : (
        <AccessConsole
          codes={codes}
          label={label}
          maxUses={maxUses}
          validDays={validDays}
          created={createdCode}
          copied={copied}
          pending={isPending}
          error={error}
          onLabel={setLabel}
          onMaxUses={setMaxUses}
          onValidDays={setValidDays}
          onCreate={() => {
            setError(null);
            setCopied(false);
            startTransition(async () => {
              try {
                const next = await createExperienceCode({
                  label,
                  max_uses: maxUses,
                  valid_days: validDays,
                });
                setCreatedCode(next);
                setCodes((current) => [next, ...current]);
              } catch (reason) {
                setError(controlErrorMessage(reason));
              }
            });
          }}
          onCopy={() => {
            if (!createdCode) return;
            void navigator.clipboard
              .writeText(createdCode.experience_code)
              .then(() => setCopied(true));
          }}
          onRevoke={(codeId) => {
            startTransition(async () => {
              try {
                const updated = await revokeExperienceCode(codeId);
                setCodes((current) =>
                  current.map((item) => (item.code_id === codeId ? updated : item)),
                );
              } catch (reason) {
                setError(controlErrorMessage(reason));
              }
            });
          }}
        />
      )}
    </main>
  );
}

function StatusCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <article className={`status-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function JobDetail({
  detail,
  job,
  pending,
  onCancel,
  onRetry,
  onPublish,
}: {
  detail: ContentGenerationJobDetail | null;
  job: ContentGenerationJob;
  pending: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onPublish: () => void;
}) {
  return (
    <>
      <div className="detail-header">
        <div>
          <p className="eyebrow">RUN DETAIL</p>
          <h2>{shortId(job.job_id)}</h2>
        </div>
        <span className={`status-pill ${job.status}`}>
          {job.is_active ? "当前发布" : JOB_STATUS_LABELS[job.status]}
        </span>
      </div>
      <div className="current-activity">
        <span>当前阶段</span>
        <strong>{STAGE_LABELS[job.current_stage] ?? job.current_stage}</strong>
        <small>{job.current_item_id ?? "尚未进入具体材料项"}</small>
        {job.status === "running" ? (
          <span className="activity-pulse">
            最后活动 {job.heartbeat_at ? relativeTime(job.heartbeat_at) : "未知"}
          </span>
        ) : null}
      </div>
      <dl className="run-facts">
        <div>
          <dt>审核进度</dt>
          <dd>
            {job.agent_reviewed_count} / {job.progress_total}
          </dd>
        </div>
        <div>
          <dt>Worker 尝试</dt>
          <dd>{job.attempt_count}</dd>
        </div>
        <div>
          <dt>模型</dt>
          <dd>
            {job.model_provider} · {job.model_name}
          </dd>
        </div>
        <div>
          <dt>耗时</dt>
          <dd>{formatDuration(job)}</dd>
        </div>
      </dl>
      {job.validation_errors.length > 0 ? (
        <section className="failure-box">
          <strong>失败诊断</strong>
          {job.validation_errors.map((item) => (
            <p key={item}>{friendlyFailure(item)}</p>
          ))}
          <details>
            <summary>查看原始错误</summary>
            <pre>{job.validation_errors.join("\n\n")}</pre>
          </details>
        </section>
      ) : null}
      <div className="run-actions">
        {job.langfuse_trace_url ? (
          <a href={job.langfuse_trace_url} target="_blank" rel="noreferrer">
            查看 Langfuse Trace ↗
          </a>
        ) : (
          <span>Trace 将在模型调用开始后出现</span>
        )}
        {job.prefect_task_run_url ? (
          <a href={job.prefect_task_run_url} target="_blank" rel="noreferrer">
            查看 Prefect Task Run ↗
          </a>
        ) : (
          <span>Prefect Run 将在任务投递后出现</span>
        )}
        <div>
          {job.can_cancel ? (
            <button className="danger-button" disabled={pending} onClick={onCancel}>
              安全停止
            </button>
          ) : null}
          {job.can_retry ? (
            <button disabled={pending} onClick={onRetry}>
              按原种子重试
            </button>
          ) : null}
          {job.can_publish && !job.is_active ? (
            <button className="primary-button" disabled={pending} onClick={onPublish}>
              审核并发布
            </button>
          ) : null}
        </div>
      </div>
      <section className="timeline-section">
        <div className="timeline-heading">
          <h3>Agent 运行时间线</h3>
          <span>{detail?.events.length ?? 0} 条事件</span>
        </div>
        <div className="timeline">
          {detail?.events.map((event) => (
            <TimelineEvent event={event} key={event.event_id} />
          ))}
          {detail && detail.events.length === 0 ? (
            <p className="empty-state">旧任务没有阶段事件；重试后会完整记录。</p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function TimelineEvent({ event }: { event: ContentGenerationEvent }) {
  return (
    <article className={`timeline-event ${event.stage}`}>
      <i />
      <div>
        <span>
          {event.agent_role ? (AGENT_LABELS[event.agent_role] ?? event.agent_role) : "系统"}
          {event.attempt ? ` · 第 ${event.attempt} 次` : ""}
        </span>
        <strong>{event.message}</strong>
        <small>
          {formatDate(event.occurred_at)}
          {event.item_id ? ` · ${event.item_id}` : ""}
        </small>
      </div>
    </article>
  );
}

function AccessConsole(props: {
  codes: ExperienceCode[];
  label: string;
  maxUses: number;
  validDays: number;
  created: CreatedExperienceCode | null;
  copied: boolean;
  pending: boolean;
  error: string | null;
  onLabel: (value: string) => void;
  onMaxUses: (value: number) => void;
  onValidDays: (value: number) => void;
  onCreate: () => void;
  onCopy: () => void;
  onRevoke: (id: string) => void;
}) {
  return (
    <section className="access-console">
      <div className="page-intro">
        <div>
          <p className="eyebrow">ACCESS OPERATIONS</p>
          <h1>体验访问管理</h1>
          <p>创建、观察和停用受控体验码，明文只展示一次。</p>
        </div>
      </div>
      {props.error ? (
        <div className="error-banner" role="alert">
          {props.error}
        </div>
      ) : null}
      {props.created ? (
        <div className="created-code">
          <div>
            <span>新体验码 · 请立即保存</span>
            <strong>{props.created.experience_code}</strong>
          </div>
          <button onClick={props.onCopy}>{props.copied ? "已复制" : "复制"}</button>
        </div>
      ) : null}
      <div className="access-grid">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            props.onCreate();
          }}
        >
          <h2>生成体验码</h2>
          <label>
            <span>用途备注</span>
            <input
              value={props.label}
              onChange={(event) => props.onLabel(event.target.value)}
              required
            />
          </label>
          <div className="field-row">
            <label>
              <span>体验人数</span>
              <input
                type="number"
                min={1}
                value={props.maxUses}
                onChange={(event) => props.onMaxUses(event.target.valueAsNumber)}
              />
            </label>
            <label>
              <span>有效天数</span>
              <input
                type="number"
                min={1}
                max={90}
                value={props.validDays}
                onChange={(event) => props.onValidDays(event.target.valueAsNumber)}
              />
            </label>
          </div>
          <button className="primary-button" disabled={props.pending}>
            生成新体验码
          </button>
        </form>
        <div className="code-list">
          <div className="section-heading">
            <h2>访问记录</h2>
            <span>{props.codes.length} 条</span>
          </div>
          {props.codes.map((code) => (
            <article key={code.code_id}>
              <div>
                <span className={`status-pill ${code.status}`}>
                  {CODE_STATUS_LABELS[code.status]}
                </span>
                <strong>{code.label}</strong>
                <small>{code.code_hint}</small>
              </div>
              <div>
                <strong>
                  {code.used_count} / {code.max_uses} 人
                </strong>
                <small>到期 {formatDate(code.expires_at)}</small>
              </div>
              <button
                disabled={props.pending || code.status === "revoked"}
                onClick={() => props.onRevoke(code.code_id)}
              >
                {code.status === "revoked" ? "已停用" : "停用"}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}
function shortId(value: string): string {
  return value.replace("content_job_", "run_").slice(0, 16);
}
function progressPercent(job: ContentGenerationJob): number {
  return Math.min(
    100,
    Math.round((job.progress_completed / Math.max(job.progress_total, 1)) * 100),
  );
}
function formatDuration(job: ContentGenerationJob): string {
  const start = new Date(job.started_at ?? job.created_at).getTime();
  const end = job.completed_at ? new Date(job.completed_at).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  return seconds >= 60 ? `${Math.floor(seconds / 60)}分 ${seconds % 60}秒` : `${seconds}秒`;
}
function relativeTime(value: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  return seconds < 5
    ? "刚刚"
    : seconds < 60
      ? `${seconds} 秒前`
      : `${Math.floor(seconds / 60)} 分钟前`;
}
function friendlyFailure(value: string): string {
  if (value.includes("summary") && value.includes("too_long"))
    return "审核 Agent 的说明文字超出旧版长度限制；该问题已在新版归一化处理。";
  if (value.includes("requested revision"))
    return "审核 Agent 判定材料需要修改，生成 Agent 已用反馈重试。";
  if (value.includes("not_fully_agent_reviewed"))
    return "存在尚未通过独立审核的材料项，发布门禁已阻止上线。";
  if (value.includes("cancel_requested")) return "任务已由操作者安全停止。";
  return value.split("\n")[0]?.slice(0, 220) ?? value;
}
function controlErrorMessage(reason: unknown): string {
  if (!(reason instanceof ControlApiError)) return "操作没有完成，请稍后重试。";
  const messages: Record<string, string> = {
    control_api_unreachable: "无法连接控制服务，请检查 API 容器。",
    content_generation_job_already_in_progress: "已有一个材料任务在运行，请先查看或停止它。",
    content_generation_job_not_publishable: "材料包尚未通过全部 Agent 审核，不能发布。",
    content_generation_job_not_cancellable: "该任务已经结束，不能再停止。",
    content_generation_job_not_retryable: "只有失败或取消的任务可以重试。",
    prefect_dispatch_failed: "Prefect 未能接收任务，请检查编排服务后重试。",
    prefect_dispatch_disabled: "Prefect 任务投递已关闭，无法创建材料任务。",
  };
  return messages[reason.message] ?? `操作没有完成：${reason.message}`;
}
