"use client";

import { useEffect, useState, useTransition } from "react";

import {
  AuthApiError,
  confirmEmailCode,
  loginAccount,
  loginWithExperienceCode,
  lookupAccounts,
  registerAccount,
  requestEmailCode,
  type LearnerAccount,
  type LearnerIdentity,
} from "../lib/auth-api";

interface LoginExperienceProps {
  serviceError: string | null;
  onRetry: () => void;
  onAuthenticated: (identity: LearnerIdentity) => void;
}

export function LoginExperience({ serviceError, onRetry, onAuthenticated }: LoginExperienceProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<LearnerAccount[] | null>(null);
  const [nickname, setNickname] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [experienceCode, setExperienceCode] = useState("");
  const [experienceUsername, setExperienceUsername] = useState("");
  const [experienceError, setExperienceError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(
      () => setResendSeconds((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const sendCode = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await requestEmailCode(email);
        setCodeRequested(true);
        setResendSeconds(result.resend_after_seconds);
      } catch (reason) {
        setError(authErrorMessage(reason));
      }
    });
  };

  const verifyCode = () => {
    setError(null);
    startTransition(async () => {
      try {
        const confirmed = await confirmEmailCode(email, code);
        const found = await lookupAccounts(email, confirmed.verification_token);
        setVerificationToken(confirmed.verification_token);
        setAccounts(found.accounts);
      } catch (reason) {
        setError(authErrorMessage(reason));
      }
    });
  };

  const chooseAccount = (learnerId: string) => {
    if (!verificationToken) return;
    setError(null);
    startTransition(async () => {
      try {
        onAuthenticated(await loginAccount(email, verificationToken, learnerId));
      } catch (reason) {
        setError(authErrorMessage(reason));
      }
    });
  };

  const register = () => {
    if (!verificationToken) return;
    setError(null);
    startTransition(async () => {
      try {
        onAuthenticated(await registerAccount(email, verificationToken, nickname, inviteCode));
      } catch (reason) {
        setError(authErrorMessage(reason));
      }
    });
  };

  const enterExperience = () => {
    setExperienceError(null);
    startTransition(async () => {
      try {
        onAuthenticated(await loginWithExperienceCode(experienceCode, experienceUsername));
      } catch (reason) {
        setExperienceError(authErrorMessage(reason));
      }
    });
  };

  return (
    <main className="login-shell">
      <section className="login-intro">
        <p className="eyebrow">BinnAgent · 考研英语</p>
        <h1>把每一次独立完成，积累成可验证的进步</h1>
        <p>邮箱只用于确认账号。进入后先独立阅读与表达，需要时再获得最小帮助。</p>
        <div className="login-principles" aria-label="学习原则">
          <span>新材料复测</span>
          <span>帮助等级留痕</span>
          <span>不代写答案</span>
        </div>
      </section>

      <section className="login-card" aria-labelledby="login-title">
        <p className="step-label">{accounts === null ? "邮箱验证" : "选择学习账号"}</p>
        <h2 id="login-title">{accounts === null ? "登录或创建学习账号" : email}</h2>

        {serviceError ? (
          <div className="auth-error" role="alert">
            <span>{serviceError}</span>
            <button type="button" onClick={onRetry}>
              重试连接
            </button>
          </div>
        ) : null}
        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : null}

        {accounts === null ? (
          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (codeRequested) verifyCode();
              else sendCode();
            }}
          >
            <label>
              <span>邮箱</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                disabled={codeRequested}
              />
            </label>
            {codeRequested ? (
              <label>
                <span>6 位验证码</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  required
                  autoFocus
                />
              </label>
            ) : null}
            <button
              className="primary-button strong-action"
              type="submit"
              disabled={isPending || (codeRequested && code.length !== 6)}
            >
              {isPending ? "请稍候…" : codeRequested ? "验证并继续" : "获取验证码"}
            </button>
            <p className="login-assurance">
              {codeRequested ? `验证码已发送至 ${email}` : "无需密码 · 验证码 10 分钟内有效"}
            </p>
            {codeRequested ? (
              <button
                className="text-button"
                type="button"
                onClick={sendCode}
                disabled={isPending || resendSeconds > 0}
              >
                {resendSeconds > 0 ? `${resendSeconds} 秒后可重发` : "重新发送验证码"}
              </button>
            ) : null}
          </form>
        ) : (
          <div className="account-picker">
            {accounts.length > 0 ? (
              <div className="account-list">
                {accounts.map((account) => (
                  <button
                    type="button"
                    key={account.learner_id}
                    onClick={() => chooseAccount(account.learner_id)}
                    disabled={isPending}
                  >
                    <span>{account.nickname}</span>
                    <small>继续这个账号</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-account">这个邮箱还没有学习账号，填写昵称和邀请码即可开始。</p>
            )}
            <form
              className="register-form"
              onSubmit={(event) => {
                event.preventDefault();
                register();
              }}
            >
              <h3>{accounts.length > 0 ? "创建另一个学习账号" : "创建学习账号"}</h3>
              <label>
                <span>昵称</span>
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  autoComplete="nickname"
                  required
                  maxLength={100}
                />
              </label>
              <label>
                <span>邀请码</span>
                <input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder="BINN-…"
                  required
                  maxLength={32}
                />
              </label>
              <button className="quiet-button" type="submit" disabled={isPending}>
                {isPending ? "正在创建…" : "创建并进入"}
              </button>
            </form>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setAccounts(null);
                setVerificationToken(null);
                setCode("");
                setCodeRequested(false);
                setResendSeconds(0);
              }}
            >
              更换邮箱
            </button>
          </div>
        )}
      </section>

      {experienceOpen ? (
        <section
          className="experience-login-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="experience-login-title"
        >
          <div>
            <p className="step-label">快速体验</p>
            <button
              type="button"
              className="experience-login-close"
              aria-label="关闭体验码登录"
              onClick={() => setExperienceOpen(false)}
            >
              ×
            </button>
          </div>
          <h2 id="experience-login-title">体验码直接进入</h2>
          <p>不验证邮箱。使用相同体验码和用户名，可回到之前的体验进度。</p>
          {experienceError ? (
            <div className="experience-login-error" role="alert">
              {experienceError}
            </div>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              enterExperience();
            }}
          >
            <label>
              <span>体验码</span>
              <input
                value={experienceCode}
                onChange={(event) => setExperienceCode(event.target.value.toUpperCase())}
                placeholder="TRY-…"
                autoComplete="off"
                maxLength={32}
                required
                autoFocus
              />
            </label>
            <label>
              <span>用户名</span>
              <input
                value={experienceUsername}
                onChange={(event) => setExperienceUsername(event.target.value)}
                placeholder="例如：小林"
                autoComplete="nickname"
                maxLength={100}
                required
              />
            </label>
            <button className="primary-button strong-action" type="submit" disabled={isPending}>
              {isPending ? "正在进入…" : "进入体验"}
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        className="experience-entry-link"
        aria-expanded={experienceOpen}
        onClick={() => setExperienceOpen((current) => !current)}
      >
        有体验码？直接体验
      </button>
    </main>
  );
}

function authErrorMessage(reason: unknown): string {
  if (!(reason instanceof AuthApiError)) return "请求没有完成，请稍后再试。";
  const messages: Record<string, string> = {
    valid_email_required: "请输入有效邮箱地址。",
    verification_resend_too_soon: "验证码刚刚发送，请稍后再试。",
    verification_code_invalid_or_expired: "验证码错误或已经过期。",
    verification_attempts_exhausted: "尝试次数过多，请重新获取验证码。",
    invalid_invitation_code: "邀请码无效，请向邀请人确认。",
    verification_email_unavailable: "验证码邮件暂时无法发送。",
    experience_code_invalid_or_unavailable: "体验码无效、已到期或名额已满。",
    experience_username_required: "请输入用于保存体验进度的用户名。",
  };
  return messages[reason.message] ?? "登录请求没有完成，请检查信息后重试。";
}
