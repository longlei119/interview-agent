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
import { ExportLibraryButton } from "@/components/ExportLibraryButton";
import { DeleteQuestionButton } from "@/components/DeleteQuestionButton";
import { Badge, Card, EmptyState, Icon } from "@/components/ui";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; difficulty?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/practice");

  const { topic, difficulty } = await searchParams;

  const flatTopics = await prisma.topic.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  const tree = buildTopicTree(flatTopics);

  const isUnclassified = topic === "none";
  const activeTopicId = isUnclassified ? "none" : topic && flatTopics.some((t) => t.id === topic) ? topic : null;
  const subtreeIds =
    activeTopicId && activeTopicId !== "none"
      ? collectSubtreeIds(flatTopics, activeTopicId)
      : [];

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
      answerGeneratedByAi: true,
    },
  });

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
  const countMap: Record<string, number> = {};
  for (const t of flatTopics) {
    const ids = collectSubtreeIds(flatTopics, t.id);
    countMap[t.id] = ids.reduce((s, id) => s + (directCount[id] ?? 0), 0);
  }

  const path =
    activeTopicId && activeTopicId !== "none"
      ? findTopicPath(flatTopics, activeTopicId)
      : [];
  const activeName = isUnclassified
    ? "未分类"
    : path.length > 0
      ? path[path.length - 1].name
      : "全部题目";

  const canCreateHere = user.canCreate && !!activeTopicId && activeTopicId !== "none";
  const newHref = canCreateHere ? `/practice/new?topic=${activeTopicId}` : "";

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition-colors duration-150 ${
      active
        ? "bg-brand-500 text-white shadow-soft"
        : "bg-surface text-muted border border-line hover:border-brand-300 hover:text-ink"
    }`;

  const buildDiffHref = (diff: string) => {
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (diff) params.set("difficulty", diff);
    const qs = params.toString();
    return qs ? `/practice?${qs}` : "/practice";
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">我的题库</h1>
          <p className="mt-1 text-sm text-muted">按话题分类整理你自己的练习题。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportLibraryButton />
          <DirectionSetter direction={user.direction} />
        </div>
      </div>

      <div className="flex flex-col gap-5 md:flex-row">
        <TopicTree
          tree={tree}
          activeId={activeTopicId}
          unclassifiedCount={unclassifiedCount}
          countMap={countMap}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 text-sm text-muted">
              <Link href="/practice" className="hover:text-brand-600">
                全部
              </Link>
              {path.map((n) => (
                <span key={n.id} className="flex items-center gap-1">
                  <Icon name="chevron-right" size={12} className="text-line" />
                  <Link href={`/practice?topic=${n.id}`} className="hover:text-brand-600">
                    {n.name}
                  </Link>
                </span>
              ))}
              {isUnclassified && (
                <span className="flex items-center gap-1">
                  <Icon name="chevron-right" size={12} className="text-line" />
                  <span>未分类</span>
                </span>
              )}
              <span className="ml-1 text-xs text-muted">（{questions.length} 题）</span>
            </div>
            {canCreateHere && (
              <Link
                href={newHref}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white shadow-soft transition-all hover:bg-brand-600 active:scale-[0.98]"
              >
                <Icon name="plus" size={16} />
                在「{activeName}」下新建
              </Link>
            )}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">难度</span>
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
            <EmptyState
              icon="book"
              title={difficulty ? "没有符合筛选条件的题目" : "这里还没有题目"}
              desc={
                !difficulty && user.canCreate
                  ? canCreateHere
                    ? `在「${activeName}」分类下新建一道题开始练习`
                    : isUnclassified
                      ? "未分类里是拉取或删话题后留下的题，无法直接新建。"
                      : tree.length === 0
                        ? "先在左侧「加根话题」建一个分类，再到分类下加题。"
                        : "在左侧选一个话题分类，即可在该分类下新建题目。"
                  : undefined
              }
              action={
                !difficulty && user.canCreate && canCreateHere ? (
                  <Link
                    href={newHref}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    <Icon name="plus" size={16} />
                    新建第一道题
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="group relative rounded-xl border border-line bg-surface p-4 shadow-card transition-all duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-hover"
                >
                  <Link href={`/practice/${q.id}`} className="block">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <Badge difficulty={q.difficulty as "简单" | "中等" | "困难"} />
                      {!q.topicId && <Badge variant="gray">未分类</Badge>}
                      {q.visibility === "public" && <Badge variant="success">已公开</Badge>}
                      {q.answerGeneratedByAi && (
                        <Badge variant="violet">
                          <Icon name="bot" size={12} />
                          AI 答案
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-ink transition-colors group-hover:text-brand-600">
                      {q.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((t) => (
                          <span key={t} className="text-xs text-muted">
                            #{t}
                          </span>
                        ))}
                    </div>
                  </Link>
                  <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <DeleteQuestionButton
                      questionId={q.id}
                      title={q.title}
                      variant="icon"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
