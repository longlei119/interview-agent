import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// 重命名话题（作者本人）。
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
  const topic = await prisma.topic.findFirst({
    where: { id, userId: user.id },
  });
  if (!topic) {
    return NextResponse.json({ error: "话题不存在" }, { status: 404 });
  }

  const { name } = await req.json();
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return NextResponse.json({ error: "请填写话题名称" }, { status: 400 });
  }

  await prisma.topic.update({ where: { id }, data: { name: trimmed } });
  return NextResponse.json({ ok: true });
}

// 删除话题：子话题上提到父级，话题下的题目移到「未分类」（topicId=null），不级联删题。
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
  const topic = await prisma.topic.findFirst({
    where: { id, userId: user.id },
  });
  if (!topic) {
    return NextResponse.json({ error: "话题不存在" }, { status: 404 });
  }

  await prisma.$transaction([
    // 子话题上提到被删节点的父级
    prisma.topic.updateMany({
      where: { userId: user.id, parentId: id },
      data: { parentId: topic.parentId },
    }),
    // 该话题下的题移到未分类（onDelete:SetNull 也会处理，但显式更稳妥）
    prisma.question.updateMany({
      where: { ownerId: user.id, topicId: id },
      data: { topicId: null },
    }),
    prisma.topic.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
