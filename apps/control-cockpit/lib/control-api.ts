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
  token_limit: number;
  used_tokens: number;
  remaining_tokens: number;
  remaining_percent: number;
  usage_cost_cny: string;
  usage_reset_at: string | null;
}

export interface UsageResetResult {
  scope: "selected" | "all";
  reset_count: number;
  learner_ids: string[];
  reset_at: string;
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
  expected_version_scope: "none" | "run" | "task";
  requires_call_accounting: boolean;
  requires_audit: boolean;
  audit_strategy: "none" | "executor" | "domain";
  requires_human_approval: boolean;
  requires_idempotency_key: boolean;
  timeout_seconds: number;
  max_calls_per_run: number;
  fallback_policy: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  policy_version: number;
  updated_at: string | null;
}

export interface ManagedAgent {
  project_key: "binnagentx";
  agent_id: string;
  display_name: string;
  description: string;
  domain: string;
  execution_kind: "workflow" | "model" | "deterministic";
  workflow: string;
  availability: "available" | "blocked";
  blockers: string[];
  prompt_ids: string[];
  tool_names: string[];
  model_provider: string;
  supports_checkpoint_resume: boolean;
  requires_human_review: boolean;
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

export interface ControlRunSummary {
  workflow_run_id: string;
  learner_id: string | null;
  run_kind: string;
  lifecycle: string;
  stage: string | null;
  version: number;
  checkpoint_id: string;
  task_count: number;
  model_call_count: number;
  cost_usd: string;
  created_at: string;
  updated_at: string;
}

export interface ControlRunPage {
  items: ControlRunSummary[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface ControlRunReplay {
  workflow_run_id: string;
  run_kind: string;
  predecessor_run_id: string | null;
  lifecycle: string;
  stage: string;
  version: number;
  current_task_id: string | null;
  task_refs: Array<{
    task_id: string;
    role: string;
    task_type: string;
    content_version_id: string;
    completed: boolean;
    completed_task_version: number | null;
    highest_hint_level: number | null;
  }>;
  match_decisions: Array<{
    decision_id: string;
    selected_content_version_id: string;
    policy_version: string;
    conservative: boolean;
    reason_codes: string[];
  }>;
  completion_gaps: string[];
  event_chain: Array<{
    event_id?: string;
    event_type?: string;
    aggregate_version?: number;
    payload?: Record<string, unknown>;
    occurred_at?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeProposal {
  proposal_id: string;
  run_id: string;
  learner_id: string;
  candidate_id: string;
  action: string;
  confidence: string;
  status: string;
  destination: string;
  requires_human_review: boolean;
  knowledge_kind: string;
  canonical_key: string;
  title: string;
  claim: string;
  conflicts: unknown[];
  created_at: string;
}

export interface OperationalInvocation {
  source: "model_tool" | "tool";
  invocation_key: string;
  tool_name: string;
  workflow_run_id: string;
  task_id: string | null;
  status: string;
  audit_event_id: string | null;
  purpose: string | null;
  adapter: string | null;
  prompt_version: string | null;
  outcome: string | null;
  is_remote: boolean | null;
  estimated_cost_usd: string;
  actual_cost_usd: string;
  latency_ms: number | null;
  used_fallback: boolean;
  reason_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperationalInvocationPage {
  items: OperationalInvocation[];
  metrics: {
    total_invocations: number;
    model_invocations: number;
    tool_invocations: number;
    fallback_count: number;
    actual_cost_usd: string;
    average_latency_ms: number;
  };
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface OperationalTrace {
  trace_id: string;
  name: string;
  environment: string | null;
  metadata: Record<string, string | number | boolean | null>;
  observation_count: number;
  latency_ms: number;
  total_cost_usd: string;
  timestamp: string;
  updated_at: string;
  evidence_url: string;
}

export interface OperationalTracePage {
  items: OperationalTrace[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface OperationalTimeline {
  workflow_run_id: string;
  items: Array<{
    kind: "audit" | "domain_event" | "idempotency" | "outbox";
    record_id: string;
    name: string;
    status: string | null;
    aggregate_id: string | null;
    invocation_key: string | null;
    version: number | null;
    occurred_at: string;
  }>;
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

export interface PromptRenderResult {
  prompt_id: string;
  prompt_version: string;
  rendered: string;
  content_hash: string;
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

export interface PersonalizedMaterialJob {
  material_id: string;
  owner_ref: string;
  status:
    | "requested"
    | "generating"
    | "validating"
    | "awaiting_review"
    | "ready"
    | "in_progress"
    | "completed"
    | "generation_failed"
    | "rejected";
  source_context_count: number;
  evidence_target_count: number;
  generation_attempt_count: number;
  generation_error_code: string | null;
  next_generation_attempt_at: string | null;
  claimed_by: string | null;
  lease_expires_at: string | null;
  can_resume_from_checkpoint: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonalizedMaterialJobPage {
  items: PersonalizedMaterialJob[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface PersonalizedMaterialEvent {
  event_id: number;
  event_type: string;
  stage: string;
  attempt: number | null;
  message: string;
  detail: Record<string, unknown>;
  occurred_at: string;
}

export interface PersonalizedKnowledgePoint {
  candidate_ref: string;
  title: string;
  kind: string;
  tags: string[];
}

export interface PersonalizedMaterialJobDetail {
  job: PersonalizedMaterialJob;
  candidate_knowledge_points: PersonalizedKnowledgePoint[];
  events: PersonalizedMaterialEvent[];
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
  model_provider: string;
  model_name: string;
  queue_depth: number;
  running_count: number;
  failed_count: number;
  personalized_queue_depth: number;
  personalized_running_count: number;
  personalized_failed_count: number;
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

export function resetManagedLearnerUsage(input: {
  scope: "selected" | "all";
  learner_ids?: string[];
}): Promise<UsageResetResult> {
  return controlRequest("users/usage/reset", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listManagedTools(): Promise<ManagedTool[]> {
  return controlRequest("tools");
}

export function listManagedAgents(): Promise<ManagedAgent[]> {
  return controlRequest("agents");
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

export function listControlRuns(
  options: {
    page?: number;
    pageSize?: number;
    query?: string;
  } = {},
): Promise<ControlRunPage> {
  const parameters = new URLSearchParams({
    page: String(options.page ?? 1),
    page_size: String(options.pageSize ?? 20),
  });
  if (options.query?.trim()) parameters.set("query", options.query.trim());
  return controlRequest(`runs?${parameters.toString()}`);
}

export function getControlRunReplay(workflowRunId: string): Promise<ControlRunReplay> {
  return controlRequest(`runs/${encodeURIComponent(workflowRunId)}/replay`);
}

export function listKnowledgeProposals(status = "awaiting_review"): Promise<KnowledgeProposal[]> {
  return controlRequest(`knowledge-organization/proposals?status=${encodeURIComponent(status)}`);
}

export function reviewKnowledgeProposal(
  proposalId: string,
  action: "approve" | "reject",
): Promise<Record<string, unknown>> {
  return controlRequest(
    `knowledge-organization/proposals/${encodeURIComponent(proposalId)}/review`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    },
  );
}

export function listOperationalInvocations(
  options: {
    workflowRunId?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<OperationalInvocationPage> {
  const parameters = new URLSearchParams({
    page: String(options.page ?? 1),
    page_size: String(options.pageSize ?? 20),
  });
  if (options.workflowRunId) parameters.set("workflow_run_id", options.workflowRunId);
  if (options.query?.trim()) parameters.set("query", options.query.trim());
  return controlRequest(`operations/invocations?${parameters.toString()}`);
}

export function listOperationalTraces(
  options: {
    page?: number;
    pageSize?: number;
  } = {},
): Promise<OperationalTracePage> {
  const parameters = new URLSearchParams({
    page: String(options.page ?? 1),
    page_size: String(options.pageSize ?? 20),
  });
  return controlRequest(`operations/traces?${parameters.toString()}`);
}

export function getOperationalTimeline(workflowRunId: string): Promise<OperationalTimeline> {
  const parameters = new URLSearchParams({ workflow_run_id: workflowRunId });
  return controlRequest(`operations/timeline?${parameters.toString()}`);
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

export function renderManagedPrompt(
  prompt: ManagedPrompt,
  variables: Record<string, unknown>,
): Promise<PromptRenderResult> {
  return controlRequest(
    `prompts/${encodeURIComponent(prompt.prompt_id)}/${encodeURIComponent(prompt.prompt_version)}/render`,
    { method: "POST", body: JSON.stringify({ variables }) },
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

export function listPersonalizedMaterialJobs(
  options: { page?: number; pageSize?: number; query?: string } = {},
): Promise<PersonalizedMaterialJobPage> {
  const parameters = new URLSearchParams({
    page: String(options.page ?? 1),
    page_size: String(options.pageSize ?? 10),
  });
  const query = options.query?.trim();
  if (query) parameters.set("query", query);
  return controlRequest(`content-generation/personalized-jobs?${parameters.toString()}`);
}

export function getPersonalizedMaterialJob(
  materialId: string,
): Promise<PersonalizedMaterialJobDetail> {
  return controlRequest(`content-generation/personalized-jobs/${materialId}`);
}

export function resumePersonalizedMaterialJob(
  materialId: string,
  reason: string,
): Promise<PersonalizedMaterialJob> {
  return controlRequest(`content-generation/personalized-jobs/${materialId}/resume`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function createContentGenerationJob(seed?: number): Promise<ContentGenerationJob> {
  return controlRequest("content-generation/jobs", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ seed }),
  });
}

export function publishContentGenerationJob(jobId: string): Promise<ContentGenerationJob> {
  return controlRequest(`content-generation/jobs/${jobId}/publish`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}

export function cancelContentGenerationJob(jobId: string): Promise<ContentGenerationJob> {
  return controlRequest(`content-generation/jobs/${jobId}/cancel`, { method: "POST" });
}

export function retryContentGenerationJob(jobId: string): Promise<ContentGenerationJob> {
  return controlRequest(`content-generation/jobs/${jobId}/retry`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}
