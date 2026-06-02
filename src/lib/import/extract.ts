import { chat } from "../deepseek";
import { parseJsonLoose } from "./json";
import {
  extractFromTextMessages,
  extractFromImagesMessages,
} from "./prompts";
import type { ExtractedQuestion } from "./types";

// 模型返回的原始题目结构（提取 prompt 约定的字段）
interface RawExtracted {
  question?: string;
  answer?: string;
  difficulty?: string;
}

// 把模型返回的原始数组规整成 ExtractedQuestion[]，过滤掉空题。
function normalize(raw: RawExtracted[] | null): ExtractedQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtractedQuestion[] = [];
  for (const r of raw) {
    const body = typeof r.question === "string" ? r.question.trim() : "";
    if (!body) continue; // 没有题干的丢弃
    out.push({
      title: body, // 标题=题目（产品决策）
      body,
      referenceAnswer: typeof r.answer === "string" ? r.answer.trim() : "",
      difficulty: typeof r.difficulty === "string" ? r.difficulty.trim() : "",
    });
  }
  return out;
}

// 文本 → 题目列表。主模型。解析失败/空 → 返回 []。
export async function extractFromText(
  rawText: string
): Promise<ExtractedQuestion[]> {
  const text = rawText.trim();
  if (!text) return [];
  const reply = await chat(extractFromTextMessages(text), {
    role: "primary",
    temperature: 0.2,
  });
  return normalize(parseJsonLoose<RawExtracted[]>(reply));
}

// 图片(data URL 列表) → 题目列表。视觉模型。
// 视觉模型未配置时，chat({role:"vision"}) 会抛 VisionModelNotConfiguredError，向上传播由编排层处理。
export async function extractFromImages(
  dataUrls: string[]
): Promise<ExtractedQuestion[]> {
  if (dataUrls.length === 0) return [];
  const reply = await chat(extractFromImagesMessages(dataUrls), {
    role: "vision",
    temperature: 0.2,
  });
  return normalize(parseJsonLoose<RawExtracted[]>(reply));
}
