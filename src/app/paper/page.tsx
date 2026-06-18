import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Badge, Button, EmptyState, Icon } from "@/components/ui";
import { DeletePaperButton } from "@/components/DeletePaperButton";

export default async function PaperListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/paper");

  const papers = await prisma.testPaper.findMany({
    where: { userId: user.id },
    include: {
      items: {
        where: { question: { deletedAt: null } },
        select: { id: true },
      },
      _count: { select: { attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">我的试卷</h1>
          <p className="mt-1 text-sm text-muted">管理你创建的试卷，进行模拟考试</p>
        </div>
        <Link href="/paper/new">
          <Button leftIcon={<Icon name="plus" size={16} />}>创建试卷</Button>
        </Link>
      </div>

      {papers.length === 0 ? (
        <EmptyState
          icon="file"
          title="还没有试卷"
          desc="从你的题库中选题，创建一份试卷开始模拟考试"
          action={
            <Link href="/paper/new">
              <Button leftIcon={<Icon name="plus" size={16} />}>创建第一份试卷</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper) => (
            <div
              key={paper.id}
              className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-all duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-hover"
            >
              <h3 className="mb-2 text-base font-bold text-ink">{paper.title}</h3>
              {paper.description && (
                <p className="mb-3 line-clamp-2 text-xs text-muted">{paper.description}</p>
              )}
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Icon name="list" size={12} />
                  {paper.items.length} 题
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" size={12} />
                  {paper.timeLimit ? `限时 ${paper.timeLimit} 分钟` : "不限时"}
                </span>
                {paper.isPublic && <Badge variant="success">已公开</Badge>}
              </div>
              <div className="mt-auto flex gap-2">
                <Link
                  href={`/paper/${paper.id}/take`}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white shadow-soft transition-all hover:bg-brand-600 active:scale-[0.98]"
                >
                  <Icon name="play" size={14} />
                  开始作答
                </Link>
                <Link
                  href={`/paper/${paper.id}/edit`}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-canvas hover:text-brand-600"
                >
                  <Icon name="edit" size={14} />
                  编辑
                </Link>
                <DeletePaperButton
                  paperId={paper.id}
                  title={paper.title}
                  attemptCount={paper._count.attempts}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
