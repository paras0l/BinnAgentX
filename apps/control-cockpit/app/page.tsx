"use client";

import { useEffect, useState, useTransition } from "react";

import {
  ControlApiError,
  createExperienceCode,
  listExperienceCodes,
  revokeExperienceCode,
  type CreatedExperienceCode,
  type ExperienceCode,
  type ExperienceCodeStatus,
} from "../lib/control-api";

const views = [
  { name: "运行列表", detail: "状态、耗时、成本和公开错误" },
  { name: "运行回放", detail: "节点、重试、检查点和状态差异" },
  { name: "复核队列", detail: "拒判原因、证据引用和复核理由" },
  { name: "审计记录", detail: "操作者、命令、理由和目标版本" },
] as const;

const STATUS_LABELS: Record<ExperienceCodeStatus, string> = {
  active: "可使用",
  exhausted: "名额已满",
  expired: "已到期",
  revoked: "已停用",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default function ControlHomePage() {
  const [codes, setCodes] = useState<ExperienceCode[]>([]);
  const [label, setLabel] = useState("小范围体验");
  const [maxUses, setMaxUses] = useState(25);
  const [validDays, setValidDays] = useState(7);
  const [created, setCreated] = useState<CreatedExperienceCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    void listExperienceCodes()
      .then((items) => {
        if (active) setCodes(items);
      })
      .catch((reason: unknown) => {
        if (active) setError(controlErrorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const createCode = () => {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      try {
        const result = await createExperienceCode({
          label,
          max_uses: maxUses,
          valid_days: validDays,
        });
        setCreated(result);
        setCodes((current) => [result, ...current]);
      } catch (reason) {
        setError(controlErrorMessage(reason));
      }
    });
  };

  const revokeCode = (codeId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await revokeExperienceCode(codeId);
        setCodes((current) =>
          current.map((item) => (item.code_id === updated.code_id ? updated : item)),
        );
        if (created?.code_id === updated.code_id) setCreated(null);
      } catch (reason) {
        setError(controlErrorMessage(reason));
      }
    });
  };

  return (
    <main className="control-shell">
      <header className="control-header">
        <div>
          <p>BINNAGENT / INTERNAL</p>
          <h1>开发者控制舱</h1>
        </div>
        <div className="identity-block">
          <span>受控体验环境</span>
          <strong>developer_reviewer</strong>
        </div>
      </header>

      <section className="boundary-banner" aria-labelledby="boundary-title">
        <div>
          <p>当前边界</p>
          <h2 id="boundary-title">体验码可写入，训练内容仍按学习者隔离</h2>
        </div>
        <span>操作留痕</span>
      </section>

      <section className="experience-management" aria-labelledby="experience-management-title">
        <div className="experience-management-heading">
          <div>
            <p>ACCESS / EXPERIENCE</p>
            <h2 id="experience-management-title">体验码管理</h2>
            <span>明文只显示一次；停用后已有体验会话同步失效。</span>
          </div>
          <strong>{codes.filter((item) => item.status === "active").length} 个可用</strong>
        </div>

        {error ? (
          <div className="control-error" role="alert">
            {error}
          </div>
        ) : null}
        {created ? (
          <section className="created-code" aria-live="polite">
            <div>
              <span>新体验码 · 请立即复制</span>
              <strong>{created.experience_code}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(created.experience_code).then(() => {
                  setCopied(true);
                });
              }}
            >
              {copied ? "已复制" : "复制体验码"}
            </button>
          </section>
        ) : null}

        <div className="experience-management-grid">
          <form
            className="experience-code-form"
            onSubmit={(event) => {
              event.preventDefault();
              createCode();
            }}
          >
            <h3>生成体验码</h3>
            <label>
              <span>用途备注</span>
              <input value={label} onChange={(event) => setLabel(event.target.value)} required />
            </label>
            <div>
              <label>
                <span>体验人数</span>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.valueAsNumber)}
                  required
                />
              </label>
              <label>
                <span>有效天数</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={validDays}
                  onChange={(event) => setValidDays(event.target.valueAsNumber)}
                  required
                />
              </label>
            </div>
            <button type="submit" disabled={isPending}>
              {isPending ? "正在写入…" : "生成新体验码"}
            </button>
          </form>

          <div className="experience-code-list" aria-busy={loading}>
            <div className="experience-code-list-heading">
              <h3>已创建</h3>
              <span>{loading ? "正在读取…" : `${codes.length} 条记录`}</span>
            </div>
            {!loading && codes.length === 0 ? (
              <p className="control-empty">还没有体验码。创建后，明文只会在本次页面中出现。</p>
            ) : null}
            {codes.map((code) => (
              <article key={code.code_id}>
                <div className="experience-code-main">
                  <span className={`code-status ${code.status}`}>{STATUS_LABELS[code.status]}</span>
                  <h4>{code.label}</h4>
                  <code>{code.code_hint}</code>
                </div>
                <div className="experience-code-metrics">
                  <span>
                    <strong>{code.used_count}</strong> / {code.max_uses} 人
                  </span>
                  <span>到期 {formatDate(code.expires_at)}</span>
                  <span>
                    {code.last_used_at ? `最近 ${formatDate(code.last_used_at)}` : "尚未使用"}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isPending || code.status === "revoked"}
                  onClick={() => revokeCode(code.code_id)}
                >
                  {code.status === "revoked" ? "已停用" : "停用"}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="view-grid" aria-label="控制舱后续视图">
        {views.map((view, index) => (
          <article key={view.name}>
            <span className="view-index">0{index + 1}</span>
            <h2>{view.name}</h2>
            <p>{view.detail}</p>
            <button type="button" disabled>
              尚未接入
            </button>
          </article>
        ))}
      </section>

      <footer>体验码经权限校验后写入；控制舱不接触学习者答案，也不在数据库保存体验码明文。</footer>
    </main>
  );
}

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

function controlErrorMessage(reason: unknown): string {
  if (!(reason instanceof ControlApiError)) return "操作没有完成，请稍后重试。";
  if (reason.message === "control_api_unreachable") return "暂时无法连接控制服务。";
  return "体验码操作没有完成，请检查控制服务状态。";
}
