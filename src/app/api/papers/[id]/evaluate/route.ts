import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { chat } from "@/lib/deepseek";
import { paperEvaluateMessages } from "@/lib/prompts";
import { extractEvalScore } from "@/lib/prompts";
import { validateAttemptAnswers, computeTotalScore } from "@/lib/paper-utils";
import type { ChatMessage } from "@/lib/deepseek";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id: paperId } = await params;
  const { attemptId } = await req.json();

  if (!attemptId) {
    return NextResponse.json(
      { error: "缺少 attemptId" },
      { status: 400 }
    );
  }

  const attempt = await prisma.testPaperAttempt.findFirst({
    where: { id: attemptId, userId: user.id, paperId },
  });
  if (!attempt) {
    return NextResponse.json(
      { error: "作答记录不存在" },
      { status: 404 }
    );
  }
  if (attempt.finishedAt) {
    return NextResponse.json(
      { error: "该试卷已评分，不可重复提交" },
      { status: 400 }
    );
  }

  // Load paper items with question data
  const items = await prisma.testPaperItem.findMany({
    where: { paperId },
    orderBy: { sortOrder: "asc" },
    include: {
      question: {
        select: { id: true, title: true, body: true, referenceAnswer: true },
      },
    },
  });

  const paperQuestionIds = items.map((item) => item.questionId);
  const currentAnswers: Record<string, string> = JSON.parse(attempt.answers);

  // Validate all questions answered
  const { valid, unanswered } = validateAttemptAnswers(currentAnswers, paperQuestionIds);
  if (!valid) {
    return NextResponse.json(
      {
        error: "还有题目未作答",
        unanswered,
      },
      { status: 400 }
    );
  }

  // Evaluate each answer
  const scores: Record<string, number> = {};
  const feedbacks: Record<string, string> = {};

  try {
    for (const item of items) {
      const { id: qid, title, body, referenceAnswer } = item.question;
      const userAnswer = currentAnswers[qid] || "";

      try {
        const messages: ChatMessage[] = await paperEvaluateMessages(
          { title, body, referenceAnswer },
          userAnswer
        );
        const aiResponse = await chat(messages, { role: "answer" });
        feedbacks[qid] = aiResponse;
        scores[qid] = extractEvalScore(aiResponse);
      } catch (aiError) {
        feedbacks[qid] = "AI 评分暂时不可用，请稍后重试";
        scores[qid] = 0;
      }
    }

    const totalScore = computeTotalScore(scores);

    await prisma.testPaperAttempt.update({
      where: { id: attemptId },
      data: {
        scores: JSON.stringify(scores),
        feedbacks: JSON.stringify(feedbacks),
        totalScore,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({ scores, feedbacks, totalScore });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "评分失败，请稍后重试" },
      { status: 500 }
    );
  }
}
