export const PROGRESS_EVIDENCE_LEVELS = [
  "attempted",
  "completed_this_time",
  "independent_new_material",
  "delayed_independent",
] as const;

export type ProgressEvidenceLevel = (typeof PROGRESS_EVIDENCE_LEVELS)[number];

export function canDescribeStableProgress(level: ProgressEvidenceLevel): boolean {
  return level === "delayed_independent";
}
