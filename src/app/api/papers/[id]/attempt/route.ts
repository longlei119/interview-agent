import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id: paperId } = await params;
  const paper = await prisma.testPaper.findFirst({
    where: { id: paperId, userId: user.id },
    include: { _count: { select: { items: true } } },
  });
  if (!paper) {
    return NextResponse.json({ error: "试卷不存在" }, { status: 404 });
  }
  if (paper._count.items === 0) {
    return NextResponse.json(
      { error: "试卷还没有题目" },
      { status: 400 }
    );
  }

  // Check no active attempt exists
  const active = await prisma.testPaperAttempt.findFirst({
    where: { paperId, userId: user.id, finishedAt: null },
  });
  if (active) {
    return NextResponse.json(
      { ok: true, attemptId: active.id, resumed: true }
    );
  }

  const attempt = await prisma.testPaperAttempt.create({
    data: { paperId, userId: user.id, answers: "{}", scores: "{}", feedbacks: "{}" },
  });
  return NextResponse.json({ ok: true, attemptId: attempt.id, resumed: false });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id: paperId } = await params;
  const { attemptId, answers } = await req.json();

  if (!attemptId) {
    return NextResponse.json(
      { error: "缺少 attemptId" },
      { status: 400 }
    );
  }

  const attempt = await prisma.testPaperAttempt.findFirst({
    where: { id: attemptId, userId: user.id, paperId },
  });
  if (!attempt) {
    return NextResponse.json(
      { error: "作答记录不存在" },
      { status: 404 }
    );
  }
  if (attempt.finishedAt) {
    return NextResponse.json(
      { error: "该试卷已提交，无法修改答案" },
      { status: 400 }
    );
  }

  // Merge answers
  const currentAnswers = JSON.parse(attempt.answers);
  const merged = { ...currentAnswers, ...(answers || {}) };

  await prisma.testPaperAttempt.update({
    where: { id: attemptId },
    data: { answers: JSON.stringify(merged) },
  });
  return NextResponse.json({ ok: true });
}
