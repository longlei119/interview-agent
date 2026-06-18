import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { questionIds, visibility } = await req.json();

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: "请选择题库" }, { status: 400 });
    }
    if (!["private", "public"].includes(visibility)) {
      return NextResponse.json({ error: "visibility 无效" }, { status: 400 });
    }

    // 只允许操作自己的题目
    const owned = await prisma.question.findMany({
      where: { id: { in: questionIds }, ownerId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (owned.length !== questionIds.length) {
      return NextResponse.json({ error: "包含无权操作的题目" }, { status: 403 });
    }

    await prisma.question.updateMany({
      where: { id: { in: questionIds } },
      data: { visibility },
    });

    return NextResponse.json({ ok: true, updated: questionIds.length });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
