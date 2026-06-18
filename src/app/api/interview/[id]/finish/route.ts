import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { chat, DeepSeekNotConfiguredError, type ChatMessage } from "@/lib/deepseek";
import {
  interviewerSystemPrompt,
  interviewSummaryPrompt,
  extractScore,
} from "@/lib/prompts";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const interview = await prisma.interviewSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!interview || interview.userId !== session.userId) {
    return NextResponse.json({ error: "面试会话不存在" }, { status: 404 });
  }
  if (interview.status === "finished") {
    return NextResponse.json({ summary: interview.summary, score: interview.score });
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: await interviewerSystemPrompt(interview.role, interview.level),
    },
    ...interview.messages.map((m): ChatMessage => ({
      role: m.role === "interviewer" ? "assistant" : "user",
      content: m.content,
    })),
    await interviewSummaryPrompt(),
  ];

  try {
    const summary = await chat(messages, { temperature: 0.4 });
    const score = extractScore(summary);

    await prisma.interviewSession.update({
      where: { id: interview.id },
      data: { status: "finished", summary, score },
    });

    return NextResponse.json({ summary, score });
  } catch (e) {
    if (e instanceof DeepSeekNotConfiguredError) {
      return NextResponse.json(
        { error: e.message, code: "NO_API_KEY" },
        { status: 503 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "生成总评失败，请稍后重试" }, { status: 500 });
  }
}
