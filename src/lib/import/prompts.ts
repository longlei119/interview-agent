import type { ChatMessage, ContentPart } from "../deepseek";
import { renderPrompt } from "../ai-prompts";
import type { ExtractedQuestion } from "./types";

export async function extractFromTextMessages(rawText: string): Promise<ChatMessage[]> {
  return [
    { role: "system", content: await renderPrompt("import.extract.text") },
    { role: "user", content: `以下是待识别的内容：\n\n${rawText}` },
  ];
}

export async function extractFromImagesMessages(dataUrls: string[]): Promise<ChatMessage[]> {
  const parts: ContentPart[] = [
    { type: "text", text: "以下图片里包含面试题，请按系统指令识别并提取。" },
    ...dataUrls.map(
      (url): ContentPart => ({ type: "image_url", image_url: { url } })
    ),
  ];
  return [
    { role: "system", content: await renderPrompt("import.extract.images") },
    { role: "user", content: parts },
  ];
}

export async function classifyMessages(
  q: ExtractedQuestion,
  topicOptions: { id: string; label: string }[]
): Promise<ChatMessage[]> {
  const topicTree =
    topicOptions.length > 0
      ? topicOptions.map((t) => `- id: ${t.id} | 路径: ${t.label}`).join("\n")
      : "（用户当前还没有任何话题分类）";

  return [
    {
      role: "system",
      content: await renderPrompt("import.question.classify", {
        topicTree,
        questionBody: q.body,
      }),
    },
  ];
}

export async function generateAnswerMessages(q: ExtractedQuestion): Promise<ChatMessage[]> {
  return [
    {
      role: "user",
      content: await renderPrompt("import.answer.generate", { questionBody: q.body }),
    },
  ];
}
