import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { syncTopics } from "@/lib/sync";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { shareCode, topicIds } = await req.json();

    if (!shareCode || !Array.isArray(topicIds) || topicIds.length === 0) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const fromUser = await prisma.user.findUnique({
      where: { shareCode },
      select: { id: true },
    });
    if (!fromUser) {
      return NextResponse.json({ error: "分享码无效" }, { status: 404 });
    }

    // 越权检查：topicIds 必须属于 fromUser
    const owned = await prisma.topic.findMany({
      where: { id: { in: topicIds }, userId: fromUser.id },
      select: { id: true },
    });
    if (owned.length !== topicIds.length) {
      return NextResponse.json({ error: "包含无权同步的目录" }, { status: 403 });
    }

    const record = await prisma.syncRecord.create({
      data: {
        fromUserId: fromUser.id,
        toUserId: user.id,
        scope: "topic",
        status: "pending",
      },
    });

    syncTopics(fromUser.id, topicIds, user.id, record.id);

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
