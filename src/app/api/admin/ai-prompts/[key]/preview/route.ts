import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPromptConfig, isPromptKey, renderTemplate } from "@/lib/ai-prompts";

function authError(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  const status = msg === "FORBIDDEN" ? 403 : 401;
  return NextResponse.json({ error: status === 403 ? "无权限" : "未登录" }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await requireAdmin();
  } catch (e) {
    return authError(e);
  }

  const { key } = await params;
  if (!isPromptKey(key)) {
    return NextResponse.json({ error: "无效的提示词 key" }, { status: 400 });
  }

  const body = await req.json();
  const variables = body && typeof body.variables === "object" && !Array.isArray(body.variables)
    ? body.variables as Record<string, unknown>
    : {};
  const content = typeof body?.content === "string" ? body.content : undefined;
  const prompt = await getPromptConfig(key);
  const rendered = renderTemplate(content ?? prompt.content, variables, prompt.variables);

  return NextResponse.json({ rendered });
}
