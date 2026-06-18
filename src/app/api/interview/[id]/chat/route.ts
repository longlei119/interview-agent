import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { chatStream, DeepSeekNotConfiguredError, type ChatMessage } from "@/lib/deepseek";
import { interviewerSystemPrompt } from "@/lib/prompts";

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
  const { answer } = await req.json();

  const interview = await prisma.interviewSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!interview || interview.userId !== session.userId) {
    return NextResponse.json({ error: "面试会话不存在" }, { status: 404 });
  }
  if (interview.status !== "active") {
    return NextResponse.json({ error: "该面试已结束" }, { status: 400 });
  }
  if (!answer || !answer.trim()) {
    return NextResponse.json({ error: "回答不能为空" }, { status: 400 });
  }

  // 存候选人这次的回答
  await prisma.interviewMessage.create({
    data: { sessionId: interview.id, role: "candidate", content: answer },
  });

  // 组装发给模型的消息：system + 历史对话 + 本次回答
  const history: ChatMessage[] = [
    {
      role: "system",
      content: await interviewerSystemPrompt(interview.role, interview.level),
    },
    ...interview.messages.map((m): ChatMessage => ({
      role: m.role === "interviewer" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: answer },
  ];

  try {
    const encoder = new TextEncoder();
    let full = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of chatStream(history, { temperature: 0.8 })) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } catch (err) {
          const msg =
            err instanceof DeepSeekNotConfiguredError
              ? "【未配置 DeepSeek API key，无法继续面试】"
              : "【AI 服务异常，请稍后重试】";
          controller.enqueue(encoder.encode(msg));
          full = full || msg;
        } finally {
          // 落库面试官回复
          if (full) {
            await prisma.interviewMessage.create({
              data: { sessionId: interview.id, role: "interviewer", content: full },
            });
          }
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "对话失败，请稍后重试" }, { status: 500 });
  }
}
