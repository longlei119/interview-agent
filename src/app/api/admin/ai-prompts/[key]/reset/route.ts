import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_PROMPTS, isPromptKey, sanitizeAiPromptConfig } from "@/lib/ai-prompts";

function authError(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  const status = msg === "FORBIDDEN" ? 403 : 401;
  return NextResponse.json({ error: status === 403 ? "无权限" : "未登录" }, { status });
}

export async function POST(
  _req: Request,
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

  const prompt = DEFAULT_PROMPTS[key];
  const updated = await prisma.aiPromptConfig.upsert({
    where: { key },
    update: {
      title: prompt.title,
      description: prompt.description,
      category: prompt.category,
      content: prompt.content,
      variables: JSON.stringify(prompt.variables),
      enabled: true,
      updatedById: admin.id,
    },
    create: {
      key,
      title: prompt.title,
      description: prompt.description,
      category: prompt.category,
      content: prompt.content,
      variables: JSON.stringify(prompt.variables),
      enabled: true,
      updatedById: admin.id,
    },
  });

  return NextResponse.json({ ok: true, item: sanitizeAiPromptConfig(updated) });
}
