import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// 拉取到我的题库：复制一份归自己的私有副本，源题 cloneCount +1。
// 副本独立存在，源题被删不影响副本。
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const source = await prisma.question.findFirst({
    where: { id, deletedAt: null },
  });
  if (!source) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }
  // 只能拉取公开且未下架的题；自己的题不必拉取
  if (source.ownerId === user.id) {
    return NextResponse.json({ error: "这已经是你自己的题了" }, { status: 400 });
  }
  if (source.visibility !== "public" || source.isDelisted) {
    return NextResponse.json({ error: "该题不可拉取" }, { status: 403 });
  }

  const [copy] = await prisma.$transaction([
    prisma.question.create({
      data: {
        ownerId: user.id,
        topicId: null, // 拉取来的题进「未分类」——对方的话题树和你的不同，自己再归类
        direction: source.direction,
        difficulty: source.difficulty,
        title: source.title,
        body: source.body,
        referenceAnswer: source.referenceAnswer,
        detailedAnswer: source.detailedAnswer,
        answerGeneratedByAi: source.answerGeneratedByAi, // AI 答案标记跟随副本，方便核对
        tags: source.tags,
        visibility: "private",
        sourceId: source.id,
      },
    }),
    prisma.question.update({
      where: { id: source.id },
      data: { cloneCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ ok: true, id: copy.id });
}
