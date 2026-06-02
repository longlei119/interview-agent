import type { ChatMessage, ContentPart } from "../deepseek";
import type { ExtractedQuestion } from "./types";

// 「导入题目」流水线的专用 prompt，与面试/刷题的 prompts.ts 分开。
// 三个阶段：提取（文本/图片）、分类、补答案。全部要求模型输出纯 JSON。

// 提取阶段共用的指令：把内容里的面试题拆成 JSON 数组。
const EXTRACT_INSTRUCTION = `你是一个面试题整理助手。请从我给你的内容里识别出所有「面试题」，逐题提取。

严格按以下 JSON 数组格式输出，不要输出任何额外说明文字、不要用 markdown 代码块：
[
  {
    "question": "题目的完整文字（一道题问什么）",
    "answer": "如果原文里有这道题的答案/解析就原样提取，没有就留空字符串",
    "difficulty": "简单 或 中等 或 困难，判断不出就留空字符串"
  }
]

规则：
1. 一道题一个对象。如果有多道题，数组里就有多个对象。
2. 只提取面试题本身，忽略页码、水印、广告、无关的标题装饰文字。
3. answer 只在原文确实给出答案时才填；原文只有题目没有答案时，answer 必须是空字符串（后续会自动补）。
4. 如果内容里没有任何可识别的面试题，返回空数组 []。`;

// 文本提取：把粘贴的文本作为 user 内容。
export function extractFromTextMessages(rawText: string): ChatMessage[] {
  return [
    { role: "system", content: EXTRACT_INSTRUCTION },
    { role: "user", content: `以下是待识别的内容：\n\n${rawText}` },
  ];
}

// 图片提取：构造多模态 message（指令文本 + 多张图片 data URL）。
export function extractFromImagesMessages(dataUrls: string[]): ChatMessage[] {
  const parts: ContentPart[] = [
    { type: "text", text: "以下图片里包含面试题，请按系统指令识别并提取。" },
    ...dataUrls.map(
      (url): ContentPart => ({ type: "image_url", image_url: { url } })
    ),
  ];
  return [
    { role: "system", content: EXTRACT_INSTRUCTION },
    { role: "user", content: parts },
  ];
}

// 分类阶段：把现有话题树喂给模型，三选一决策。
export function classifyMessages(
  q: ExtractedQuestion,
  topicOptions: { id: string; label: string }[]
): ChatMessage[] {
  const tree =
    topicOptions.length > 0
      ? topicOptions.map((t) => `- id: ${t.id} | 路径: ${t.label}`).join("\n")
      : "（用户当前还没有任何话题分类）";

  return [
    {
      role: "system",
      content: `你是一个面试题分类助手。用户有一棵私人的话题分类树，你要为一道题决定它应该归到哪个分类。

用户现有的话题分类（每行是一个可选节点，路径用 / 表示层级）：
${tree}

请为这道题做出分类决策，严格按以下 JSON 之一输出，不要任何额外说明、不要 markdown：

1) 如果现有分类里有合适的，选最贴切的一个：
{ "kind": "existing", "topicId": "上面列表里的某个 id" }

2) 如果现有分类都不合适，但你能判断它该属于某个现有节点之下的新子分类：
{ "kind": "new", "name": "新分类名（简短，如 消息队列）", "parentId": "上面列表里某个 id 作为父节点" }

3) 如果现有分类都不合适、且应该作为一个新的顶级分类：
{ "kind": "new", "name": "新分类名", "parentId": null }

4) 如果你实在判断不出合适的分类：
{ "kind": "fallback" }

只输出一个 JSON 对象。topicId 和 parentId 必须是上面列表里真实存在的 id，不要编造。`,
    },
    {
      role: "user",
      content: `题目：${q.body}`,
    },
  ];
}

// 补答案阶段：给没有答案的题生成参考答案（纯文本）。
export function generateAnswerMessages(q: ExtractedQuestion): ChatMessage[] {
  return [
    {
      role: "system",
      content: `你是一位资深技术面试官。请为下面这道面试题写一份准确、有条理的参考答案，用中文。
要求：直接给出答案内容，不要重复题目，不要寒暄，不要用「答：」之类的前缀。条理清晰，覆盖关键点，篇幅适中。`,
    },
    {
      role: "user",
      content: `面试题：${q.body}`,
    },
  ];
}
