import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Badge, Button, EmptyState, Icon } from "@/components/ui";

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreVariant(score: number): "success" | "warn" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "warn";
  return "danger";
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
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-ink">我的记录</h1>
      <p className="mb-6 mt-1 text-sm text-muted">回看你的刷题点评和模拟面试总评。</p>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="mic" size={18} className="text-brand-500" />
          <h2 className="text-lg font-semibold text-ink">模拟面试</h2>
        </div>
        {interviews.length === 0 ? (
          <EmptyState
            icon="mic"
            title="还没有模拟面试记录"
            desc="去开启你的第一场 AI 模拟面试"
            action={
              <Link href="/interview">
                <Button leftIcon={<Icon name="play" size={16} />}>去面试</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {interviews.map((it) => (
              <Link
                key={it.id}
                href={`/interview/${it.id}`}
                className="flex items-center justify-between rounded-xl border border-line bg-surface p-4 shadow-card transition-all duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-hover"
              >
                <div className="min-w-0">
                  <div className="font-medium text-ink">
                    {it.role} · {it.level}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <Icon name="clock" size={12} />
                    {formatDate(it.createdAt)}
                    <span>·</span>
                    {it._count.messages} 条对话
                    <span>·</span>
                    {it.status === "finished" ? "已结束" : "进行中"}
                  </div>
                </div>
                {it.status === "finished" ? (
                  <Badge variant={scoreVariant(it.score)} className="text-sm font-bold">
                    {it.score} 分
                  </Badge>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600">
                    继续
                    <Icon name="arrow-right" size={14} />
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Icon name="edit" size={18} className="text-brand-500" />
          <h2 className="text-lg font-semibold text-ink">刷题点评</h2>
        </div>
        {practices.length === 0 ? (
          <EmptyState
            icon="book"
            title="还没有刷题记录"
            desc="去题库挑一道题练习，AI 会给你点评打分"
            action={
              <Link href="/practice">
                <Button leftIcon={<Icon name="book" size={16} />}>去刷题</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {practices.map((p) => (
              <details
                key={p.id}
                className="group rounded-xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-brand-300"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-ink">
                      {p.question?.title ?? "（题目已删除）"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {p.question?.direction ? `${p.question.direction} · ` : ""}
                      {formatDate(p.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={scoreVariant(p.score)} className="text-sm font-bold">
                      {p.score} 分
                    </Badge>
                    <Icon
                      name="chevron-down"
                      size={16}
                      className="text-muted transition-transform group-open:rotate-180"
                    />
                  </div>
                </summary>
                <div className="mt-3 space-y-3 border-t border-line pt-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted">我的回答</div>
                    <div className="whitespace-pre-wrap text-sm text-ink">
                      {p.userAnswer || "（未作答）"}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-brand-600">
                      <Icon name="sparkles" size={12} />
                      AI 点评
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-ink">
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
