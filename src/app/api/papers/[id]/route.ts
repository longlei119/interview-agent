import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  validatePaperInput,
  validatePaperItems,
  parseIsPublic,
} from "@/lib/paper-utils";

export async function GET(
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
  const paper = await prisma.testPaper.findFirst({
    where: { id, userId: user.id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          question: {
            select: { id: true, title: true, difficulty: true },
          },
        },
      },
    },
  });
  if (!paper) {
    return NextResponse.json({ error: "试卷不存在" }, { status: 404 });
  }

  return NextResponse.json({
    id: paper.id,
    title: paper.title,
    description: paper.description,
    timeLimit: paper.timeLimit,
    isPublic: paper.isPublic,
    createdAt: paper.createdAt.toISOString(),
    updatedAt: paper.updatedAt.toISOString(),
    items: paper.items.map((item) => ({
      id: item.id,
      questionId: item.question.id,
      questionTitle: item.question.title,
      questionDifficulty: item.question.difficulty,
      sortOrder: item.sortOrder,
    })),
  });
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

  const { id } = await params;
  const paper = await prisma.testPaper.findFirst({
    where: { id, userId: user.id },
  });
  if (!paper) {
    return NextResponse.json({ error: "试卷不存在" }, { status: 404 });
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) {
    const title = body.title.trim();
    if (title.length > 200) {
      return NextResponse.json(
        { error: "标题不能超过 200 字" },
        { status: 400 }
      );
    }
    updateData.title = title;
  }
  if (typeof body.description === "string") {
    updateData.description = body.description.trim();
  }
  if (body.timeLimit !== undefined) {
    updateData.timeLimit =
      body.timeLimit !== null && body.timeLimit !== ""
        ? Number(body.timeLimit)
        : null;
  }
  if (body.isPublic !== undefined) {
    updateData.isPublic = parseIsPublic(body.isPublic);
  }

  try {
    // If questionIds provided, replace all items
    if (Array.isArray(body.questionIds) && body.questionIds.length > 0) {
      const questionIds: string[] = body.questionIds;
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

      await prisma.testPaperItem.deleteMany({ where: { paperId: id } });
      await prisma.testPaperItem.createMany({
        data: questionIds.map((qid, i) => ({
          paperId: id,
          questionId: qid,
          sortOrder: i,
        })),
      });
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.testPaper.update({
        where: { id },
        data: updateData,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "更新试卷失败，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
  const paper = await prisma.testPaper.findFirst({
    where: { id, userId: user.id },
  });
  if (!paper) {
    return NextResponse.json({ error: "试卷不存在" }, { status: 404 });
  }

  try {
    await prisma.testPaper.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "删除试卷失败，请稍后重试" },
      { status: 500 }
    );
  }
}
