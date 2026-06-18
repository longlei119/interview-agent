import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const VALID_VISIBILITY = ["private", "public", "force_off"];

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { topicIds, visibility } = await req.json();

    if (!Array.isArray(topicIds) || topicIds.length === 0) {
      return NextResponse.json({ error: "请选择目录" }, { status: 400 });
    }
    if (!VALID_VISIBILITY.includes(visibility)) {
      return NextResponse.json({ error: "visibility 无效" }, { status: 400 });
    }

    // 只允许操作自己的 topic
    const owned = await prisma.topic.findMany({
      where: { id: { in: topicIds }, userId: user.id },
      select: { id: true },
    });
    if (owned.length !== topicIds.length) {
      return NextResponse.json({ error: "包含无权操作的目录" }, { status: 403 });
    }

    await prisma.topic.updateMany({
      where: { id: { in: topicIds } },
      data: { visibility },
    });

    return NextResponse.json({ ok: true, updated: topicIds.length });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
