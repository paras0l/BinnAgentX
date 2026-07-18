"use client";

import { useEffect, useState } from "react";

import { AuthApiError, getSession, logoutAccount, type LearnerIdentity } from "../lib/auth-api";
import { LearningExperience } from "./learning-experience";
import { LoginExperience } from "./login-experience";

export function AuthGate() {
  const [identity, setIdentity] = useState<LearnerIdentity | null>(null);
  const [checking, setChecking] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const checkSession = () => {
    setChecking(true);
    setServiceError(null);
    void getSession()
      .then(setIdentity)
      .catch((error: unknown) => {
        setIdentity(null);
        if (!(error instanceof AuthApiError) || error.status !== 401) {
          setServiceError("暂时无法连接学习服务，请确认后端已经启动。你可以稍后重试。");
        }
      })
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    let active = true;
    void getSession()
      .then((value) => {
        if (active) setIdentity(value);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setIdentity(null);
        if (!(error instanceof AuthApiError) || error.status !== 401) {
          setServiceError("暂时无法连接学习服务，请确认后端已经启动。你可以稍后重试。");
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (checking) {
    return (
      <main className="loading-shell" aria-busy="true" data-ui-anchor="auth-shell">
        <p className="eyebrow">BinnAgent · 考研英语</p>
        <h1>正在确认登录状态…</h1>
      </main>
    );
  }
  if (!identity) {
    return (
      <LoginExperience
        serviceError={serviceError}
        onRetry={checkSession}
        onAuthenticated={setIdentity}
      />
    );
  }
  return (
    <LearningExperience
      identity={identity}
      onLogout={() => {
        void logoutAccount().finally(() => setIdentity(null));
      }}
    />
  );
}
