export interface LearnerIdentity {
  learner_id: string;
  nickname: string;
  email: string;
  invite_code: string;
  account_type: "registered" | "experience";
}

export interface LearnerAccount {
  learner_id: string;
  nickname: string;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/learner/v1/auth/${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new AuthApiError(body?.detail ?? "authentication_request_failed", response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getSession(): Promise<LearnerIdentity> {
  return authRequest("session");
}

export function requestEmailCode(email: string): Promise<{ resend_after_seconds: number }> {
  return authRequest("email-verifications", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function confirmEmailCode(
  email: string,
  code: string,
): Promise<{ verification_token: string }> {
  return authRequest("email-verifications/confirm", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export function lookupAccounts(
  email: string,
  verificationToken: string,
): Promise<{ accounts: LearnerAccount[] }> {
  return authRequest("lookup", {
    method: "POST",
    body: JSON.stringify({ email, verification_token: verificationToken }),
  });
}

export function loginAccount(
  email: string,
  verificationToken: string,
  learnerId: string,
): Promise<LearnerIdentity> {
  return authRequest("login", {
    method: "POST",
    body: JSON.stringify({
      email,
      verification_token: verificationToken,
      learner_id: learnerId,
    }),
  });
}

export function registerAccount(
  email: string,
  verificationToken: string,
  nickname: string,
  inviteCode: string,
): Promise<LearnerIdentity> {
  return authRequest("register", {
    method: "POST",
    body: JSON.stringify({
      email,
      verification_token: verificationToken,
      nickname,
      invite_code: inviteCode,
    }),
  });
}

export function loginWithExperienceCode(
  experienceCode: string,
  username: string,
): Promise<LearnerIdentity> {
  return authRequest("experience-login", {
    method: "POST",
    body: JSON.stringify({ experience_code: experienceCode, username }),
  });
}

export function logoutAccount(): Promise<void> {
  return authRequest("logout", { method: "POST" });
}
