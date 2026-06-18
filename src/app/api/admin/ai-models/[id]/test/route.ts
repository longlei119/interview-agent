import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { renderPrompt } from "@/lib/ai-prompts";

function authError(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  const status = msg === "FORBIDDEN" ? 403 : 401;
  return NextResponse.json({ error: status === 403 ? "无权限" : "未登录" }, { status });
}

function summarizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer ***").slice(0, 500);
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
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: await renderPrompt("admin.model.test") }],
        temperature: 0,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    await prisma.aiModelConfig.update({
      where: { id },
      data: { lastErrorAt: null, lastError: null },
    });

    return NextResponse.json({
      ok: true,
      message: "连接成功",
      replyPreview: typeof reply === "string" ? reply.slice(0, 80) : "",
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
