import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { chat, DeepSeekNotConfiguredError } from "@/lib/deepseek";
import { interviewerSystemPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { role, level } = await req.json();
  if (!role || !level) {
    return NextResponse.json({ error: "请选择岗位和级别" }, { status: 400 });
  }

  try {
    // 生成面试官开场白
    const opening = await chat(
      [{ role: "system", content: interviewerSystemPrompt(role, level) }],
      { temperature: 0.8 }
    );

    const interview = await prisma.interviewSession.create({
      data: {
        userId: session.userId,
        role,
        level,
        status: "active",
        messages: {
          create: { role: "interviewer", content: opening },
        },
      },
    });

    return NextResponse.json({ sessionId: interview.id });
  } catch (e) {
    if (e instanceof DeepSeekNotConfiguredError) {
      return NextResponse.json(
        { error: e.message, code: "NO_API_KEY" },
        { status: 503 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "创建面试失败，请稍后重试" }, { status: 500 });
  }
}
