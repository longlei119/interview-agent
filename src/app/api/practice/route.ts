import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category");
  const where = category && category !== "全部" ? { category } : {};

  const questions = await prisma.question.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      difficulty: true,
      title: true,
      tags: true,
    },
  });

  return NextResponse.json({ questions });
}
