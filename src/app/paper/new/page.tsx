import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildTopicTree } from "@/lib/topics";
import { PaperForm } from "@/components/PaperForm";

export default async function NewPaperPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/paper/new");

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
      <h1 className="mb-5 font-serif text-2xl font-bold text-ink">创建试卷</h1>
      <PaperForm mode="create" userQuestions={questionOptions} topics={tree} />
    </div>
  );
}
