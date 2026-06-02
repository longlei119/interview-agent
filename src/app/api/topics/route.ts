import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// 新建话题节点：parentId 为 null = 根话题，否则挂在指定父话题下。
// 话题树是私人的，只能在自己的树里建。
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { name, parentId } = await req.json();
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return NextResponse.json({ error: "请填写话题名称" }, { status: 400 });
  }

  // 若指定父节点，必须是自己的话题
  if (parentId) {
    const parent = await prisma.topic.findFirst({
      where: { id: parentId, userId: user.id },
    });
    if (!parent) {
      return NextResponse.json({ error: "父话题不存在" }, { status: 404 });
    }
  }

  // 同级末尾排序
  const siblingCount = await prisma.topic.count({
    where: { userId: user.id, parentId: parentId ?? null },
  });

  const topic = await prisma.topic.create({
    data: {
      userId: user.id,
      parentId: parentId ?? null,
      name: trimmed,
      sortOrder: siblingCount,
    },
  });

  return NextResponse.json({ ok: true, id: topic.id });
}
