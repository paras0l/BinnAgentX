"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { createRun, getWorkspace, LearnerApiError } from "../lib/api";
import type { LearnerProfileInput, LearnerTaskView, LearnerWorkspaceView } from "../lib/contracts";
import { clearResumeRunId, loadResumeRunId, saveResumeRunId } from "../lib/draft-storage";
import { LearningWorkspace } from "./learning-workspace";

const DEFAULT_PROFILE: LearnerProfileInput = {
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
};

function errorMessage(error: unknown): string {
  return error instanceof LearnerApiError
    ? error.message
    : "当前步骤暂时不可用。你的本地草稿不会因此被清空。";
}

export function LearningExperience() {
  const [workspace, setWorkspace] = useState<LearnerWorkspaceView | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    const workflowRunId = loadResumeRunId();
    if (!workflowRunId) {
      queueMicrotask(() => {
        if (active) setResumeChecked(true);
      });
      return () => {
        active = false;
      };
    }
    void getWorkspace(workflowRunId)
      .then((value) => {
        if (active) setWorkspace(value);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        clearResumeRunId();
        setError(`上次训练未能恢复。${errorMessage(reason)}`);
      })
      .finally(() => {
        if (active) setResumeChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const startRun = useCallback((profile: LearnerProfileInput) => {
    setError(null);
    startTransition(async () => {
      try {
        const run = await createRun(profile);
        saveResumeRunId(run.workflow_run_id);
        setWorkspace(await getWorkspace(run.workflow_run_id));
      } catch (reason) {
        setError(errorMessage(reason));
      }
    });
  }, []);

  const replaceWorkspace = useCallback((next: LearnerWorkspaceView) => {
    setWorkspace(next);
    if (next.run.lifecycle === "completed") clearResumeRunId();
  }, []);

  const replaceTask = useCallback((task: LearnerTaskView) => {
    setWorkspace((current) => (current ? { ...current, task } : current));
  }, []);

  const reportError = useCallback((message: string | null) => setError(message), []);
  const startAgain = useCallback(() => {
    clearResumeRunId();
    setWorkspace(null);
    setError(null);
  }, []);

  if (!resumeChecked) {
    return (
      <main className="loading-shell" aria-busy="true">
        <p className="eyebrow">BinnAgent · 考研英语</p>
        <h1>正在恢复最近一次训练…</h1>
      </main>
    );
  }

  if (workspace?.run.lifecycle === "completed") {
    return (
      <main className="completion-shell">
        <p className="eyebrow">本次训练已完成</p>
        <h1>你完成了一次从阅读判断到亲自表达的闭环</h1>
        <p>这说明你本次做到了；是否形成稳定能力，还需要在新材料和延迟任务中再次确认。</p>
        <div className="completion-evidence" aria-label="本次完成证据">
          <span>两段独立校准</span>
          <span>匹配阅读与语义标记</span>
          <span>2–4 句亲自表达</span>
        </div>
        <button className="primary-button" type="button" onClick={startAgain}>
          返回首次背景
        </button>
      </main>
    );
  }

  return (
    <>
      {error ? (
        <div className="global-error" role="alert">
          {error}
        </div>
      ) : null}
      {workspace ? (
        <LearningWorkspace
          key={workspace.task?.task_id ?? workspace.run.stage}
          workspace={workspace}
          onWorkspaceChange={replaceWorkspace}
          onTaskChange={replaceTask}
          onError={reportError}
        />
      ) : (
        <OnboardingPanel isPending={isPending} onStart={startRun} />
      )}
    </>
  );
}

interface OnboardingPanelProps {
  isPending: boolean;
  onStart: (profile: LearnerProfileInput) => void;
}

function OnboardingPanel({ isPending, onStart }: OnboardingPanelProps) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  return (
    <main className="onboarding-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BinnAgent · 考研英语</p>
          <h1>语境实验室 × 表达实验室</h1>
        </div>
        <span className="environment-badge">电脑浏览器专属</span>
      </header>

      <section className="onboarding-grid" aria-labelledby="onboarding-title">
        <div className="onboarding-intro">
          <p className="step-label">首次背景 · 约 60 秒</p>
          <h2 id="onboarding-title">先确定训练边界，再让表现说话</h2>
          <p>只填写会改变本次任务负荷的信息。系统不会给出伪精确能力分，也不会替你完成答案。</p>
          <ul className="principle-list">
            <li>先独立阅读和表达</li>
            <li>需要时只给最小帮助</li>
            <li>进步由后续新材料确认</li>
          </ul>
        </div>

        <form
          className="profile-form"
          onSubmit={(event) => {
            event.preventDefault();
            onStart(profile);
          }}
        >
          <fieldset>
            <legend>你的考试与目标</legend>
            <div className="segmented-control">
              {(["english_1", "english_2"] as const).map((track) => (
                <label key={track}>
                  <input
                    type="radio"
                    name="exam-track"
                    checked={profile.exam_track === track}
                    onChange={() => setProfile((current) => ({ ...current, exam_track: track }))}
                  />
                  {track === "english_1" ? "英语一" : "英语二"}
                </label>
              ))}
            </div>
            <label className="field-row">
              <span>目标分数</span>
              <input
                type="number"
                min="0"
                max="100"
                value={profile.target_score}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    target_score: Number(event.target.value),
                  }))
                }
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>本周可用时间</legend>
            <label className="field-row">
              <span>每周学习分钟</span>
              <input
                type="number"
                min="30"
                max="10080"
                step="30"
                value={profile.weekly_minutes}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    weekly_minutes: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="field-row">
              <span>单次训练分钟</span>
              <input
                type="number"
                min="10"
                max="180"
                step="5"
                value={profile.session_minutes}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    session_minutes: Number(event.target.value),
                  }))
                }
              />
            </label>
          </fieldset>

          <label className="select-field">
            <span>你对当前阅读水平的判断</span>
            <select
              value={profile.self_reported_level}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  self_reported_level: event.target
                    .value as LearnerProfileInput["self_reported_level"],
                }))
              }
            >
              <option value="weak">经常读不懂长句或篇章关系</option>
              <option value="developing">能读懂大意，但证据和逻辑不稳定</option>
              <option value="steady">大多能独立判断，并能解释证据</option>
              <option value="unknown">暂时说不清，让任务来判断</option>
            </select>
          </label>

          <label className="check-field">
            <input
              type="checkbox"
              checked={profile.prior_exam_seen}
              onChange={(event) =>
                setProfile((current) => ({ ...current, prior_exam_seen: event.target.checked }))
              }
            />
            我做过完整的考研英语试卷
          </label>

          <button className="primary-button" type="submit" disabled={isPending}>
            {isPending ? "正在建立训练…" : "开始独立校准"}
          </button>
        </form>
      </section>
    </main>
  );
}
