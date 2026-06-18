import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ExamPanel } from "@/components/ExamPanel";
import { Button, EmptyState, Icon } from "@/components/ui";

export default async function TakePaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/paper");

  const { id } = await params;
  const paper = await prisma.testPaper.findFirst({
    where: { id, userId: user.id },
    include: {
      items: {
        where: { question: { deletedAt: null } },
        orderBy: { sortOrder: "asc" },
        include: {
          question: {
            select: { id: true, title: true, body: true, difficulty: true },
          },
        },
      },
    },
  });
  if (!paper) notFound();

  if (paper.items.length === 0) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/paper"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
        >
          <Icon name="arrow-left" size={16} />
          返回试卷列表
        </Link>
        <EmptyState
          icon="file"
          title="这份试卷还没有题目"
          desc="去编辑页添加题目后再来作答"
          action={
            <Link href={`/paper/${paper.id}/edit`}>
              <Button leftIcon={<Icon name="edit" size={16} />}>去添加题目</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const questions = paper.items.map((item) => ({
    id: item.question.id,
    title: item.question.title,
    body: item.question.body,
    difficulty: item.question.difficulty,
  }));

  return (
    <div className="animate-fade-in">
      <Link
        href="/paper"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
      >
        <Icon name="arrow-left" size={16} />
        返回试卷列表
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-ink">{paper.title}</h1>
      <p className="mb-5 text-sm text-muted">
        {questions.length} 题
        {paper.timeLimit ? ` · 限时 ${paper.timeLimit} 分钟` : " · 不限时"}
      </p>
      <ExamPanel
        paperId={paper.id}
        paperTitle={paper.title}
        timeLimit={paper.timeLimit}
        questions={questions}
      />
    </div>
  );
}
