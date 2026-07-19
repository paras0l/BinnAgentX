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
  "queued" | "running" | "generated" | "validation_failed" | "generation_failed" | "cancelled";

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
  current_stage: string;
  current_item_id: string | null;
  progress_completed: number;
  progress_total: number;
  attempt_count: number;
  heartbeat_at: string | null;
  cancel_requested_at: string | null;
  langfuse_trace_id: string | null;
  langfuse_trace_url: string | null;
  model_provider: string | null;
  model_name: string | null;
  can_cancel: boolean;
  can_retry: boolean;
  prefect_task_run_id: string | null;
  prefect_task_run_url: string | null;
}

export interface ContentGenerationEvent {
  event_id: number;
  event_type: string;
  stage: string;
  agent_role: string | null;
  item_id: string | null;
  attempt: number | null;
  message: string;
  detail: Record<string, unknown>;
  occurred_at: string;
}

export interface ContentGenerationJobDetail {
  job: ContentGenerationJob;
  events: ContentGenerationEvent[];
}

export interface ContentControlStatus {
  worker: {
    online: boolean;
    state: string;
    current_job_id: string | null;
    started_at: string | null;
    heartbeat_at: string | null;
  };
  langfuse: {
    configured: boolean;
    reachable: boolean;
    url: string;
  };
  prefect: {
    configured: boolean;
    reachable: boolean;
    url: string;
    active_workers: number;
  };
  model_provider: string;
  model_name: string;
  queue_depth: number;
  running_count: number;
  failed_count: number;
  active_pack_job_id: string | null;
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

export function getContentControlStatus(): Promise<ContentControlStatus> {
  return controlRequest("content-generation/status");
}

export function getContentGenerationJob(jobId: string): Promise<ContentGenerationJobDetail> {
  return controlRequest(`content-generation/jobs/${jobId}`);
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

export function cancelContentGenerationJob(jobId: string): Promise<ContentGenerationJob> {
  return controlRequest(`content-generation/jobs/${jobId}/cancel`, { method: "POST" });
}

export function retryContentGenerationJob(jobId: string): Promise<ContentGenerationJob> {
  return controlRequest(`content-generation/jobs/${jobId}/retry`, { method: "POST" });
}
