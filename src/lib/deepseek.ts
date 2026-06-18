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

export type ModelRole = "primary" | "vision" | "answer" | "asr";

interface ResolvedModelConfig {
  source: "db" | "env";
  id?: string;
  role: ModelRole;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function envValue(value: string | undefined): string {
  return value?.trim() ?? "";
}

function getEnvConfigFor(role: ModelRole): ResolvedModelConfig | null {
  const primary = {
    apiKey: envValue(process.env.DEEPSEEK_API_KEY),
    baseUrl: trimBaseUrl(envValue(process.env.DEEPSEEK_BASE_URL) || "https://api.deepseek.com"),
    model: envValue(process.env.DEEPSEEK_MODEL) || "deepseek-chat",
  };

  if (role === "primary") {
    if (!primary.apiKey || !primary.model) return null;
    return { source: "env", role, name: "环境变量主模型", ...primary };
  }

  if (role === "answer") {
    const config = {
      apiKey: envValue(process.env.ANSWER_API_KEY) || primary.apiKey,
      baseUrl: trimBaseUrl(envValue(process.env.ANSWER_BASE_URL) || primary.baseUrl),
      model: envValue(process.env.ANSWER_MODEL) || primary.model,
    };
    if (!config.apiKey || !config.model) return null;
    return { source: "env", role, name: "环境变量答案模型", ...config };
  }

  if (role === "vision") {
    const config = {
      apiKey: envValue(process.env.VISION_API_KEY) || primary.apiKey,
      baseUrl: trimBaseUrl(envValue(process.env.VISION_BASE_URL) || primary.baseUrl),
      model: envValue(process.env.VISION_MODEL),
    };
    if (!config.apiKey || !config.model) return null;
    return { source: "env", role, name: "环境变量视觉模型", ...config };
  }

  if (role === "asr") {
    const config = {
      apiKey: envValue(process.env.ASR_API_KEY) || primary.apiKey,
      baseUrl: trimBaseUrl(envValue(process.env.ASR_BASE_URL) || primary.baseUrl),
      model: envValue(process.env.ASR_MODEL) || "whisper-1",
    };
    if (!config.apiKey || !config.model) return null;
    return { source: "env", role, name: "环境变量语音识别模型", ...config };
  }

  return null;
}

async function getDbConfigsFor(role: ModelRole): Promise<ResolvedModelConfig[]> {
  const { prisma } = await import("./db");
  const rows = await prisma.aiModelConfig.findMany({
    where: { role, enabled: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows
    .filter((row) => row.apiKey.trim() && row.baseUrl.trim() && row.model.trim())
    .map((row) => ({
      source: "db" as const,
      id: row.id,
      role,
      name: row.name,
      apiKey: row.apiKey.trim(),
      baseUrl: trimBaseUrl(row.baseUrl),
      model: row.model.trim(),
    }));
}

async function resolveModelConfigs(role: ModelRole): Promise<ResolvedModelConfig[]> {
  const configs = await getDbConfigsFor(role);
  const envConfig = getEnvConfigFor(role);
  if (envConfig) configs.push(envConfig);

  if (role === "answer") {
    const primaryConfigs = await getDbConfigsFor("primary");
    configs.push(
      ...primaryConfigs.map((config) => ({ ...config, role, name: `${config.name}（主模型兜底）` }))
    );
    const primaryEnv = getEnvConfigFor("primary");
    if (primaryEnv) {
      configs.push({ ...primaryEnv, role, name: "环境变量主模型兜底" });
    }
  }

  return configs;
}

function summarizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer ***").slice(0, 500);
}

async function recordModelFailure(config: ResolvedModelConfig, error: unknown) {
  if (config.source !== "db" || !config.id) return;
  try {
    const { prisma } = await import("./db");
    await prisma.aiModelConfig.update({
      where: { id: config.id },
      data: { lastErrorAt: new Date(), lastError: summarizeError(error) },
    });
  } catch {
    // 失败记录不应影响用户请求。
  }
}

async function clearModelFailure(config: ResolvedModelConfig) {
  if (config.source !== "db" || !config.id) return;
  try {
    const { prisma } = await import("./db");
    await prisma.aiModelConfig.update({
      where: { id: config.id },
      data: { lastErrorAt: null, lastError: null },
    });
  } catch {
    // 成功清理失败状态不是关键路径。
  }
}

function buildChatBody(
  model: string,
  messages: ChatMessage[],
  temperature: number,
  stream: boolean
) {
  return JSON.stringify({ model, messages, temperature, stream });
}

async function requestChat(config: ResolvedModelConfig, messages: ChatMessage[], temperature: number) {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: buildChatBody(config.model, messages, temperature, false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new DeepSeekApiError(res.status, text);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("AI 接口返回格式异常：缺少 choices[0].message.content");
  }
  return content;
}

async function openChatStream(
  config: ResolvedModelConfig,
  messages: ChatMessage[],
  temperature: number
): Promise<Response> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: buildChatBody(config.model, messages, temperature, true),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new DeepSeekApiError(res.status, text);
  }
  return res;
}

async function* readChatStream(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader();
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

export function isConfigured(): boolean {
  return Boolean(getEnvConfigFor("primary"));
}

export async function isVisionConfigured(): Promise<boolean> {
  return (await resolveModelConfigs("vision")).length > 0;
}

export async function isAsrConfigured(): Promise<boolean> {
  return (await resolveModelConfigs("asr")).length > 0;
}

export async function getEnvFallbackStatus() {
  const toStatus = (role: ModelRole) => {
    const config = getEnvConfigFor(role);
    return config
      ? { configured: true, baseUrl: config.baseUrl, model: config.model }
      : { configured: false };
  };

  return {
    primary: toStatus("primary"),
    answer: toStatus("answer"),
    vision: toStatus("vision"),
    asr: toStatus("asr"),
  };
}

export class DeepSeekNotConfiguredError extends Error {
  constructor() {
    super("尚未配置可用的 AI 模型，请在管理后台配置模型，或设置环境变量兜底");
    this.name = "DeepSeekNotConfiguredError";
  }
}

export class VisionModelNotConfiguredError extends Error {
  constructor() {
    super("尚未配置可用的视觉识别模型，请在管理后台配置视觉模型，或改用粘贴文本");
    this.name = "VisionModelNotConfiguredError";
  }
}

export class DeepSeekApiError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`AI 接口错误 ${status}: ${body}`);
    this.name = "DeepSeekApiError";
    this.status = status;
  }
}

export async function chat(
  messages: ChatMessage[],
  options: { temperature?: number; role?: ModelRole } = {}
): Promise<string> {
  const role = options.role ?? "primary";
  const configs = await resolveModelConfigs(role);
  if (configs.length === 0) {
    if (role === "vision") throw new VisionModelNotConfiguredError();
    throw new DeepSeekNotConfiguredError();
  }

  let lastError: unknown;
  for (const config of configs) {
    try {
      const result = await requestChat(config, messages, options.temperature ?? 0.7);
      await clearModelFailure(config);
      return result;
    } catch (error) {
      lastError = error;
      await recordModelFailure(config, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI 模型全部调用失败");
}

export async function* chatStream(
  messages: ChatMessage[],
  options: { temperature?: number; role?: ModelRole } = {}
): AsyncGenerator<string> {
  const role = options.role ?? "primary";
  const configs = await resolveModelConfigs(role);
  if (configs.length === 0) throw new DeepSeekNotConfiguredError();

  let lastError: unknown;
  for (const config of configs) {
    try {
      const res = await openChatStream(config, messages, options.temperature ?? 0.7);
      await clearModelFailure(config);
      yield* readChatStream(res);
      return;
    } catch (error) {
      lastError = error;
      await recordModelFailure(config, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI 模型全部调用失败");
}

// 语音识别转文字（/audio/transcriptions）
export async function transcribeAudio(audioFile: Blob): Promise<string> {
  const configs = await resolveModelConfigs("asr");
  if (configs.length === 0) {
    throw new DeepSeekNotConfiguredError();
  }

  let lastError: unknown;
  for (const config of configs) {
    try {
      const form = new FormData();
      form.append("file", audioFile);
      form.append("model", config.model);
      form.append("language", "zh");
      form.append("response_format", "text");

      const res = await fetch(`${config.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new DeepSeekApiError(res.status, text);
      }

      const contentType = res.headers.get("content-type") || "";
      let text: string;
      if (contentType.includes("application/json")) {
        const data = await res.json();
        text = typeof data.text === "string" ? data.text : String(data.text ?? "");
      } else {
        text = await res.text();
      }

      const result = text.trim();
      await clearModelFailure(config);
      return result;
    } catch (error) {
      lastError = error;
      await recordModelFailure(config, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("语音识别模型全部调用失败");
}
