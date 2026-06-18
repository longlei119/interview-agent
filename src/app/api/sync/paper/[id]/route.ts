import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { syncPaper } from "@/lib/sync";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id: paperId } = await params;

    const paper = await prisma.testPaper.findUnique({
      where: { id: paperId },
      select: { id: true, userId: true, isPublic: true },
    });
    if (!paper) {
      return NextResponse.json({ error: "试卷不存在" }, { status: 404 });
    }
    if (!paper.isPublic) {
      return NextResponse.json({ error: "试卷未公开" }, { status: 403 });
    }

    const record = await prisma.syncRecord.create({
      data: {
        fromUserId: paper.userId,
        toUserId: user.id,
        scope: "paper",
        scopeRefId: paperId,
        status: "pending",
      },
    });

    syncPaper(paperId, user.id, record.id);

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
