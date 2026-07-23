export type ExamTrack = "english_1" | "english_2";
export type SelfReportedLevel = "weak" | "developing" | "steady" | "unknown";
export type AnnotationKind =
  "vocabulary" | "grammar" | "claim" | "evidence" | "logic" | "uncertain" | "reusable_expression";

export interface LearnerProfileInput {
  exam_track: ExamTrack;
  target_score: number;
  weekly_minutes: number;
  self_reported_level: SelfReportedLevel;
  prior_exam_seen: boolean;
  session_minutes: number;
  feedback_density: "minimal" | "standard" | "detailed";
  timed: boolean;
  evidence_count: number;
  confidence_band: "low" | "medium" | "high";
}

export interface AttemptView {
  attempt_version_id: string;
  version: number;
  text: string;
  content_hash: string;
  independence: "independent" | "hinted_low" | "hinted_high";
  created_at: string;
}

export interface AnnotationView {
  annotation_id: string;
  kind: AnnotationKind;
  span: {
    paragraph_id: string;
    start: number;
    end: number;
    text_quote: string;
  };
  user_explanation: string;
  created_at: string;
}

export interface AnnotationAnalysisView {
  analysis_id: string;
  focus: "vocabulary" | "syntax" | "reference" | "logic" | "context" | "mixed";
  selection_scope: "word_or_phrase" | "sentence_or_paragraph";
  translation: string | null;
  vocabulary_note: string | null;
  grammar_structure: string[];
  diagnosis: string;
  breakdown: string[];
  next_check: string;
  source: "model" | "local_fallback";
  reason_code: string;
  boundary_note: string;
}

export interface ExpressionStyleVersion {
  style: "logic_mirror" | "academic" | "news";
  label: string;
  text: string;
  explanation: string[];
}

export interface ExpressionReviewView {
  review_id: string;
  source: "model" | "local_fallback";
  reason_code: string;
  thinking_difference: string;
  versions: ExpressionStyleVersion[];
  boundary_note: string;
}

export interface InterventionView {
  intervention_id: string;
  input_attempt_version_id: string;
  hint_level: number;
  intervention_type: string;
  reason_code: string;
  delivered_content: string;
  content_hash: string;
  result_status: string;
  created_at: string;
}

export interface RevisionView {
  revision_event_id: string;
  from_attempt_version_id: string;
  to_attempt_version_id: string;
  intervention_id: string | null;
  result_status: string;
  created_at: string;
}

export interface LearnerTaskView {
  task_id: string;
  workflow_run_id: string;
  task_type: "calibration_reading" | "matched_reading" | "micro_expression";
  state: string;
  version: number;
  highest_hint_level: number;
  current_content_version_id: string;
  annotation_count: number;
  annotations: AnnotationView[];
  attempts: AttemptView[];
  interventions: InterventionView[];
  revisions: RevisionView[];
  intervention_count: number;
  revision_count: number;
  completion_gaps: string[];
  replayed: boolean;
}

export interface LearnerRunView {
  workflow_run_id: string;
  run_kind: "first_experience" | "practice";
  predecessor_run_id: string | null;
  lifecycle: string;
  stage:
    | "calibration_a"
    | "calibration_b"
    | "matched_reading"
    | "micro_expression"
    | "wrap_up"
    | "completed";
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
  calibration_fallback_approved: boolean;
  difficulty_feedback_status: string;
  difficulty_rating: string | null;
  next_task_placeholder_id: string | null;
  completion_gaps: string[];
  created_at: string;
  updated_at: string;
  replayed: boolean;
}

export interface ReadingMaterialView {
  content_type: "calibration_reading" | "matched_reading";
  content_version_id: string;
  title: string;
  paragraphs: Array<{ paragraph_id: string; text: string }>;
  allowed_annotations: AnnotationKind[];
  question: {
    question_id: string;
    question_type?:
      | "vocabulary_in_context"
      | "grammar_cloze"
      | "detail_comprehension"
      | "main_idea"
      | "inference"
      | "rhetorical_purpose"
      | "sentence_insertion"
      | "paragraph_logic"
      | "evidence_reasoning";
    difficulty_tier?: "foundation" | "standard" | "advanced";
    prompt: string;
    options: Array<{ option_id: string; text: string }>;
  };
  question_count?: number;
  grammar_challenge: GrammarChallengeView;
  material_feedback?: "good" | "bad" | null;
}

export interface GrammarChallengeView {
  challenge_id: string;
  status: "pending" | "resolved";
  attempt_count: number;
  hint_revealed: boolean;
  error_type: string | null;
  hint: string | null;
  answer: string | null;
}

export interface GrammarChallengeUpdateView {
  paragraphs: Array<{ paragraph_id: string; text: string }>;
  grammar_challenge: GrammarChallengeView;
  verification_correct: boolean | null;
  feedback: string | null;
}

export interface ExpressionMaterialView {
  content_type: "micro_expression";
  content_version_id: string;
  title: string;
  situation: string;
  audience: string;
  purpose: string;
  target_argument_move: string;
  optional_active_resource: string;
  forbidden_mechanical_use: string[];
  output_requirement: {
    sentence_min: number;
    sentence_max: number;
    word_min: number;
    word_max: number;
    language: string;
  };
  v1_minimum: string[];
}

export interface LearnerWorkspaceView {
  run: LearnerRunView;
  task: LearnerTaskView | null;
  material: ReadingMaterialView | ExpressionMaterialView | null;
}

export interface LearnerResumeWorkspaceView {
  available: boolean;
  workspace: LearnerWorkspaceView | null;
}

export interface TextSelection {
  paragraphId: string;
  start: number;
  end: number;
  textQuote: string;
}
