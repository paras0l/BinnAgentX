export type ExperienceCodeStatus = "active" | "exhausted" | "expired" | "revoked";

export interface ExperienceCode {
  code_id: string;
  code_hint: string;
  label: string;
  status: ExperienceCodeStatus;
  max_uses: number;
  used_count: number;
  available_uses: number;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreatedExperienceCode extends ExperienceCode {
  experience_code: string;
}

export class ControlApiError extends Error {}

export type ContentGenerationJobStatus =
  "queued" | "running" | "generated" | "validation_failed" | "generation_failed";

export interface ContentGenerationJob {
  job_id: string;
  status: ContentGenerationJobStatus;
  seed: number | null;
  pack_id: string;
  pack_version: string;
  item_count: number;
  agent_reviewed_count: number;
  validation_errors: string[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  published_at: string | null;
  is_active: boolean;
  can_publish: boolean;
}

async function controlRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/control/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string | { message?: string };
    } | null;
    const detail = body?.detail;
    throw new ControlApiError(
      typeof detail === "string" ? detail : (detail?.message ?? "control_request_failed"),
    );
  }
  return (await response.json()) as T;
}

export function listExperienceCodes(): Promise<ExperienceCode[]> {
  return controlRequest("experience-codes");
}

export function createExperienceCode(input: {
  label: string;
  max_uses: number;
  valid_days: number;
}): Promise<CreatedExperienceCode> {
  return controlRequest("experience-codes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revokeExperienceCode(codeId: string): Promise<ExperienceCode> {
  return controlRequest(`experience-codes/${codeId}/revoke`, { method: "POST" });
}

export function listContentGenerationJobs(): Promise<ContentGenerationJob[]> {
  return controlRequest("content-generation/jobs");
}

export function createContentGenerationJob(seed?: number): Promise<ContentGenerationJob> {
  return controlRequest("content-generation/jobs", {
    method: "POST",
    body: JSON.stringify({ seed }),
  });
}

export function publishContentGenerationJob(jobId: string): Promise<ContentGenerationJob> {
  return controlRequest(`content-generation/jobs/${jobId}/publish`, { method: "POST" });
}
