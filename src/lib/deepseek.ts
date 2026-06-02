// 多模态消息内容：string 是向后兼容的纯文本；数组用于视觉模型（图片 data URL）。
export interface TextPart {
  type: "text";
  text: string;
}
export interface ImagePart {
  type: "image_url";
  image_url: { url: string };
}
export type ContentPart = TextPart | ImagePart;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

// 模型角色：现有调用走 primary；导入流水线用 vision（图片识别）和 answer（补答案）。
export type ModelRole = "primary" | "vision" | "answer";

function getConfigFor(role: ModelRole) {
  const base = {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  };
  if (role === "vision") {
    // apiKey/baseUrl 回落主模型，但 model 无缺省（空 = 未配置，作为预留插槽）
    return {
      apiKey: process.env.VISION_API_KEY ?? base.apiKey,
      baseUrl: process.env.VISION_BASE_URL ?? base.baseUrl,
      model: process.env.VISION_MODEL ?? "",
    };
  }
  if (role === "answer") {
    // 各项缺省回落主模型 → 不配也能用 deepseek 补答案
    return {
      apiKey: process.env.ANSWER_API_KEY ?? base.apiKey,
      baseUrl: process.env.ANSWER_BASE_URL ?? base.baseUrl,
      model: process.env.ANSWER_MODEL || base.model,
    };
  }
  return base;
}

export function isConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

// 视觉模型需 apiKey 和 model 都齐全才算可用（model 是预留插槽，用户后配）
export function isVisionConfigured(): boolean {
  const { apiKey, model } = getConfigFor("vision");
  return Boolean(apiKey && model);
}

export class DeepSeekNotConfiguredError extends Error {
  constructor() {
    super("尚未配置 DEEPSEEK_API_KEY，请在 .env.local 中填入你的 DeepSeek API key");
    this.name = "DeepSeekNotConfiguredError";
  }
}

export class VisionModelNotConfiguredError extends Error {
  constructor() {
    super("尚未配置视觉识别模型（VISION_MODEL），暂时无法从图片识别题目，请改用粘贴文本");
    this.name = "VisionModelNotConfiguredError";
  }
}

// 一次性返回完整结果
export async function chat(
  messages: ChatMessage[],
  options: { temperature?: number; role?: ModelRole } = {}
): Promise<string> {
  const role = options.role ?? "primary";
  const { apiKey, baseUrl, model } = getConfigFor(role);
  if (role === "vision" && !model) throw new VisionModelNotConfiguredError();
  if (!apiKey) throw new DeepSeekNotConfiguredError();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek 接口错误 ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// 流式返回，逐块输出文本，供 ReadableStream 使用
export async function* chatStream(
  messages: ChatMessage[],
  options: { temperature?: number; role?: ModelRole } = {}
): AsyncGenerator<string> {
  const role = options.role ?? "primary";
  const { apiKey, baseUrl, model } = getConfigFor(role);
  if (role === "vision" && !model) throw new VisionModelNotConfiguredError();
  if (!apiKey) throw new DeepSeekNotConfiguredError();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek 接口错误 ${res.status}: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // 忽略不完整的 JSON 片段
      }
    }
  }
}
