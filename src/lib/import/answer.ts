import { chat, DeepSeekApiError } from "../deepseek";
import { generateAnswerMessages } from "./prompts";
import type { ExtractedQuestion } from "./types";

// 瞬时错误才值得重试：5xx 服务端波动、429 限流。配置错误（401）等立即放弃。
function isRetriable(err: unknown): boolean {
  return err instanceof DeepSeekApiError && (err.status >= 500 || err.status === 429);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 为没有答案的题生成参考答案（纯文本）。答案模型（缺省回落主模型）。
// 仅在 referenceAnswer 为空时调用。失败时由编排层 try/catch 处理。
// 答案服务（如外部更强模型）额度抖动会间歇 500，故对瞬时错误退避重试。
export async function generateAnswer(q: ExtractedQuestion): Promise<string> {
  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const reply = await chat(await generateAnswerMessages(q), {
        role: "answer",
        temperature: 0.4,
      });
      return reply.trim();
    } catch (err) {
      lastErr = err;
      if (!isRetriable(err) || attempt === maxAttempts) throw err;
      await sleep(attempt * 800); // 0.8s、1.6s 退避
    }
  }
  throw lastErr; // 逻辑上到不了这里，满足类型检查
}
