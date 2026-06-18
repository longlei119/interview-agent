import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  validatePaperInput,
  validatePaperItems,
  formatPaperResponse,
} from "@/lib/paper-utils";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const papers = await prisma.testPaper.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: papers.map((p) =>
      formatPaperResponse(p, p._count.items)
    ),
  });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { valid, errors } = validatePaperInput(body);
  if (!valid) {
    return NextResponse.json({ error: errors.join("；") }, { status: 400 });
  }

  const title = String(body.title).trim();
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const timeLimit =
    body.timeLimit !== null && body.timeLimit !== undefined && body.timeLimit !== ""
      ? Number(body.timeLimit)
      : null;
  const isPublic = body.isPublic === true || body.isPublic === "true";
  const questionIds: string[] = body.questionIds;

  // Validate all questions exist and are owned by user
  const ownedQuestions = await prisma.question.findMany({
    where: {
      id: { in: questionIds },
      ownerId: user.id,
      deletedAt: null,
    },
    select: { id: true },
  });
  const ownedIds = new Set(ownedQuestions.map((q) => q.id));
  const itemValidation = validatePaperItems(questionIds, ownedIds);
  if (!itemValidation.valid) {
    return NextResponse.json(
      { error: itemValidation.errors.join("；") },
      { status: 400 }
    );
  }

  try {
    const paper = await prisma.testPaper.create({
      data: {
        userId: user.id,
        title,
        description,
        timeLimit,
        isPublic,
        items: {
          create: questionIds.map((qid, i) => ({
            questionId: qid,
            sortOrder: i,
          })),
        },
      },
    });
    return NextResponse.json({ ok: true, id: paper.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "创建试卷失败，请稍后重试" },
      { status: 500 }
    );
  }
}
