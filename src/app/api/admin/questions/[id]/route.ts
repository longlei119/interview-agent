import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// 管理员下架/恢复公开题，或调整手动热度 manualHeat。
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = msg === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "无权限" : "未登录" }, { status });
  }

  const { id } = await params;
  const body = await req.json();

  const question = await prisma.question.findFirst({
    where: { id, deletedAt: null },
  });
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.isDelisted === "boolean") {
    data.isDelisted = body.isDelisted;
  }
  if (body.manualHeat !== undefined) {
    const n = Number(body.manualHeat);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "热度必须是非负数字" }, { status: 400 });
    }
    data.manualHeat = Math.floor(n);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  await prisma.question.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
