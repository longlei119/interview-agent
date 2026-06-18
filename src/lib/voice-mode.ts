export type VoiceMode = "native" | "server";

interface ResolveVoiceModeOptions {
  nativeSupported: boolean;
  serverConfigured: boolean;
}

// 实时识别优先：浏览器原生可用时，默认走 native；
// 只有原生不可用且后端 ASR 已配置时，才默认退到 server。
export function resolveDefaultVoiceMode({
  nativeSupported,
  serverConfigured,
}: ResolveVoiceModeOptions): VoiceMode {
  if (nativeSupported) return "native";
  if (serverConfigured) return "server";
  return "native";
}
