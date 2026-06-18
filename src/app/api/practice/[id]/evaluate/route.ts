import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { chat, DeepSeekNotConfiguredError } from "@/lib/deepseek";
import { evaluateAnswerMessages, extractEvalScore } from "@/lib/prompts";

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
  const { userAnswer } = await req.json();

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  try {
    const feedback = await chat(
      await evaluateAnswerMessages(
        {
          title: question.title,
          body: question.body,
          referenceAnswer: question.referenceAnswer,
        },
        userAnswer ?? ""
      ),
      { temperature: 0.5 }
    );

    const score = extractEvalScore(feedback);

    await prisma.practiceRecord.create({
      data: {
        userId: session.userId,
        questionId: question.id,
        userAnswer: userAnswer ?? "",
        aiFeedback: feedback,
        score,
      },
    });

    return NextResponse.json({ feedback, score });
  } catch (e) {
    if (e instanceof DeepSeekNotConfiguredError) {
      return NextResponse.json(
        { error: e.message, code: "NO_API_KEY" },
        { status: 503 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "AI 点评失败，请稍后重试" }, { status: 500 });
  }
}
