import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 syncRecordId" }, { status: 400 });
    }

    const record = await prisma.syncRecord.findFirst({
      where: { id, toUserId: user.id },
    });
    if (!record) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      status: record.status,
      progress:
        record.status === "done"
          ? {
              createdTopics: record.newTopicCount,
              createdQuestions: record.createdCount,
              skippedQuestions: record.skippedCount,
              newPapers: record.newPaperCount,
            }
          : undefined,
      error: record.status === "failed" ? record.error : undefined,
    });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
