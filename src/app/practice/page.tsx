import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DIRECTIONS, DIFFICULTIES } from "@/lib/directions";

const difficultyColor: Record<string, string> = {
  简单: "bg-green-100 text-green-700",
  中等: "bg-amber-100 text-amber-700",
  困难: "bg-red-100 text-red-700",
};

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; difficulty?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/practice");

  const { direction, difficulty } = await searchParams;

  const questions = await prisma.question.findMany({
    where: {
      ownerId: user.id,
      deletedAt: null,
      ...(direction ? { direction } : {}),
      ...(difficulty ? { difficulty } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      direction: true,
      difficulty: true,
      title: true,
      tags: true,
      visibility: true,
    },
  });

  // 构造筛选链接，保留另一个已选条件
  const buildHref = (next: { direction?: string; difficulty?: string }) => {
    const params = new URLSearchParams();
    const d = next.direction !== undefined ? next.direction : direction;
    const diff = next.difficulty !== undefined ? next.difficulty : difficulty;
    if (d) params.set("direction", d);
    if (diff) params.set("difficulty", diff);
    const qs = params.toString();
    return qs ? `/practice?${qs}` : "/practice";
  };

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition-colors ${
      active
        ? "bg-brand-500 text-white"
        : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
    }`;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的题库</h1>
          <p className="mt-1 text-sm text-gray-500">
            这里是你创建的题目。点开任意一题写答案、让 AI 点评，或设为公开分享到广场。
          </p>
        </div>
        {user.canCreate && (
          <Link
            href="/practice/new"
            className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            + 新建题目
          </Link>
        )}
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
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-400">
            {direction || difficulty ? "没有符合筛选条件的题目" : "你还没有创建任何题目"}
          </p>
          {user.canCreate && !direction && !difficulty && (
            <Link
              href="/practice/new"
              className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
            >
              去新建第一道题 →
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
  );
}
