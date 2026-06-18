export interface PaperResponse {
  id: string;
  title: string;
  description: string;
  timeLimit: number | null;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export function validatePaperInput(body: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) errors.push("请填写试卷标题");
  if (title.length > 200) errors.push("标题不能超过 200 字");

  const timeLimit = body.timeLimit;
  if (timeLimit !== undefined && timeLimit !== null && timeLimit !== "") {
    const n = Number(timeLimit);
    if (!Number.isInteger(n) || n <= 0) errors.push("时间限制需为正整数分钟");
  }

  const questionIds = body.questionIds;
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    errors.push("请至少选择一道题目");
  }
  return { valid: errors.length === 0, errors };
}

export function validatePaperItems(
  questionIds: string[],
  ownedQuestionIds: Set<string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const missing = questionIds.filter((id) => !ownedQuestionIds.has(id));
  if (missing.length > 0) errors.push(`题目 ${missing.join(", ")} 不存在或不属于你`);
  return { valid: errors.length === 0, errors };
}

export function formatPaperResponse(
  paper: {
    id: string;
    title: string;
    description: string;
    timeLimit: number | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  itemCount: number
): PaperResponse {
  return {
    id: paper.id,
    title: paper.title,
    description: paper.description,
    timeLimit: paper.timeLimit,
    isPublic: paper.isPublic,
    itemCount,
    createdAt: paper.createdAt.toISOString(),
    updatedAt: paper.updatedAt.toISOString(),
  };
}

export function parseIsPublic(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

export function computeTotalScore(scores: Record<string, number>): number {
  return Object.values(scores).reduce((sum, s) => sum + s, 0);
}

export function validateAttemptAnswers(
  answers: Record<string, string>,
  paperQuestionIds: string[]
): { valid: boolean; unanswered: string[] } {
  const unanswered = paperQuestionIds.filter((id) => !answers[id]?.trim());
  return { valid: unanswered.length === 0, unanswered };
}
