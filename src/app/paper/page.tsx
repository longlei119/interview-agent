import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, EmptyState, Icon } from "@/components/ui";
import { DeletePaperButton } from "@/components/DeletePaperButton";
import { PaperVisibilityToggle } from "@/components/PaperVisibilityToggle";

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
          <h1 className="font-serif text-2xl font-bold text-ink">我的试卷</h1>
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
            <Card key={paper.id} hover className="group flex flex-col p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-base font-bold tracking-tight text-ink">{paper.title}</h3>
                <div className="flex shrink-0 items-center gap-1">
                  <PaperVisibilityToggle paperId={paper.id} isPublic={paper.isPublic} />
                  {paper.isPublic && <Badge variant="success">已公开</Badge>}
                </div>
              </div>
              {paper.description && (
                <p className="mb-3 line-clamp-2 text-xs text-muted">{paper.description}</p>
              )}
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Icon name="list" size={12} />
                  {paper.items.length} 题
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" size={12} />
                  {paper.timeLimit ? `限时 ${paper.timeLimit} 分钟` : "不限时"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="history" size={12} />
                  {paper._count.attempts} 次作答
                </span>
              </div>
              <div className="mt-auto flex items-center gap-1">
                <Link
                  href={`/paper/${paper.id}/take`}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white shadow-soft transition-all hover:bg-brand-600 active:scale-[0.98]"
                >
                  <Icon name="play" size={14} />
                  开始作答
                </Link>
                <Link
                  href={`/paper/${paper.id}/edit`}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-ink transition-colors hover:bg-canvas hover:text-brand-600"
                  title="编辑"
                  aria-label="编辑试卷"
                >
                  <Icon name="edit" size={14} />
                </Link>
                <DeletePaperButton
                  paperId={paper.id}
                  title={paper.title}
                  attemptCount={paper._count.attempts}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
