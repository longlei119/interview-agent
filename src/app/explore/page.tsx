import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DIRECTIONS, DIFFICULTIES } from "@/lib/directions";
import { computeHeat } from "@/lib/heat";
import { Badge, EmptyState, Icon } from "@/components/ui";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; difficulty?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/explore");

  const { direction, difficulty } = await searchParams;

  const rows = await prisma.question.findMany({
    where: {
      visibility: "public",
      isDelisted: false,
      deletedAt: null,
      ...(direction ? { direction } : {}),
      ...(difficulty ? { difficulty } : {}),
    },
    select: {
      id: true,
      direction: true,
      difficulty: true,
      title: true,
      tags: true,
      ownerId: true,
      manualHeat: true,
      cloneCount: true,
      likeCount: true,
      viewCount: true,
      answerGeneratedByAi: true,
      owner: { select: { name: true } },
    },
  });

  const questions = rows
    .map((q) => ({
      ...q,
      heat: computeHeat({
        manualHeat: q.manualHeat,
        cloneCount: q.cloneCount,
        likeCount: q.likeCount,
        viewCount: q.viewCount,
      }),
    }))
    .sort((a, b) => b.heat - a.heat);

  const buildHref = (next: { direction?: string; difficulty?: string }) => {
    const params = new URLSearchParams();
    const d = next.direction !== undefined ? next.direction : direction;
    const diff = next.difficulty !== undefined ? next.difficulty : difficulty;
    if (d) params.set("direction", d);
    if (diff) params.set("difficulty", diff);
    const qs = params.toString();
    return qs ? `/explore?${qs}` : "/explore";
  };

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition-colors duration-150 ${
      active
        ? "bg-brand-500 text-white shadow-soft"
        : "bg-surface text-muted border border-line hover:border-brand-300 hover:text-ink"
    }`;

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">题库广场</h1>
        <p className="mt-1 text-sm text-muted">
          大家公开分享的题目，按热度排序。点开任意一题练习、点赞，或拉到自己的题库。
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">方向</span>
        <Link href={buildHref({ direction: "" })} className={chipClass(!direction)}>
          全部
        </Link>
        {DIRECTIONS.map((d) => (
          <Link key={d} href={buildHref({ direction: d })} className={chipClass(direction === d)}>
            {d}
          </Link>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">难度</span>
        <Link href={buildHref({ difficulty: "" })} className={chipClass(!difficulty)}>
          全部
        </Link>
        {DIFFICULTIES.map((d) => (
          <Link key={d} href={buildHref({ difficulty: d })} className={chipClass(difficulty === d)}>
            {d}
          </Link>
        ))}
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon="compass"
          title={direction || difficulty ? "没有符合筛选条件的公开题" : "广场上还没有公开题目"}
          desc={
            direction || difficulty
              ? "试着放宽筛选条件看看。"
              : "把你练习过的题设为公开，让更多人看到。"
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {questions.map((q) => {
            const mine = q.ownerId === user.id;
            const tags = q.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            return (
              <Link
                key={q.id}
                href={`/practice/${q.id}`}
                className="group rounded-xl border border-line bg-surface p-4 shadow-card transition-all duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-hover"
              >
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="brand">{q.direction}</Badge>
                  <Badge difficulty={q.difficulty as "简单" | "中等" | "困难"} />
                  {q.answerGeneratedByAi && (
                    <Badge variant="violet">
                      <Icon name="bot" size={12} />
                      AI 答案
                    </Badge>
                  )}
                  {mine && <Badge variant="gray">我发布的</Badge>}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
                    <Icon name="flame" size={13} className="text-amber-500" />
                    {q.heat}
                  </span>
                </div>
                <h3 className="font-semibold text-ink transition-colors group-hover:text-brand-600">
                  {q.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="user" size={12} />
                    {q.owner.name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="heart" size={12} />
                    {q.likeCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="download" size={12} />
                    {q.cloneCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="eye" size={12} />
                    {q.viewCount}
                  </span>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <span key={t} className="text-xs text-muted">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
