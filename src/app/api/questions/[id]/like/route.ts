import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// 点赞切换：每用户对每题一次，可取消。非作者本人才计入热度去重表。
// likeCount 与 QuestionLike 行数保持一致。
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
  const question = await prisma.question.findFirst({
    where: { id, deletedAt: null },
  });
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }
  // 只能点赞公开题（或自己的题）
  const visible =
    question.ownerId === user.id ||
    (question.visibility === "public" && !question.isDelisted);
  if (!visible) {
    return NextResponse.json({ error: "无权访问该题" }, { status: 403 });
  }

  const existing = await prisma.questionLike.findUnique({
    where: { userId_questionId: { userId: user.id, questionId: id } },
  });

  let liked: boolean;
  if (existing) {
    // 取消点赞
    await prisma.$transaction([
      prisma.questionLike.delete({ where: { id: existing.id } }),
      prisma.question.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    liked = false;
  } else {
    await prisma.$transaction([
      prisma.questionLike.create({ data: { userId: user.id, questionId: id } }),
      prisma.question.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    liked = true;
  }

  const fresh = await prisma.question.findUnique({
    where: { id },
    select: { likeCount: true },
  });
  return NextResponse.json({ ok: true, liked, likeCount: fresh?.likeCount ?? 0 });
}
