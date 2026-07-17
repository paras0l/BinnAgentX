"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  BookOpenText,
  Books,
  CaretDown,
  SidebarSimple,
  SlidersHorizontal,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react";

import {
  continueRun,
  createRun,
  getResumeWorkspace,
  getWorkspace,
  LearnerApiError,
} from "../lib/api";
import type { LearnerProfileInput, LearnerTaskView, LearnerWorkspaceView } from "../lib/contracts";
import { clearResumeRunId, loadResumeRunId, saveResumeRunId } from "../lib/draft-storage";
import {
  DEFAULT_PREFERENCES,
  type CompletedSessionRecord,
  type LearnerExperienceState,
  type LearnerPreferences,
  loadExperience,
  recordCompletedSession,
  recordTemporaryTask,
  saveExperienceProfile,
  saveLearnerPreferences,
} from "../lib/experience-storage";
import type { LearnerIdentity } from "../lib/auth-api";
import {
  addLearningAsset,
  loadLearningAssets,
  reviewLearningAsset,
  setLearningAssetMastery,
  toggleLearningAssetStar,
  type LearningAssetInput,
} from "../lib/learning-assets-storage";
import { LearningAssetsPanel } from "./learning-assets-panel";
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

const TRAINING_STAGE_LABELS: Record<LearnerWorkspaceView["run"]["stage"], string> = {
  calibration_a: "校准 A",
  calibration_b: "校准 B",
  matched_reading: "匹配阅读",
  micro_expression: "微型表达",
  wrap_up: "本次收尾",
  completed: "已完成",
};

const FIRST_EXPERIENCE_STAGE_ORDER = [
  "calibration_a",
  "calibration_b",
  "matched_reading",
  "micro_expression",
  "wrap_up",
] as const;

const PRACTICE_STAGE_ORDER = ["matched_reading", "micro_expression", "wrap_up"] as const;

function errorMessage(error: unknown): string {
  return error instanceof LearnerApiError
    ? error.message
    : "当前步骤暂时不可用。你的本地草稿不会因此被清空。";
}

export function completedStageProgress(stageIndex: number, stageCount: number): number {
  if (stageIndex <= 0) return 0;
  return Math.round((stageIndex / Math.max(stageCount - 1, 1)) * 100);
}

export function LearningExperience({
  identity,
  onLogout,
}: {
  identity: LearnerIdentity;
  onLogout: () => void;
}) {
  const [workspace, setWorkspace] = useState<LearnerWorkspaceView | null>(null);
  const [experience, setExperience] = useState<LearnerExperienceState | null>(() =>
    loadExperience(identity.learner_id),
  );
  const [calibrationDeferred, setCalibrationDeferred] = useState(false);
  const [learningAssets, setLearningAssets] = useState(() =>
    loadLearningAssets(identity.learner_id),
  );
  const [surface, setSurface] = useState<
    "home" | "training" | "profile" | "profile-edit" | "preferences" | "assets"
  >("home");
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return localStorage.getItem("binnagent:learner-nav-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [resumeChecked, setResumeChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    const workflowRunId = loadResumeRunId(identity.learner_id);
    if (!workflowRunId) {
      queueMicrotask(() => {
        if (active) setResumeChecked(true);
      });
      return () => {
        active = false;
      };
    }
    void getResumeWorkspace(workflowRunId)
      .then((value) => {
        if (!active) return;
        if (value.available && value.workspace) {
          setWorkspace(value.workspace);
          setSurface("training");
        } else {
          clearResumeRunId(identity.learner_id);
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        clearResumeRunId(identity.learner_id);
        setError(`上次训练未能恢复。${errorMessage(reason)}`);
      })
      .finally(() => {
        if (active) setResumeChecked(true);
      });
    return () => {
      active = false;
    };
  }, [identity.learner_id]);

  const startFirstRun = useCallback(
    (profile: LearnerProfileInput) => {
      setError(null);
      startTransition(async () => {
        try {
          const run = await createRun(profile);
          setExperience(saveExperienceProfile(identity.learner_id, profile));
          setCalibrationDeferred(false);
          setSurface("training");
          saveResumeRunId(identity.learner_id, run.workflow_run_id);
          setWorkspace(await getWorkspace(run.workflow_run_id));
        } catch (reason) {
          setError(errorMessage(reason));
        }
      });
    },
    [identity.learner_id],
  );

  const startPractice = useCallback(
    (workflowRunId: string, runVersion: number) => {
      setError(null);
      startTransition(async () => {
        try {
          const run = await continueRun(workflowRunId, runVersion);
          setSurface("training");
          saveResumeRunId(identity.learner_id, run.workflow_run_id);
          setWorkspace(await getWorkspace(run.workflow_run_id));
        } catch (reason) {
          setError(errorMessage(reason));
        }
      });
    },
    [identity.learner_id],
  );

  const replaceWorkspace = useCallback(
    (next: LearnerWorkspaceView) => {
      setWorkspace(next);
      if (next.run.lifecycle === "completed") {
        clearResumeRunId(identity.learner_id);
        if (experience?.profile) {
          setExperience(recordCompletedSession(identity.learner_id, next.run, experience.profile));
        }
      }
    },
    [experience, identity.learner_id],
  );

  const replaceTask = useCallback((task: LearnerTaskView) => {
    setWorkspace((current) => (current ? { ...current, task } : current));
  }, []);

  const reportError = useCallback((message: string | null) => setError(message), []);
  const returnHome = useCallback(() => {
    clearResumeRunId(identity.learner_id);
    setWorkspace(null);
    setSurface("home");
    setError(null);
  }, [identity.learner_id]);

  const saveProfileOnly = useCallback(
    (profile: LearnerProfileInput) => {
      if (calibrationDeferred) {
        setExperience((current) => (current ? { ...current, profile } : current));
        setSurface("profile");
        return;
      }
      setExperience(saveExperienceProfile(identity.learner_id, profile));
      setSurface("profile");
    },
    [calibrationDeferred, identity.learner_id],
  );

  const savePreferences = useCallback(
    (preferences: LearnerPreferences) => {
      if (calibrationDeferred) {
        setExperience((current) => (current ? { ...current, preferences } : current));
        setSurface("preferences");
        return;
      }
      setExperience(saveLearnerPreferences(identity.learner_id, preferences));
      setSurface("preferences");
    },
    [calibrationDeferred, identity.learner_id],
  );

  const deferCalibration = useCallback((profile: LearnerProfileInput) => {
    setExperience({
      schemaVersion: 1,
      profile,
      sessions: [],
      preferences: DEFAULT_PREFERENCES,
      temporaryTasksCompleted: 0,
    });
    setCalibrationDeferred(true);
    setSurface("home");
    setError(null);
  }, []);

  const completeTemporaryTask = useCallback(() => {
    setExperience(recordTemporaryTask(identity.learner_id));
  }, [identity.learner_id]);

  const captureLearningAsset = useCallback(
    (input: LearningAssetInput) => {
      setLearningAssets((current) => addLearningAsset(identity.learner_id, current, input));
    },
    [identity.learner_id],
  );

  const toggleNavigation = useCallback(() => {
    setNavCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem("binnagent:learner-nav-collapsed", String(next));
      } catch {
        // The collapse preference can safely remain in memory.
      }
      return next;
    });
  }, []);

  if (!resumeChecked) {
    return (
      <main className="loading-shell" aria-busy="true">
        <p className="eyebrow">BinnAgent · 考研英语</p>
        <h1>正在恢复最近一次训练…</h1>
      </main>
    );
  }

  let content;
  if (surface === "assets" && experience) {
    content = (
      <LearningAssetsPanel
        state={learningAssets}
        onAdd={captureLearningAsset}
        onReview={(assetId) =>
          setLearningAssets((current) => reviewLearningAsset(identity.learner_id, current, assetId))
        }
        onToggleStar={(assetId) =>
          setLearningAssets((current) =>
            toggleLearningAssetStar(identity.learner_id, current, assetId),
          )
        }
        onMaster={(assetId, mastery) =>
          setLearningAssets((current) =>
            setLearningAssetMastery(identity.learner_id, current, assetId, mastery),
          )
        }
      />
    );
  } else if (surface === "profile" && experience) {
    content = (
      <LearnerProfilePanel
        experience={experience}
        onEdit={() => setSurface("profile-edit")}
        onBack={() => setSurface(workspace ? "training" : "home")}
      />
    );
  } else if (surface === "preferences" && experience) {
    content = (
      <PreferencesPanel
        preferences={experience.preferences ?? DEFAULT_PREFERENCES}
        onSave={savePreferences}
        onBack={() => setSurface(workspace ? "training" : "home")}
      />
    );
  } else if (surface === "profile-edit" && experience) {
    content = (
      <OnboardingPanel
        initialProfile={experience.profile}
        isEditing
        isPending={isPending}
        onCancel={() => setSurface("profile")}
        onStart={saveProfileOnly}
      />
    );
  } else if (workspace?.run.lifecycle === "completed" && surface === "training") {
    content = (
      <CompletionPanel
        workspace={workspace}
        isPending={isPending}
        onContinue={() => startPractice(workspace.run.workflow_run_id, workspace.run.version)}
        onHome={returnHome}
      />
    );
  } else if (workspace && surface === "training") {
    content = (
      <LearningWorkspace
        key={workspace.task?.task_id ?? workspace.run.stage}
        workspace={workspace}
        onWorkspaceChange={replaceWorkspace}
        onTaskChange={replaceTask}
        onError={reportError}
        preferences={experience?.preferences ?? DEFAULT_PREFERENCES}
        onTemporaryTaskComplete={completeTemporaryTask}
        onLearningAssetCapture={captureLearningAsset}
      />
    );
  } else if (experience) {
    content = (
      <LearningHome
        experience={experience}
        calibrationDeferred={calibrationDeferred}
        isPending={isPending}
        onContinue={(session) => startPractice(session.workflowRunId, session.runVersion)}
        onStartFirst={() => startFirstRun(experience.profile)}
        onOpenProfile={() => setSurface("profile")}
        onOpenPreferences={() => setSurface("preferences")}
      />
    );
  } else {
    content = (
      <OnboardingPanel
        initialProfile={DEFAULT_PROFILE}
        isEditing={false}
        isPending={isPending}
        onStart={startFirstRun}
        onDefer={deferCalibration}
      />
    );
  }

  const isTrainingSurface = surface === "training" && Boolean(workspace);
  const usesLeftRail = Boolean(experience);
  const trainingStageOrder =
    workspace && (workspace.run.run_kind ?? "first_experience") === "practice"
      ? PRACTICE_STAGE_ORDER
      : FIRST_EXPERIENCE_STAGE_ORDER;
  const trainingStageIndex = workspace
    ? workspace.run.stage === "completed"
      ? trainingStageOrder.length - 1
      : trainingStageOrder.findIndex((stage) => stage === workspace.run.stage)
    : -1;
  const trainingProgress = completedStageProgress(trainingStageIndex, trainingStageOrder.length);
  const surfaceTitle = {
    home: "学习首页",
    training: "当前训练",
    profile: "学习画像",
    "profile-edit": "更新画像",
    preferences: "偏好设置",
    assets: "学习资产",
  }[surface];

  return (
    <div
      className={`experience-frame${usesLeftRail ? " training-frame" : ""}${navCollapsed ? " nav-collapsed" : ""}`}
    >
      <header className="account-bar" aria-label="当前学习账号">
        <div className="account-brand" aria-label="BinnAgent">
          B
        </div>
        <nav className="account-navigation" aria-label="学习功能导航">
          <button
            type="button"
            className={surface === "home" || surface === "training" ? "selected" : ""}
            aria-label={workspace ? "当前训练" : "学习首页"}
            onClick={() => setSurface(workspace ? "training" : "home")}
          >
            <BookOpenText size={22} weight={surface === "training" ? "fill" : "regular"} />
            <span>{workspace ? "训练" : "首页"}</span>
          </button>
          {experience ? (
            <>
              <button
                type="button"
                className={surface === "assets" ? "selected" : ""}
                aria-label="学习资产"
                onClick={() => setSurface("assets")}
              >
                <Books size={22} weight={surface === "assets" ? "fill" : "regular"} />
                <span>资产</span>
              </button>
              <button
                type="button"
                className={surface === "profile" || surface === "profile-edit" ? "selected" : ""}
                aria-label="学习画像"
                onClick={() => setSurface("profile")}
              >
                <UserCircle size={22} weight={surface === "profile" ? "fill" : "regular"} />
                <span>画像</span>
              </button>
              <button
                type="button"
                className={surface === "preferences" ? "selected" : ""}
                aria-label="偏好设置"
                onClick={() => setSurface("preferences")}
              >
                <SlidersHorizontal
                  size={22}
                  weight={surface === "preferences" ? "fill" : "regular"}
                />
                <span>偏好</span>
              </button>
            </>
          ) : null}
        </nav>
        {experience ? (
          <button
            type="button"
            className="navigation-collapse"
            aria-label={navCollapsed ? "展开左侧导航" : "收起左侧导航"}
            aria-expanded={!navCollapsed}
            onClick={toggleNavigation}
          >
            <SidebarSimple size={19} />
            <span>{navCollapsed ? "展开" : "收起"}</span>
          </button>
        ) : null}
        <div className="account-bar-identity">
          <span>
            <strong>{identity.nickname}</strong>
            <small>{identity.account_type === "experience" ? "体验账号" : identity.email}</small>
          </span>
          <button type="button" onClick={onLogout} aria-label="退出登录">
            <SignOut size={16} />
            <span>退出登录</span>
          </button>
        </div>
      </header>
      {usesLeftRail ? (
        <header className="training-location-bar" aria-label="当前页面位置">
          <div className="training-breadcrumb">
            <strong>
              {isTrainingSurface && workspace
                ? TRAINING_STAGE_LABELS[workspace.run.stage]
                : surfaceTitle}
            </strong>
            {isTrainingSurface && workspace ? (
              <>
                <span aria-hidden="true">/</span>
                <button type="button" aria-label="查看当前训练阶段">
                  {workspace.material?.content_type === "micro_expression"
                    ? "表达训练"
                    : "匹配阅读"}
                  <CaretDown size={13} />
                </button>
              </>
            ) : (
              <span className="surface-location-note">你的数据仅保存在当前账号空间</span>
            )}
          </div>
          {isTrainingSurface && workspace ? (
            <div className="training-session-status">
              <span>{workspace.task?.attempts.length ? "版本已同步" : "本步数据已连接"}</span>
              <span>
                第 {Math.max(trainingStageIndex + 1, 1)} / {trainingStageOrder.length} 步
              </span>
              <span className="training-progress-track" aria-hidden="true">
                <i style={{ width: `${trainingProgress}%` }} />
              </span>
              <strong>{trainingProgress}%</strong>
            </div>
          ) : null}
        </header>
      ) : null}
      {error ? (
        <div className="global-error" role="alert">
          {error}
        </div>
      ) : null}
      <div className={usesLeftRail ? "training-content" : "experience-content"}>{content}</div>
    </div>
  );
}

interface LearningHomeProps {
  experience: LearnerExperienceState;
  calibrationDeferred: boolean;
  isPending: boolean;
  onContinue: (session: CompletedSessionRecord) => void;
  onStartFirst: () => void;
  onOpenProfile: () => void;
  onOpenPreferences: () => void;
}

function LearningHome({
  experience,
  calibrationDeferred,
  isPending,
  onContinue,
  onStartFirst,
  onOpenProfile,
  onOpenPreferences,
}: LearningHomeProps) {
  const [renderedAt] = useState(() => Date.now());
  const { profile, sessions } = experience;
  const latest = sessions[0];
  const sevenDaysAgo = renderedAt - 7 * 24 * 60 * 60 * 1000;
  const recentSessions = sessions.filter(
    (session) => new Date(session.completedAt).getTime() >= sevenDaysAgo,
  );
  const practicedMinutes = recentSessions.length * profile.session_minutes;
  const weeklyPercent = Math.min(
    100,
    Math.round((practicedMinutes / profile.weekly_minutes) * 100),
  );
  const independentSessions = sessions.filter((session) => session.supportedTaskCount === 0).length;

  return (
    <main className="home-shell">
      <header className="home-topbar">
        <div>
          <p className="eyebrow">BinnAgent · 学习首页</p>
          <h1>语境实验室 × 表达实验室</h1>
        </div>
        <div className="home-topbar-actions">
          <button type="button" className="quiet-button" onClick={onOpenProfile}>
            查看学习画像
          </button>
          <button type="button" className="quiet-button" onClick={onOpenPreferences}>
            偏好设置
          </button>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="next-session-title">
        <div>
          {calibrationDeferred ? (
            <p className="calibration-deferred-note" role="status">
              本次先浏览，尚未形成校准记录；下次登录仍会重新邀请你完成独立校准。
            </p>
          ) : null}
          <p className="step-label">熟悉阶段 · 下一次训练</p>
          <h2 id="next-session-title">
            {latest ? "换一篇新材料，继续验证读写迁移" : "从两段短阅读找到合适起点"}
          </h2>
          <p>
            {latest
              ? recommendationFor(latest.difficultyRating)
              : "首次会先做两段轻量校准，再进入匹配阅读与亲自表达。"}
          </p>
          <button
            className="primary-button strong-action"
            type="button"
            onClick={() => (latest ? onContinue(latest) : onStartFirst())}
            disabled={isPending}
          >
            {isPending
              ? latest
                ? "正在准备新材料…"
                : "正在建立训练…"
              : latest
                ? "开始下一次训练"
                : "开始独立校准"}
          </button>
        </div>
        <dl className="session-brief">
          <div>
            <dt>考试方向</dt>
            <dd>{profile.exam_track === "english_1" ? "英语一" : "英语二"}</dd>
          </div>
          <div>
            <dt>本次时长</dt>
            <dd>约 {profile.session_minutes} 分钟</dd>
          </div>
          <div>
            <dt>反馈方式</dt>
            <dd>先独立，按需最小介入</dd>
          </div>
        </dl>
      </section>

      <section className="home-grid">
        <article className="weekly-card">
          <p className="step-label">本机近 7 天</p>
          <div className="weekly-heading">
            <h2>{practicedMinutes} 分钟</h2>
            <span>计划 {profile.weekly_minutes} 分钟</span>
          </div>
          <div className="weekly-track" aria-label={`近 7 天计划完成 ${weeklyPercent}%`}>
            <span style={{ width: `${weeklyPercent}%` }} />
          </div>
          <p>这里只汇总当前浏览器中已完成的训练，不把时长当作能力提升。</p>
        </article>
        <article className="evidence-card">
          <p className="step-label">累计体验证据</p>
          <div className="evidence-numbers">
            <span>
              <strong>{sessions.length}</strong>次完整闭环
            </span>
            <span>
              <strong>{independentSessions}</strong>次全程 H0
            </span>
          </div>
          <p>稳定进步仍需要新材料、延迟和无提示表现共同确认。</p>
        </article>
        <article className="intelligence-card">
          <p className="step-label">智能协作记录</p>
          <div className="evidence-numbers">
            <span>
              <strong>{experience.temporaryTasksCompleted}</strong>次临时任务
            </span>
            <span>
              <strong>{experience.preferences.showDecisionTrace ? "开" : "关"}</strong>依据轨迹
            </span>
          </div>
          <p>辅助只在你需要时介入，并保留它为何出现、引用了什么以及仍不确定什么。</p>
        </article>
      </section>

      <section className="history-section" aria-labelledby="history-title">
        <div className="section-heading">
          <div>
            <p className="step-label">最近训练</p>
            <h2 id="history-title">每次都保留帮助等级与材料变化</h2>
          </div>
          <span>仅保存在此电脑</span>
        </div>
        {sessions.length > 0 ? (
          <div className="history-list">
            {sessions.slice(0, 5).map((session, index) => (
              <article key={session.workflowRunId}>
                <span className="history-index">
                  {String(sessions.length - index).padStart(2, "0")}
                </span>
                <div>
                  <h3>
                    {session.runKind === "first_experience" ? "首次读写校准" : "新材料读写训练"}
                  </h3>
                  <p>
                    {formatSessionDate(session.completedAt)} ·{" "}
                    {difficultyLabel(session.difficultyRating)}
                  </p>
                </div>
                <div className="history-evidence">
                  <span>{session.completedTaskCount} 个任务</span>
                  <span>
                    {session.supportedTaskCount > 0
                      ? `${session.supportedTaskCount} 个任务用过帮助`
                      : "全程 H0"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-history">完成第一轮后，这里会出现可回看的训练证据。</div>
        )}
      </section>
    </main>
  );
}

function CompletionPanel({
  workspace,
  isPending,
  onContinue,
  onHome,
}: {
  workspace: LearnerWorkspaceView;
  isPending: boolean;
  onContinue: () => void;
  onHome: () => void;
}) {
  const firstExperience = (workspace.run.run_kind ?? "first_experience") === "first_experience";
  const supportedTasks = workspace.run.task_refs.filter(
    (task) => (task.highest_hint_level ?? 0) > 0,
  ).length;
  return (
    <main className="completion-shell">
      <p className="eyebrow">本次训练已完成</p>
      <h1>你完成了一次从阅读判断到亲自表达的闭环</h1>
      <p>这说明你本次做到了；是否形成稳定能力，还需要在新材料和延迟任务中再次确认。</p>
      <div className="completion-evidence" aria-label="本次完成证据">
        {firstExperience ? <span>两段校准已完成</span> : <span>已更换阅读材料</span>}
        <span>匹配阅读与语义标记</span>
        <span>
          {supportedTasks > 0 ? `${supportedTasks} 个任务使用最小帮助` : "全部任务保持 H0"}
        </span>
        <span>英文表达由你亲自完成</span>
      </div>
      <section className="completion-next">
        <p className="step-label">下一步已经就绪</p>
        <h2>{recommendationFor(workspace.run.difficulty_rating)}</h2>
        <p>下一次会避开刚完成的阅读材料，从匹配阅读直接开始，不重复首次背景和校准。</p>
      </section>
      <div className="completion-actions">
        <button className="quiet-button" type="button" onClick={onHome} disabled={isPending}>
          返回学习首页
        </button>
        <button
          className="primary-button strong-action"
          type="button"
          onClick={onContinue}
          disabled={isPending}
        >
          {isPending ? "正在准备新材料…" : "继续下一次训练"}
        </button>
      </div>
    </main>
  );
}

function recommendationFor(rating: string | null): string {
  if (rating === "too_hard") return "下一次降低综合负荷，继续练清证据关系。";
  if (rating === "too_easy") return "下一次增加一个挑战维度，检查理解能否迁移。";
  return "下一次保持当前负荷，用新材料再次确认。";
}

function difficultyLabel(rating: string | null): string {
  if (rating === "too_hard") return "上次反馈偏困难";
  if (rating === "too_easy") return "上次反馈偏简单";
  if (rating === "matched") return "上次反馈刚刚好";
  return "上次未评价难度";
}

function formatSessionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待确认";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function LearnerProfilePanel({
  experience,
  onEdit,
  onBack,
}: {
  experience: LearnerExperienceState;
  onEdit: () => void;
  onBack: () => void;
}) {
  const { profile, sessions } = experience;
  const completedTasks = sessions.reduce((sum, session) => sum + session.completedTaskCount, 0);
  const supportedTasks = sessions.reduce((sum, session) => sum + session.supportedTaskCount, 0);
  const independence =
    completedTasks > 0 ? Math.round(((completedTasks - supportedTasks) / completedTasks) * 100) : 0;
  const evidenceLevel =
    sessions.length >= 6 ? "形成趋势" : sessions.length >= 2 ? "正在积累" : "证据不足";

  return (
    <main className="insight-shell">
      <header className="insight-heading">
        <div>
          <p className="eyebrow">学习画像 · 只基于真实训练证据</p>
          <h1>你的读写学习画像</h1>
          <p>画像描述当前可观察到的学习行为，不预测分数，也不把一次表现写成固定能力。</p>
        </div>
        <button type="button" className="quiet-button" onClick={onBack}>
          返回
        </button>
      </header>

      <section className="profile-overview" aria-label="画像概览">
        <article>
          <span>证据状态</span>
          <strong>{evidenceLevel}</strong>
          <p>{sessions.length} 次完整训练闭环</p>
        </article>
        <article>
          <span>独立完成比例</span>
          <strong>{independence}%</strong>
          <p>按任务是否使用过帮助计算，不代表正确率</p>
        </article>
        <article>
          <span>临时迁移任务</span>
          <strong>{experience.temporaryTasksCompleted}</strong>
          <p>用于检验刚学方法能否离开原题使用</p>
        </article>
      </section>

      <section className="profile-evidence-grid">
        <article className="profile-dimension-card">
          <p className="step-label">当前可观察倾向</p>
          <h2>
            {profile.self_reported_level === "steady"
              ? "能独立推进，下一步需要验证稳定性"
              : "正在建立证据定位与解释的稳定链条"}
          </h2>
          <ul>
            <li>
              <strong>阅读证据：</strong>
              {completedTasks > 0 ? `已留下 ${completedTasks} 个已完成任务` : "尚无完整任务证据"}
            </li>
            <li>
              <strong>求助方式：</strong>
              {supportedTasks > 0
                ? `${supportedTasks} 个任务使用过最小帮助`
                : "目前没有使用帮助的完成记录"}
            </li>
            <li>
              <strong>训练边界：</strong>目标 {profile.target_score} 分，每次约{" "}
              {profile.session_minutes} 分钟
            </li>
          </ul>
        </article>
        <article className="profile-dimension-card next-focus-card">
          <p className="step-label">下一步最值得观察</p>
          <h2>{sessions.length < 2 ? "先积累第二次新材料表现" : "检查无提示表现能否跨材料保持"}</h2>
          <p>系统会优先寻找“新材料、低帮助、延迟后仍能完成”的组合证据，再更新画像。</p>
          <div className="trace-note">
            <span>画像更新规则</span>
            <strong>完成新任务 → 记录帮助等级 → 跨材料比较</strong>
          </div>
        </article>
      </section>

      <footer className="insight-actions">
        <p>自报信息只决定训练起点，后续以真实行为证据为准。</p>
        <button type="button" className="primary-button" onClick={onEdit}>
          修改目标与训练边界
        </button>
      </footer>
    </main>
  );
}

function PreferencesPanel({
  preferences,
  onSave,
  onBack,
}: {
  preferences: LearnerPreferences;
  onSave: (preferences: LearnerPreferences) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(preferences);
  return (
    <main className="insight-shell preferences-shell">
      <header className="insight-heading">
        <div>
          <p className="eyebrow">偏好设置 · 控制智能介入方式</p>
          <h1>让辅助按你的节奏出现</h1>
          <p>这些设置只改变呈现和介入节奏，不改变题目难度，也不会替你完成答案。</p>
        </div>
        <button type="button" className="quiet-button" onClick={onBack}>
          取消
        </button>
      </header>
      <form
        className="preferences-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
      >
        <fieldset>
          <legend>智能辅助</legend>
          <label className="setting-row">
            <span>
              <strong>行内辅助出现方式</strong>
              <small>选中原文后，系统何时显示帮助入口</small>
            </span>
            <select
              value={draft.assistanceMode}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  assistanceMode: event.target.value as LearnerPreferences["assistanceMode"],
                })
              }
            >
              <option value="ask_first">由我点击后展开</option>
              <option value="proactive">主动展示一个建议</option>
              <option value="quiet">保持安静，只保留标记</option>
            </select>
          </label>
          <label className="setting-row">
            <span>
              <strong>反馈详细程度</strong>
              <small>控制纠偏卡片解释到什么深度</small>
            </span>
            <select
              value={draft.feedbackDetail}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  feedbackDetail: event.target.value as LearnerPreferences["feedbackDetail"],
                })
              }
            >
              <option value="concise">一句话</option>
              <option value="balanced">关键依据 + 下一步</option>
              <option value="detailed">完整依据轨迹</option>
            </select>
          </label>
          <label className="setting-row">
            <span>
              <strong>纠偏语气</strong>
              <small>内容标准不变，只调整表达方式</small>
            </span>
            <select
              value={draft.correctionTone}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  correctionTone: event.target.value as LearnerPreferences["correctionTone"],
                })
              }
            >
              <option value="gentle">温和提示</option>
              <option value="direct">直接指出</option>
            </select>
          </label>
          <PreferenceToggle
            label="展示判断依据"
            detail="显示观察、规则、建议和不确定性；不展示隐藏思维链"
            checked={draft.showDecisionTrace}
            onChange={(checked) => setDraft({ ...draft, showDecisionTrace: checked })}
          />
          <PreferenceToggle
            label="允许临时任务"
            detail="在当前任务旁插入 1–3 分钟迁移练习，可随时退出"
            checked={draft.temporaryTasksEnabled}
            onChange={(checked) => setDraft({ ...draft, temporaryTasksEnabled: checked })}
          />
        </fieldset>
        <fieldset>
          <legend>阅读体验</legend>
          <label className="setting-row">
            <span>
              <strong>页面留白</strong>
              <small>调整正文行距与信息密度</small>
            </span>
            <select
              value={draft.readingComfort}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  readingComfort: event.target.value as LearnerPreferences["readingComfort"],
                })
              }
            >
              <option value="compact">紧凑</option>
              <option value="comfortable">舒适</option>
              <option value="spacious">宽松</option>
            </select>
          </label>
          <PreferenceToggle
            label="减少动态效果"
            detail="关闭非必要的位移和过渡动画"
            checked={draft.reducedMotion}
            onChange={(checked) => setDraft({ ...draft, reducedMotion: checked })}
          />
        </fieldset>
        <footer className="preferences-actions">
          <p>偏好只保存在当前浏览器的此账号下。</p>
          <button className="primary-button strong-action" type="submit">
            保存偏好
          </button>
        </footer>
      </form>
    </main>
  );
}

function PreferenceToggle({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="setting-row toggle-setting">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

interface OnboardingPanelProps {
  initialProfile: LearnerProfileInput;
  isEditing: boolean;
  isPending: boolean;
  onStart: (profile: LearnerProfileInput) => void;
  onDefer?: (profile: LearnerProfileInput) => void;
  onCancel?: () => void;
}

function OnboardingPanel({
  initialProfile,
  isEditing,
  isPending,
  onStart,
  onDefer,
  onCancel,
}: OnboardingPanelProps) {
  const [profile, setProfile] = useState(initialProfile);

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
          <p className="step-label">{isEditing ? "更新训练边界" : "首次背景 · 约 60 秒"}</p>
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

          <div className="profile-actions">
            {onCancel ? (
              <button
                className="quiet-button"
                type="button"
                onClick={onCancel}
                disabled={isPending}
              >
                返回学习首页
              </button>
            ) : null}
            <div className="calibration-primary-actions">
              <button className="primary-button strong-action" type="submit" disabled={isPending}>
                {isPending ? "正在建立训练…" : isEditing ? "保存并重新校准" : "开始独立校准"}
              </button>
              {!isEditing && onDefer ? (
                <button
                  className="calibration-defer-button"
                  type="button"
                  disabled={isPending}
                  onClick={() => onDefer(profile)}
                >
                  下次再说
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
