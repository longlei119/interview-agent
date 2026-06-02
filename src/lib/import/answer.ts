import { chat } from "../deepseek";
import { generateAnswerMessages } from "./prompts";
import type { ExtractedQuestion } from "./types";

// 为没有答案的题生成参考答案（纯文本）。答案模型（缺省回落主模型）。
// 仅在 referenceAnswer 为空时调用。失败时由编排层 try/catch 处理。
export async function generateAnswer(q: ExtractedQuestion): Promise<string> {
  const reply = await chat(generateAnswerMessages(q), {
    role: "answer",
    temperature: 0.4,
  });
  return reply.trim();
}
