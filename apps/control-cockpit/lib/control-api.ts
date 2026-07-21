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

export interface ManagedLearner {
  learner_id: string;
  nickname: string;
  email: string;
  account_type: "registered" | "experience";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  active_session_count: number;
  completed_run_count: number;
  asset_count: number;
  obsidian_paired: boolean;
}

export interface ManagedTool {
  project_key: "binnagentx";
  name: string;
  display_name: string;
  version: string;
  description: string;
  kind: "query" | "decision" | "command" | "model";
  risk_level: "low" | "moderate" | "high" | "control";
  source: string;
  enabled: boolean;
  allowed_actor_types: string[];
  required_permission_scopes: string[];
  requires_human_approval: boolean;
  requires_idempotency_key: boolean;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  policy_version: number;
  updated_at: string | null;
}

export interface ManagedPrompt {
  project_key: "binnagentx";
  prompt_id: string;
  prompt_version: string;
  owner: string;
  purpose: string;
  template_text: string;
  variables: string[];
  model_policy: Record<string, unknown>;
  status: "draft" | "active" | "archived";
  content_hash: string;
  version: number;
  created_by_role: string;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptDraftInput {
  prompt_id: string;
  prompt_version: string;
  owner: string;
  purpose: string;
  template_text: string;
  variables: string[];
  model_policy: Record<string, unknown>;
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

export function listManagedLearners(): Promise<ManagedLearner[]> {
  return controlRequest("users");
}

export function revokeManagedLearnerSessions(learnerId: string): Promise<ManagedLearner> {
  return controlRequest(`users/${learnerId}/revoke-sessions`, { method: "POST" });
}

export function listManagedTools(): Promise<ManagedTool[]> {
  return controlRequest("tools");
}

export function updateManagedTool(
  name: string,
  enabled: boolean,
  expectedVersion: number,
): Promise<ManagedTool> {
  return controlRequest(`tools/${encodeURIComponent(name)}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled, expected_version: expectedVersion }),
  });
}

export function listManagedPrompts(): Promise<ManagedPrompt[]> {
  return controlRequest("prompts");
}

export function createManagedPrompt(input: PromptDraftInput): Promise<ManagedPrompt> {
  return controlRequest("prompts", { method: "POST", body: JSON.stringify(input) });
}

export function updateManagedPrompt(
  prompt: ManagedPrompt,
  input: Omit<PromptDraftInput, "prompt_id" | "prompt_version">,
): Promise<ManagedPrompt> {
  return controlRequest(
    `prompts/${encodeURIComponent(prompt.prompt_id)}/${encodeURIComponent(prompt.prompt_version)}`,
    {
      method: "PUT",
      body: JSON.stringify({ ...input, expected_version: prompt.version }),
    },
  );
}

export function activateManagedPrompt(prompt: ManagedPrompt): Promise<ManagedPrompt> {
  return controlRequest(
    `prompts/${encodeURIComponent(prompt.prompt_id)}/${encodeURIComponent(prompt.prompt_version)}/activate`,
    { method: "POST", body: JSON.stringify({ expected_version: prompt.version }) },
  );
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
