import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { computeHeat } from "@/lib/heat";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Icon } from "@/components/ui";

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?from=/admin");
  if (me.role !== "admin") redirect("/practice");

  const [users, rows] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        canCreate: true,
        _count: { select: { questions: true } },
      },
    }),
    prisma.question.findMany({
      where: { visibility: "public", deletedAt: null },
      select: {
        id: true,
        title: true,
        direction: true,
        difficulty: true,
        isDelisted: true,
        manualHeat: true,
        cloneCount: true,
        likeCount: true,
        viewCount: true,
        owner: { select: { name: true } },
      },
    }),
  ]);

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

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Icon name="settings" size={24} className="text-brand-500" />
          管理后台
        </h1>
        <p className="mt-1 text-sm text-muted">
          通过左侧菜单管理 AI 能力、用户权限和题库广场内容。
        </p>
      </div>

      <AdminDashboard users={users} currentUserId={me.id} questions={questions} />
    </div>
  );
}
