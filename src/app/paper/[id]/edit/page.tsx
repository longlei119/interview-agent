import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildTopicTree } from "@/lib/topics";
import { PaperForm } from "@/components/PaperForm";
import Link from "next/link";
import { Icon } from "@/components/ui";

export default async function EditPaperPage({
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
      },
    },
  });
  if (!paper) notFound();

  const flatTopics = await prisma.topic.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  const tree = buildTopicTree(flatTopics);

  const questions = await prisma.question.findMany({
    where: { ownerId: user.id, deletedAt: null },
    select: {
      id: true,
      difficulty: true,
      title: true,
      topicId: true,
      topic: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const questionOptions = questions.map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    title: q.title,
    topic: q.topic?.name ?? null,
    topicId: q.topicId,
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
      <h1 className="mb-5 font-serif text-2xl font-bold text-ink">编辑试卷</h1>
      <PaperForm
        mode="edit"
        paperId={paper.id}
        userQuestions={questionOptions}
        topics={tree}
        initial={{
          title: paper.title,
          description: paper.description ?? "",
          timeLimit: paper.timeLimit,
          isPublic: paper.isPublic,
          questionIds: paper.items.map((item) => item.questionId),
        }}
      />
    </div>
  );
}
