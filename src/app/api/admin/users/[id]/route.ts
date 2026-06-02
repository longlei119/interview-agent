import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// 管理员开关某用户的 canCreate（加题权限）。
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = msg === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "无权限" : "未登录" }, { status });
  }

  const { id } = await params;
  const body = await req.json();

  if (typeof body.canCreate !== "boolean") {
    return NextResponse.json({ error: "canCreate 必须是布尔值" }, { status: 400 });
  }
  // 不允许管理员关掉自己的加题权限，避免误操作把自己锁死
  if (id === admin.id && body.canCreate === false) {
    return NextResponse.json({ error: "不能关闭自己的加题权限" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { canCreate: body.canCreate },
  });
  return NextResponse.json({ ok: true });
}
