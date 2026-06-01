export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function getConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  return { apiKey, baseUrl, model };
}

export function isConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export class DeepSeekNotConfiguredError extends Error {
  constructor() {
    super("尚未配置 DEEPSEEK_API_KEY，请在 .env.local 中填入你的 DeepSeek API key");
    this.name = "DeepSeekNotConfiguredError";
  }
}

// 一次性返回完整结果
export async function chat(
  messages: ChatMessage[],
  options: { temperature?: number } = {}
): Promise<string> {
  const { apiKey, baseUrl, model } = getConfig();
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
  options: { temperature?: number } = {}
): AsyncGenerator<string> {
  const { apiKey, baseUrl, model } = getConfig();
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
