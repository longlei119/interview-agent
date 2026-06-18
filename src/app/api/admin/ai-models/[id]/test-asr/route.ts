import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function authError(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  const status = msg === "FORBIDDEN" ? 403 : 401;
  return NextResponse.json({ error: status === 403 ? "无权限" : "未登录" }, { status });
}

function summarizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer ***").slice(0, 500);
}

// 生成 1 秒静音 WAV（16kHz, 16-bit, mono）用于测试连接。
// 短样本会让部分 ASR 厂商（如 SiliconFlow SenseVoice）直接 500，必须给足时长。
function generateTestWav(): Buffer {
  const sampleRate = 16000;
  const bitsPerSample = 16;
  const channels = 1;
  const durationSec = 1;
  const byteRate = (sampleRate * bitsPerSample * channels) / 8;
  const blockAlign = (bitsPerSample * channels) / 8;
  const dataBytes = sampleRate * durationSec * blockAlign;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataBytes, 40);

  const data = Buffer.alloc(dataBytes); // 全 0 = 静音
  return Buffer.concat([header, data]);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (e) {
    return authError(e);
  }

  const { id } = await params;
  const config = await prisma.aiModelConfig.findUnique({ where: { id } });
  if (!config) {
    return NextResponse.json({ error: "模型配置不存在" }, { status: 404 });
  }

  try {
    const baseUrl = config.baseUrl.trim().replace(/\/+$/, "");
    const wavBuffer = generateTestWav();

    const form = new FormData();
    const wavBlob = new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" });
    form.append("file", wavBlob, "test.wav");
    form.append("model", config.model);
    form.append("language", "zh");
    form.append("response_format", "text");

    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const contentType = res.headers.get("content-type") || "";
    let resultText: string;
    if (contentType.includes("application/json")) {
      const data = await res.json();
      resultText = typeof data.text === "string" ? data.text : String(data.text ?? "");
    } else {
      resultText = await res.text();
    }

    await prisma.aiModelConfig.update({
      where: { id },
      data: { lastErrorAt: null, lastError: null },
    });

    return NextResponse.json({
      ok: true,
      message: "连接成功",
      replyPreview: resultText.slice(0, 80),
    });
  } catch (e) {
    const error = summarizeError(e);
    await prisma.aiModelConfig.update({
      where: { id },
      data: { lastErrorAt: new Date(), lastError: error },
    });
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
}
