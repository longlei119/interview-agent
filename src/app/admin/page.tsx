import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { computeHeat } from "@/lib/heat";
import { UserCanCreateToggle } from "@/components/admin/UserCanCreateToggle";
import { QuestionAdminControls } from "@/components/admin/QuestionAdminControls";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>
        <p className="mt-1 text-sm text-gray-500">
          管理用户的加题权限，以及题库广场里的公开题目。
        </p>
      </div>

      {/* 用户管理 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          用户（{users.length}）
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{u.name}</span>
                    {u.role === "admin" && (
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                        管理员
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-gray-400">
                    {u.email} · 创建了 {u._count.questions} 道题
                  </div>
                </div>
                <UserCanCreateToggle
                  userId={u.id}
                  canCreate={u.canCreate}
                  isSelf={u.id === me.id}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 公开题管理 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          公开题目（{questions.length}）
        </h2>
        {questions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-400">
            暂无公开题目
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="divide-y divide-gray-100">
              {questions.map((q) => (
                <div key={q.id} className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                      {q.direction}
                    </span>
                    <span className="text-xs text-gray-400">{q.difficulty}</span>
                    {q.isDelisted && (
                      <span className="rounded-md bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                        已下架
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">🔥 {q.heat}</span>
                  </div>
                  <div className="font-medium text-gray-900">{q.title}</div>
                  <div className="text-xs text-gray-400">
                    by {q.owner.name} · 👁 {q.viewCount} · ❤️ {q.likeCount} · 📥{" "}
                    {q.cloneCount}
                  </div>
                  <QuestionAdminControls
                    questionId={q.id}
                    isDelisted={q.isDelisted}
                    manualHeat={q.manualHeat}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
