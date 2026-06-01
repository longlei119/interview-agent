import Link from "next/link";
import { prisma } from "@/lib/db";

const CATEGORIES = ["全部", "前端", "后端", "算法", "行为"];

const difficultyColor: Record<string, string> = {
  简单: "bg-green-100 text-green-700",
  中等: "bg-amber-100 text-amber-700",
  困难: "bg-red-100 text-red-700",
};

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = category && CATEGORIES.includes(category) ? category : "全部";
  const where = active !== "全部" ? { category: active } : {};

  const questions = await prisma.question.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      difficulty: true,
      title: true,
      tags: true,
    },
  });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">题库</h1>
        <p className="mt-1 text-sm text-gray-500">
          选一道题，写下你的答案，AI 会对照参考答案给出点评和评分。
        </p>
      </div>

      {/* 分类筛选 */}
      <div className="mb-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={c === "全部" ? "/practice" : `/practice?category=${encodeURIComponent(c)}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active === c
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-400">
          该分类下暂无题目
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {questions.map((q) => (
            <Link
              key={q.id}
              href={`/practice/${q.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                  {q.category}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    difficultyColor[q.difficulty] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {q.difficulty}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-brand-600">
                {q.title}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {q.tags
                  .split(",")
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
