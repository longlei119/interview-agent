import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isValidDirection } from "@/lib/directions";

// 设置个人方向（User.direction）。方向是用户属性，不进话题树。
export async function PATCH(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { direction } = await req.json();
  if (!isValidDirection(direction)) {
    return NextResponse.json({ error: "方向不在可选范围内" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { direction },
  });
  return NextResponse.json({ ok: true });
}
