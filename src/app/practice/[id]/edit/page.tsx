import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildTopicTree, flattenForSelect } from "@/lib/topics";
import { QuestionForm } from "@/components/QuestionForm";

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

  // 只有作者本人能编辑内容
  if (question.ownerId !== user.id) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/practice/${id}`}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-brand-600"
        >
          ← 返回题目
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">这道题不是你创建的，无法编辑。</p>
        </div>
      </div>
    );
  }

  const flatTopics = await prisma.topic.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  const topicOptions = flattenForSelect(buildTopicTree(flatTopics));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/practice/${id}`}
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-brand-600"
      >
        ← 返回题目
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">编辑题目</h1>
      <QuestionForm
        questionId={question.id}
        topicOptions={topicOptions}
        direction={user.direction || "其他"}
        initial={{
          difficulty: question.difficulty,
          title: question.title,
          body: question.body,
          referenceAnswer: question.referenceAnswer,
          tags: question.tags,
          topicId: question.topicId,
        }}
      />
    </div>
  );
}
