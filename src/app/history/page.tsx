import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 60) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [practices, interviews] = await Promise.all([
    prisma.practiceRecord.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { question: { select: { title: true, direction: true } } },
    }),
    prisma.interviewSession.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { messages: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">我的记录</h1>
      <p className="mb-6 text-sm text-gray-500">回看你的刷题点评和模拟面试总评。</p>

      {/* 模拟面试记录 */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">模拟面试</h2>
        {interviews.length === 0 ? (
          <EmptyHint text="还没有模拟面试记录" href="/interview" cta="去面试" />
        ) : (
          <div className="space-y-2">
            {interviews.map((it) => (
              <Link
                key={it.id}
                href={`/interview/${it.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand-300"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">
                    {it.role} · {it.level}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {formatDate(it.createdAt)} · {it._count.messages} 条对话 ·{" "}
                    {it.status === "finished" ? "已结束" : "进行中"}
                  </div>
                </div>
                {it.status === "finished" ? (
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${scoreColor(it.score)}`}
                  >
                    {it.score} 分
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-brand-500">继续 →</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 刷题记录 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">刷题点评</h2>
        {practices.length === 0 ? (
          <EmptyHint text="还没有刷题记录" href="/practice" cta="去刷题" />
        ) : (
          <div className="space-y-2">
            {practices.map((p) => (
              <details
                key={p.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <summary className="flex cursor-pointer items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">
                      {p.question?.title ?? "（题目已删除）"}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {p.question?.direction ? `${p.question.direction} · ` : ""}
                      {formatDate(p.createdAt)}
                    </div>
                  </div>
                  <span
                    className={`ml-3 shrink-0 rounded-full px-3 py-1 text-sm font-bold ${scoreColor(p.score)}`}
                  >
                    {p.score} 分
                  </span>
                </summary>
                <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-gray-500">
                      我的回答
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-gray-600">
                      {p.userAnswer || "（未作答）"}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-brand-600">
                      AI 点评
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-gray-700">
                      {p.aiFeedback}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyHint({
  text,
  href,
  cta,
}: {
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-300 bg-white p-5">
      <span className="text-sm text-gray-400">{text}</span>
      <Link
        href={href}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
      >
        {cta}
      </Link>
    </div>
  );
}
