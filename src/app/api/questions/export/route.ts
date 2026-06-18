import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { exportQuestionToFile } from "@/lib/export-question";

// 一键导出当前用户的所有题目到 exports/questions/方向/话题路径/标题.md。
// 串行导出（避免大量并发 fs 操作 + DB 查询），返回成功/失败计数。
export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const questions = await prisma.question.findMany({
    where: { ownerId: user.id, deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (questions.length === 0) {
    return NextResponse.json({ ok: true, total: 0, success: 0, failed: 0, message: "题库为空，无需导出" });
  }

  let success = 0;
  let failed = 0;
  for (const q of questions) {
    try {
      await exportQuestionToFile({ questionId: q.id });
      success++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    total: questions.length,
    success,
    failed,
    dir: "exports/questions",
  });
}
