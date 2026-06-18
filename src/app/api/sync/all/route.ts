import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { syncAll } from "@/lib/sync";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { shareCode } = await req.json();

    if (!shareCode) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const fromUser = await prisma.user.findUnique({
      where: { shareCode },
      select: { id: true },
    });
    if (!fromUser) {
      return NextResponse.json({ error: "分享码无效" }, { status: 404 });
    }

    const record = await prisma.syncRecord.create({
      data: {
        fromUserId: fromUser.id,
        toUserId: user.id,
        scope: "all",
        status: "pending",
      },
    });

    syncAll(fromUser.id, user.id, record.id);

    return NextResponse.json(
      { ok: true, syncRecordId: record.id, status: "pending" },
      { status: 202 },
    );
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
