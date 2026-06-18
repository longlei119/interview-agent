import type { ChatMessage } from "./deepseek";
import { renderPrompt } from "./ai-prompts";

export async function interviewerSystemPrompt(role: string, level: string): Promise<string> {
  return renderPrompt("interview.interviewer.system", { role, level });
}

export async function interviewSummaryPrompt(): Promise<ChatMessage> {
  return {
    role: "user",
    content: await renderPrompt("interview.summary.user"),
  };
}

export function extractScore(summary: string): number {
  const match = summary.match(/综合评分[：:]\s*(\d{1,3})/);
  if (match) {
    const n = parseInt(match[1], 10);
    return Math.max(0, Math.min(100, n));
  }
  return 0;
}

export async function evaluateAnswerMessages(
  question: { title: string; body: string; referenceAnswer: string },
  userAnswer: string
): Promise<ChatMessage[]> {
  return [
    {
      role: "user",
      content: await renderPrompt("practice.answer.evaluate", {
        questionTitle: question.title,
        questionBody: question.body,
        referenceAnswer: question.referenceAnswer,
        userAnswer: userAnswer || "（候选人未作答）",
      }),
    },
  ];
}

export async function paperEvaluateMessages(
  question: { title: string; body: string; referenceAnswer: string },
  userAnswer: string
): Promise<ChatMessage[]> {
  return [
    {
      role: "user",
      content: await renderPrompt("paper.answer.evaluate", {
        questionTitle: question.title,
        questionBody: question.body,
        referenceAnswer: question.referenceAnswer,
        userAnswer: userAnswer || "（考生未作答）",
      }),
    },
  ];
}

export function extractEvalScore(feedback: string): number {
  const match = feedback.match(/得分[：:]\s*(\d{1,3})/);
  if (match) {
    const n = parseInt(match[1], 10);
    return Math.max(0, Math.min(100, n));
  }
  return 0;
}
