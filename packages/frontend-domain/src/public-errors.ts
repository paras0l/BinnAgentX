export const PUBLIC_ERROR_MESSAGES = {
  TEMPORARY_UNAVAILABLE: "当前步骤暂时不可用，可以稍后重试。",
  SAVE_NOT_CONFIRMED: "内容尚未确认保存，草稿仍保留在本机。",
  MATERIAL_REPLACED: "当前材料需要更换，已完成的背景设置仍然保留。",
  CONTENT_NOT_ELIGIBLE: "暂时没有符合使用条件的材料。",
  FEEDBACK_NEEDS_REVIEW: "这次反馈需要复核，你可以继续基础训练。",
  BUDGET_LIMIT_REACHED: "本次先使用基础训练路径。",
  SESSION_CONFLICT: "任务状态已经变化，请重新载入。",
} as const;

export type PublicErrorCode = keyof typeof PUBLIC_ERROR_MESSAGES;
