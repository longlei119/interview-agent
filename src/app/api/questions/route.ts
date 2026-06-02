import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isValidDifficulty, isValidDirection } from "@/lib/directions";
import { ADMIN_DEFAULT_MANUAL_HEAT } from "@/lib/heat";

// 新建题目：登录 + canCreate。默认私有，归当前用户所有。
// 方向取用户个人方向（不再每题选）；可指定话题节点 topicId（null = 未分类）。
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!user.canCreate) {
    return NextResponse.json({ error: "你的加题权限已被管理员关闭" }, { status: 403 });
  }

  const { difficulty, title, body, referenceAnswer, tags, topicId } =
    await req.json();

  if (!difficulty || !title || !body) {
    return NextResponse.json(
      { error: "请填写难度、标题和题目内容" },
      { status: 400 }
    );
  }
  if (!isValidDifficulty(difficulty)) {
    return NextResponse.json({ error: "难度不在可选范围内" }, { status: 400 });
  }

  // 方向 = 个人方向（未设置则归「其他」）
  const direction = isValidDirection(user.direction ?? "") ? user.direction! : "其他";

  // 指定话题必须是自己的
  if (topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: topicId, userId: user.id },
    });
    if (!topic) {
      return NextResponse.json({ error: "话题不存在" }, { status: 404 });
    }
  }

  // 管理员建题默认带较高手动热度，让精选题天然靠前
  const manualHeat = user.role === "admin" ? ADMIN_DEFAULT_MANUAL_HEAT : 0;

  const question = await prisma.question.create({
    data: {
      ownerId: user.id,
      topicId: topicId ?? null,
      direction,
      difficulty,
      title: String(title).trim(),
      body: String(body).trim(),
      referenceAnswer: typeof referenceAnswer === "string" ? referenceAnswer.trim() : "",
      tags: typeof tags === "string" ? tags.trim() : "",
      visibility: "private",
      manualHeat,
    },
  });

  return NextResponse.json({ ok: true, id: question.id });
}
