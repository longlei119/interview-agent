import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DIRECTIONS, DIFFICULTIES } from "@/lib/directions";
import { computeHeat } from "@/lib/heat";

const difficultyColor: Record<string, string> = {
  简单: "bg-green-100 text-green-700",
  中等: "bg-amber-100 text-amber-700",
  困难: "bg-red-100 text-red-700",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; difficulty?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/explore");

  const { direction, difficulty } = await searchParams;

  // 公开且未下架的题
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

  // 热度是合成值，没存表，所以在内存里算并降序排
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
    `rounded-full px-3 py-1 text-sm transition-colors ${
      active
        ? "bg-brand-500 text-white"
        : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
    }`;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">题库广场</h1>
        <p className="mt-1 text-sm text-gray-500">
          大家公开分享的题目，按热度排序。点开任意一题练习、点赞，或拉到自己的题库。
        </p>
      </div>

      {/* 筛选：方向 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-400">方向</span>
        <Link href={buildHref({ direction: "" })} className={chipClass(!direction)}>
          全部
        </Link>
        {DIRECTIONS.map((d) => (
          <Link key={d} href={buildHref({ direction: d })} className={chipClass(direction === d)}>
            {d}
          </Link>
        ))}
      </div>

      {/* 筛选：难度 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-400">难度</span>
        <Link href={buildHref({ difficulty: "" })} className={chipClass(!difficulty)}>
          全部
        </Link>
        {DIFFICULTIES.map((d) => (
          <Link
            key={d}
            href={buildHref({ difficulty: d })}
            className={chipClass(difficulty === d)}
          >
            {d}
          </Link>
        ))}
      </div>

      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-400">
          {direction || difficulty ? "没有符合筛选条件的公开题" : "广场上还没有公开题目"}
        </p>
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
                className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                    {q.direction}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      difficultyColor[q.difficulty] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {q.difficulty}
                  </span>
                  {q.answerGeneratedByAi && (
                    <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                      🤖 AI 答案
                    </span>
                  )}
                  {mine && (
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      我发布的
                    </span>
                  )}
                  <span className="ml-auto text-xs text-gray-400">🔥 {q.heat}</span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-brand-600">
                  {q.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <span>by {q.owner.name}</span>
                  <span>❤️ {q.likeCount}</span>
                  <span>📥 {q.cloneCount}</span>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <span key={t} className="text-xs text-gray-400">
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
