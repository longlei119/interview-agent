import type { ChatMessage } from "./deepseek";

// 模拟面试官的 system prompt
export function interviewerSystemPrompt(role: string, level: string): string {
  return `你是一位资深的技术面试官，正在面试一位应聘「${role}」岗位（目标级别：${level}）的候选人。

请严格遵守以下规则：
1. 你的角色是面试官，全程用中文，语气专业、友好但不失严谨。
2. 一次只问一个问题，问题要贴合「${role}」岗位和「${level}」级别的真实面试难度。
3. 根据候选人的回答进行追问：如果回答含糊、有漏洞或不够深入，要顺着具体的点继续深挖；如果回答得好，可以适当加深难度或转向下一个相关主题。
4. 模拟真实面试节奏：开场先简短欢迎并让候选人做自我介绍，然后由浅入深，覆盖基础知识、项目经验、场景设计等。
5. 不要一次性列出多个问题，不要替候选人回答，不要长篇大论地讲解知识点。每次回复控制在 2-4 句话以内。
6. 如果候选人明显答不上来，给一点引导或换一个角度，不要让气氛太僵。

现在面试开始，请你以面试官身份说开场白并提出第一个问题。`;
}

// 结束面试，让模型基于完整对话生成总评
export function interviewSummaryPrompt(): ChatMessage {
  return {
    role: "user",
    content: `面试到此结束。请你以面试官的身份，基于刚才的完整对话，对候选人做一份结构化总评。请严格按以下格式输出（用中文）：

【综合评分】给出 0-100 的整数分数，单独一行，格式为「综合评分：XX」
【亮点】列出候选人表现好的 2-3 点
【不足】列出需要改进的 2-3 点
【建议】给出 2-3 条具体的提升建议

不要再提问，只输出这份总评。`,
  };
}

// 从总评文本里提取分数
export function extractScore(summary: string): number {
  const match = summary.match(/综合评分[：:]\s*(\d{1,3})/);
  if (match) {
    const n = parseInt(match[1], 10);
    return Math.max(0, Math.min(100, n));
  }
  return 0;
}

// 刷题点评 prompt
export function evaluateAnswerMessages(
  question: { title: string; body: string; referenceAnswer: string },
  userAnswer: string
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `你是一位严谨的技术面试官兼导师，擅长点评候选人对面试题的回答。请用中文，客观、有建设性。`,
    },
    {
      role: "user",
      content: `面试题目：${question.title}

题目描述：
${question.body}

参考答案：
${question.referenceAnswer}

候选人的回答：
${userAnswer || "（候选人未作答）"}

请你完成以下点评，严格按格式输出：
【得分】给出 0-100 的整数，单独一行，格式为「得分：XX」
【评价】对照参考答案，指出候选人回答的优点与不足（3-5 句）
【改进建议】给出 1-3 条具体可操作的改进建议
不要重复抄写参考答案全文，聚焦在对候选人这次回答的针对性反馈上。`,
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
