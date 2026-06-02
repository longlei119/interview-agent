import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildTopicTree, flattenForSelect } from "@/lib/topics";
import { QuestionForm } from "@/components/QuestionForm";

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/practice/new");

  if (!user.canCreate) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/practice"
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-brand-600"
        >
          ← 返回我的题库
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-700">
            你的加题权限已被管理员关闭，暂时无法新建题目。
          </p>
        </div>
      </div>
    );
  }

  const { topic } = await searchParams;

  const flatTopics = await prisma.topic.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  const topicOptions = flattenForSelect(buildTopicTree(flatTopics));
  // 预选话题（来自 ?topic=，需是自己的）
  const preselect = topic && flatTopics.some((t) => t.id === topic) ? topic : null;

  // 题目必须挂在话题下。一个话题都没有时，先引导去建话题，不让建未分类题。
  if (topicOptions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/practice"
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-brand-600"
        >
          ← 返回我的题库
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-600">你还没有任何话题分类。</p>
          <p className="mt-2 text-sm text-gray-400">
            题目需要挂在话题下。先去「我的题库」左侧点「+ 加根话题」建一个分类（如 分布式 / AI面试），再到分类下加题。
          </p>
          <Link
            href="/practice"
            className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            去建话题 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/practice"
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-brand-600"
      >
        ← 返回我的题库
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">新建题目</h1>
      <p className="mb-6 text-sm text-gray-500">
        题目默认私有，只有你自己能看到。创建后可在详情页设为公开，分享到题库广场。
      </p>
      <QuestionForm
        topicOptions={topicOptions}
        direction={user.direction || "其他"}
        requireTopic
        initial={{
          difficulty: "中等",
          title: "",
          body: "",
          referenceAnswer: "",
          tags: "",
          topicId: preselect,
        }}
      />
    </div>
  );
}
