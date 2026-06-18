import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isPromptKey, sanitizeAiPromptConfig } from "@/lib/ai-prompts";

function authError(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  const status = msg === "FORBIDDEN" ? 403 : 401;
  return NextResponse.json({ error: status === 403 ? "无权限" : "未登录" }, { status });
}

function validateContent(value: unknown) {
  const content = typeof value === "string" ? value.trim() : "";
  if (content.length < 2) return null;
  if (content.length > 12000) return null;
  return content;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return authError(e);
  }

  const { key } = await params;
  if (!isPromptKey(key)) {
    return NextResponse.json({ error: "无效的提示词 key" }, { status: 400 });
  }

  const body = await req.json();
  const data: { content?: string; enabled?: boolean; updatedById: string } = {
    updatedById: admin.id,
  };

  if (body.content !== undefined) {
    const content = validateContent(body.content);
    if (!content) {
      return NextResponse.json({ error: "提示词内容长度需在 20 到 12000 字之间" }, { status: 400 });
    }
    data.content = content;
  }

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled 必须是布尔值" }, { status: 400 });
    }
    data.enabled = body.enabled;
  }

  if (data.content === undefined && data.enabled === undefined) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const updated = await prisma.aiPromptConfig.update({ where: { key }, data });
  return NextResponse.json({ ok: true, item: sanitizeAiPromptConfig(updated) });
}
