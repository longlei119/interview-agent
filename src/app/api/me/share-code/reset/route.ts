import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateShareCode, canResetShareCode } from "@/lib/share-code";

export async function POST() {
  try {
    const user = await requireUser();
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: { shareCode: true, shareCodeSetAt: true },
    });
    if (!full) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (full.shareCodeSetAt && !canResetShareCode(full.shareCodeSetAt)) {
      return NextResponse.json({ error: "每天只能重置一次分享码" }, { status: 429 });
    }

    const newCode = await generateShareCode(prisma);
    await prisma.user.update({
      where: { id: user.id },
      data: { shareCode: newCode, shareCodeSetAt: new Date() },
    });

    return NextResponse.json({ ok: true, shareCode: newCode });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "重置失败" }, { status: 500 });
  }
}
