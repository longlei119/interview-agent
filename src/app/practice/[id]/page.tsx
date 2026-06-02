import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PracticePanel } from "@/components/PracticePanel";
import { QuestionActions } from "@/components/QuestionActions";
import { computeHeat } from "@/lib/heat";

const difficultyColor: Record<string, string> = {
  简单: "bg-green-100 text-green-700",
  中等: "bg-amber-100 text-amber-700",
  困难: "bg-red-100 text-red-700",
};

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?from=/practice/${id}`);

  const question = await prisma.question.findFirst({
    where: { id, deletedAt: null },
    include: { owner: { select: { name: true } } },
  });
  if (!question) notFound();

  const isOwner = question.ownerId === user.id;
  const isAdmin = user.role === "admin";
  const isPublicVisible = question.visibility === "public" && !question.isDelisted;

  // 访问控制：我拥有 / 公开未下架 / 管理员
  if (!isOwner && !isPublicVisible && !isAdmin) {
    notFound();
  }

  // 浏览计数：非作者本人首次浏览才 +1（QuestionView 去重）
  let alreadyLiked = false;
  if (!isOwner) {
    const view = await prisma.questionView.findUnique({
      where: { userId_questionId: { userId: user.id, questionId: id } },
    });
    if (!view) {
      await prisma.$transaction([
        prisma.questionView.create({ data: { userId: user.id, questionId: id } }),
        prisma.question.update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        }),
      ]);
      question.viewCount += 1;
    }
    const like = await prisma.questionLike.findUnique({
      where: { userId_questionId: { userId: user.id, questionId: id } },
    });
    alreadyLiked = Boolean(like);
  }

  const heat = computeHeat({
    manualHeat: question.manualHeat,
    cloneCount: question.cloneCount,
    likeCount: question.likeCount,
    viewCount: question.viewCount,
  });

  const tags = question.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div>
      <Link
        href={isOwner ? "/practice" : "/explore"}
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-brand-600"
      >
        ← {isOwner ? "返回我的题库" : "返回题库广场"}
      </Link>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
            {question.direction}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
              difficultyColor[question.difficulty] || "bg-gray-100 text-gray-600"
            }`}
          >
            {question.difficulty}
          </span>
          {question.visibility === "public" && (
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
              公开
            </span>
          )}
          {question.isDelisted && (
            <span className="rounded-md bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
              已下架
            </span>
          )}
          <span className="ml-auto text-xs text-gray-400">🔥 热度 {heat}</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900">{question.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <span>作者：{question.owner.name}</span>
          <span>👁 {question.viewCount}</span>
          <span>❤️ {question.likeCount}</span>
          <span>📥 {question.cloneCount}</span>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
          {question.body}
        </p>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className="text-xs text-gray-400">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-gray-100 pt-4">
          <QuestionActions
            questionId={question.id}
            isOwner={isOwner}
            visibility={question.visibility}
            initialLiked={alreadyLiked}
            initialLikeCount={question.likeCount}
          />
        </div>
      </div>

      <PracticePanel questionId={question.id} referenceAnswer={question.referenceAnswer} />
    </div>
  );
}
