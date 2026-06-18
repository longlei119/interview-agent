import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ResultView } from "./ResultView";
import { Button, Card, Icon } from "@/components/ui";

export default async function PaperResultPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/paper");

  const { id: paperId, attemptId } = await params;

  const attempt = await prisma.testPaperAttempt.findFirst({
    where: { id: attemptId, userId: user.id, paperId },
    include: {
      paper: {
        include: {
          items: {
            where: { question: { deletedAt: null } },
            orderBy: { sortOrder: "asc" },
            include: {
              question: {
                select: { id: true, title: true, body: true, referenceAnswer: true, detailedAnswer: true, difficulty: true },
              },
            },
          },
        },
      },
    },
  });
  if (!attempt) notFound();
  if (!attempt.finishedAt) {
    redirect(`/paper/${paperId}/take`);
  }

  const items = attempt.paper.items;
  const answers: Record<string, string> = JSON.parse(attempt.answers);
  const scores: Record<string, number> = JSON.parse(attempt.scores);
  const feedbacks: Record<string, string> = JSON.parse(attempt.feedbacks);

  const questions = items.map((item) => ({
    id: item.question.id,
    title: item.question.title,
    body: item.question.body,
    referenceAnswer: item.question.referenceAnswer,
    detailedAnswer: item.question.detailedAnswer,
    difficulty: item.question.difficulty,
    userAnswer: answers[item.question.id] ?? "",
    score: scores[item.question.id] ?? 0,
    feedback: feedbacks[item.question.id] ?? "",
  }));

  const totalScore = attempt.totalScore;
  const passCount = questions.filter((q) => q.score >= 60).length;

  const startedMs = new Date(attempt.startedAt).getTime();
  const finishedMs = new Date(attempt.finishedAt!).getTime();
  const usedSeconds = Math.round((finishedMs - startedMs) / 1000);
  const usedMins = Math.floor(usedSeconds / 60);
  const usedSecs = usedSeconds % 60;

  const avgScore = questions.length > 0 ? Math.round(totalScore / questions.length) : 0;
  const scoreColor =
    avgScore >= 80
      ? "text-green"
      : avgScore >= 60
        ? "text-amber-600"
        : "text-brand-500";

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <Link
        href="/paper"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
      >
        <Icon name="arrow-left" size={16} />
        返回试卷列表
      </Link>

      <h1 className="mb-1 font-serif text-2xl font-bold text-ink">
        {attempt.paper.title} · 作答结果
      </h1>
      <p className="mb-5 text-sm text-muted">
        共 {questions.length} 题 · 用时 {usedMins} 分 {usedSecs} 秒
      </p>

      <Card padded className="mb-5 text-center">
        <div className={`text-5xl font-black tabular-nums ${scoreColor}`}>{avgScore}</div>
        <div className="mb-5 mt-1 text-xs text-muted">平均得分（100 分制）</div>
        <div className="flex justify-center gap-10">
          <div>
            <div className="text-lg font-bold text-ink">{passCount}/{questions.length}</div>
            <div className="text-xs text-muted">合格（≥60）</div>
          </div>
          <div>
            <div className="text-lg font-bold text-ink">{totalScore}</div>
            <div className="text-xs text-muted">总分</div>
          </div>
          <div>
            <div className="text-lg font-bold text-ink">{attempt.paper.timeLimit ?? "—"}</div>
            <div className="text-xs text-muted">限时（分钟）</div>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <ResultView
            key={q.id}
            index={i}
            title={q.title}
            difficulty={q.difficulty}
            userAnswer={q.userAnswer}
            referenceAnswer={q.referenceAnswer}
            detailedAnswer={q.detailedAnswer}
            feedback={q.feedback}
            score={q.score}
            defaultOpen={i === 0}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link href={`/paper/${paperId}/take`}>
          <Button leftIcon={<Icon name="play" size={16} />}>再来一次</Button>
        </Link>
        <Link href="/paper">
          <Button variant="secondary" leftIcon={<Icon name="list" size={16} />}>
            返回试卷列表
          </Button>
        </Link>
      </div>
    </div>
  );
}
