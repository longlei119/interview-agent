import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isValidDifficulty } from "@/lib/directions";

// 改题：作者本人。可改内容、切换 visibility、移动话题；manualHeat 仅管理员可调。
// 方向不在此改（方向跟随个人方向）。
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
  const question = await prisma.question.findFirst({
    where: { id, deletedAt: null },
  });
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  const isOwner = question.ownerId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "无权修改该题" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // 内容字段：作者本人才能改
  if (isOwner) {
    if (body.difficulty !== undefined) {
      if (!isValidDifficulty(body.difficulty)) {
        return NextResponse.json({ error: "难度不在可选范围内" }, { status: 400 });
      }
      data.difficulty = body.difficulty;
    }
    if (typeof body.title === "string") data.title = body.title.trim();
    if (typeof body.body === "string") data.body = body.body.trim();
    if (typeof body.referenceAnswer === "string")
      data.referenceAnswer = body.referenceAnswer.trim();
    if (typeof body.detailedAnswer === "string")
      data.detailedAnswer = body.detailedAnswer.trim();
    if (typeof body.tags === "string") data.tags = body.tags.trim();
    if (body.visibility === "public" || body.visibility === "private") {
      data.visibility = body.visibility;
    }
    if (typeof body.forceHidden === "boolean") {
      data.forceHidden = body.forceHidden;
    }
    // 移动话题：null = 未分类；非空必须是自己的话题
    if (body.topicId !== undefined) {
      if (body.topicId === null) {
        data.topicId = null;
      } else {
        const topic = await prisma.topic.findFirst({
          where: { id: body.topicId, userId: user.id },
        });
        if (!topic) {
          return NextResponse.json({ error: "话题不存在" }, { status: 404 });
        }
        data.topicId = body.topicId;
      }
    }
  }

  // manualHeat 仅管理员可调
  if (body.manualHeat !== undefined) {
    if (!isAdmin) {
      return NextResponse.json({ error: "只有管理员能调整热度" }, { status: 403 });
    }
    const n = Number(body.manualHeat);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "热度必须是非负数字" }, { status: 400 });
    }
    data.manualHeat = Math.floor(n);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  await prisma.question.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

// 软删除：作者或管理员。保住别人的练习记录，避免级联误删。
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
  const question = await prisma.question.findFirst({
    where: { id, deletedAt: null },
  });
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  const isOwner = question.ownerId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "无权删除该题" }, { status: 403 });
  }

  // 软删题目：同步把试卷里指向它的 TestPaperItem 一并删掉，
  // 这样试卷的题数、take/edit/result 页都不会再看到这道题。
  // 题目本体走软删保留（保住别人的练习记录、可恢复），
  // 但试卷关联是硬删——因为试卷编辑页不允许保留无主 item。
  await prisma.$transaction([
    prisma.question.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.testPaperItem.deleteMany({ where: { questionId: id } }),
  ]);
  return NextResponse.json({ ok: true });
}
