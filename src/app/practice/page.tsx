import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DIFFICULTIES } from "@/lib/directions";
import {
  buildTopicTree,
  collectSubtreeIds,
  findTopicPath,
} from "@/lib/topics";
import { TopicTree } from "@/components/TopicTree";
import { DirectionSetter } from "@/components/DirectionSetter";

const difficultyColor: Record<string, string> = {
  简单: "bg-green-100 text-green-700",
  中等: "bg-amber-100 text-amber-700",
  困难: "bg-red-100 text-red-700",
};

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; difficulty?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/practice");

  const { topic, difficulty } = await searchParams;

  // 取我的全部话题（扁平），构造树
  const flatTopics = await prisma.topic.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  const tree = buildTopicTree(flatTopics);

  // 选中节点解析：none = 未分类；具体 id = 该节点含子孙
  const isUnclassified = topic === "none";
  const activeTopicId = isUnclassified ? "none" : topic && flatTopics.some((t) => t.id === topic) ? topic : null;
  const subtreeIds =
    activeTopicId && activeTopicId !== "none"
      ? collectSubtreeIds(flatTopics, activeTopicId)
      : [];

  // 题目筛选条件
  const where: Record<string, unknown> = {
    ownerId: user.id,
    deletedAt: null,
    ...(difficulty ? { difficulty } : {}),
  };
  if (isUnclassified) where.topicId = null;
  else if (subtreeIds.length > 0) where.topicId = { in: subtreeIds };

  const questions = await prisma.question.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      difficulty: true,
      title: true,
      tags: true,
      visibility: true,
      topicId: true,
    },
  });

  // 各节点（含子孙）题目数 + 未分类数，用于树上显示计数
  const allMine = await prisma.question.findMany({
    where: { ownerId: user.id, deletedAt: null },
    select: { topicId: true },
  });
  const directCount: Record<string, number> = {};
  let unclassifiedCount = 0;
  for (const q of allMine) {
    if (q.topicId) directCount[q.topicId] = (directCount[q.topicId] ?? 0) + 1;
    else unclassifiedCount++;
  }
  // 含子孙累加
  const countMap: Record<string, number> = {};
  for (const t of flatTopics) {
    const ids = collectSubtreeIds(flatTopics, t.id);
    countMap[t.id] = ids.reduce((s, id) => s + (directCount[id] ?? 0), 0);
  }

  // 面包屑路径
  const path =
    activeTopicId && activeTopicId !== "none"
      ? findTopicPath(flatTopics, activeTopicId)
      : [];
  const activeName = isUnclassified
    ? "未分类"
    : path.length > 0
      ? path[path.length - 1].name
      : "全部题目";

  // 在当前话题下新建题目的链接（带 topic 预选）
  const newHref =
    activeTopicId && activeTopicId !== "none"
      ? `/practice/new?topic=${activeTopicId}`
      : "/practice/new";

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition-colors ${
      active
        ? "bg-brand-500 text-white"
        : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
    }`;

  const buildDiffHref = (diff: string) => {
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (diff) params.set("difficulty", diff);
    const qs = params.toString();
    return qs ? `/practice?${qs}` : "/practice";
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">我的题库</h1>
        <DirectionSetter direction={user.direction} />
      </div>

      <div className="flex flex-col gap-5 md:flex-row">
        {/* 左侧话题树 */}
        <TopicTree
          tree={tree}
          activeId={activeTopicId}
          unclassifiedCount={unclassifiedCount}
          countMap={countMap}
        />

        {/* 右侧内容 */}
        <div className="min-w-0 flex-1">
          {/* 面包屑 + 标题 + 新建 */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
              <Link href="/practice" className="hover:text-brand-600">
                全部
              </Link>
              {path.map((n) => (
                <span key={n.id} className="flex items-center gap-1">
                  <span className="text-gray-300">›</span>
                  <Link href={`/practice?topic=${n.id}`} className="hover:text-brand-600">
                    {n.name}
                  </Link>
                </span>
              ))}
              {isUnclassified && (
                <span className="flex items-center gap-1">
                  <span className="text-gray-300">›</span>
                  <span>未分类</span>
                </span>
              )}
              <span className="ml-1 text-gray-400">（{questions.length} 题）</span>
            </div>
            {user.canCreate && (
              <Link
                href={newHref}
                className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
              >
                + 在「{activeName}」下新建
              </Link>
            )}
          </div>

          {/* 难度筛选 */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400">难度</span>
            <Link href={buildDiffHref("")} className={chipClass(!difficulty)}>
              全部
            </Link>
            {DIFFICULTIES.map((d) => (
              <Link key={d} href={buildDiffHref(d)} className={chipClass(difficulty === d)}>
                {d}
              </Link>
            ))}
          </div>

          {questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-gray-400">
                {difficulty ? "没有符合筛选条件的题目" : "这里还没有题目"}
              </p>
              {user.canCreate && (
                <Link
                  href={newHref}
                  className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
                >
                  去新建一道 →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {questions.map((q) => (
                <Link
                  key={q.id}
                  href={`/practice/${q.id}`}
                  className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        difficultyColor[q.difficulty] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {q.difficulty}
                    </span>
                    {!q.topicId && (
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        未分类
                      </span>
                    )}
                    {q.visibility === "public" && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        已公开
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-600">
                    {q.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {q.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t) => (
                        <span key={t} className="text-xs text-gray-400">
                          #{t}
                        </span>
                      ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
