import { describe, expect, it } from "vitest";
import { resolveDefaultVoiceMode } from "@/lib/voice-mode";

describe("resolveDefaultVoiceMode", () => {
  it("浏览器支持实时识别时优先使用 native", () => {
    expect(
      resolveDefaultVoiceMode({
        nativeSupported: true,
        serverConfigured: true,
      })
    ).toBe("native");
  });

  it("原生不支持且后端已配置时退回 server", () => {
    expect(
      resolveDefaultVoiceMode({
        nativeSupported: false,
        serverConfigured: true,
      })
    ).toBe("server");
  });

  it("两者都不可用时仍返回 native，由上层给出不支持提示", () => {
    expect(
      resolveDefaultVoiceMode({
        nativeSupported: false,
        serverConfigured: false,
      })
    ).toBe("native");
  });
});
