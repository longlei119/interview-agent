import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { syncDefaultPrompts } from "@/lib/ai-prompts";

function authError(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  const status = msg === "FORBIDDEN" ? 403 : 401;
  return NextResponse.json({ error: status === 403 ? "无权限" : "未登录" }, { status });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return authError(e);
  }

  const items = await syncDefaultPrompts();
  return NextResponse.json({ items });
}
