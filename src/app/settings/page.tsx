import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ShareCodeCard } from "@/components/ShareCodeCard";
import { SyncHistoryList } from "@/components/SyncHistoryList";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/settings");

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { shareCode: true, shareCodeSetAt: true },
  });

  const syncRecords = await prisma.syncRecord.findMany({
    where: { toUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: { fromUser: { select: { name: true } } },
    take: 50,
  });

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-ink mb-1">设置</h1>
      <p className="text-sm text-muted mb-6">管理分享码和查看同步记录。</p>

      <div className="space-y-6">
        <ShareCodeCard
          shareCode={full?.shareCode ?? null}
          shareCodeSetAt={full?.shareCodeSetAt?.toISOString() ?? null}
        />

        <SyncHistoryList records={syncRecords.map((r) => ({
          id: r.id,
          fromUserName: r.fromUser.name,
          scope: r.scope,
          status: r.status,
          createdCount: r.createdCount,
          skippedCount: r.skippedCount,
          newTopicCount: r.newTopicCount,
          newPaperCount: r.newPaperCount,
          error: r.error,
          createdAt: r.createdAt.toISOString(),
          finishedAt: r.finishedAt?.toISOString() ?? null,
        }))} />
      </div>
    </div>
  );
}
