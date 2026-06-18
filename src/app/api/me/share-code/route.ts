import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: { shareCode: true, shareCodeSetAt: true },
    });
    if (!full?.shareCode) {
      return NextResponse.json({ error: "分享码不存在" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      shareCode: full.shareCode,
      shareCodeSetAt: full.shareCodeSetAt,
    });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
