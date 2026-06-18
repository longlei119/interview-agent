import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildTopicTree, flattenForSelect } from "@/lib/topics";
import { QuestionForm } from "@/components/QuestionForm";
import { Card, ErrorBanner, Icon } from "@/components/ui";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?from=/practice/${id}/edit`);

  const question = await prisma.question.findFirst({
    where: { id, deletedAt: null },
  });
  if (!question) notFound();

  if (question.ownerId !== user.id) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <Link
          href={`/practice/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
        >
          <Icon name="arrow-left" size={16} />
          返回题目
        </Link>
        <Card padded>
          <ErrorBanner>这道题不是你创建的，无法编辑。</ErrorBanner>
        </Card>
      </div>
    );
  }

  const flatTopics = await prisma.topic.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  const topicOptions = flattenForSelect(buildTopicTree(flatTopics));

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <Link
        href={`/practice/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
      >
        <Icon name="arrow-left" size={16} />
        返回题目
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-ink">编辑题目</h1>
      <Card padded>
        <QuestionForm
          questionId={question.id}
          topicOptions={topicOptions}
          direction={user.direction || "其他"}
          initial={{
            difficulty: question.difficulty,
            title: question.title,
            body: question.body,
            referenceAnswer: question.referenceAnswer,
            detailedAnswer: question.detailedAnswer,
            tags: question.tags,
            topicId: question.topicId,
          }}
        />
      </Card>
    </div>
  );
}
