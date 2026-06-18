import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PracticePanel } from "@/components/PracticePanel";
import { QuestionActions } from "@/components/QuestionActions";
import { computeHeat } from "@/lib/heat";
import { Badge, Card, Icon } from "@/components/ui";

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

  if (!isOwner && !isPublicVisible && !isAdmin) {
    notFound();
  }

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
    <div className="animate-fade-in">
      <Link
        href={isOwner ? "/practice" : "/explore"}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
      >
        <Icon name="arrow-left" size={16} />
        {isOwner ? "返回我的题库" : "返回题库广场"}
      </Link>

      <Card padded className="mb-5">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="brand">{question.direction}</Badge>
          <Badge difficulty={question.difficulty as "简单" | "中等" | "困难"} />
          {question.visibility === "public" && <Badge variant="success">公开</Badge>}
          {question.isDelisted && <Badge variant="gray">已下架</Badge>}
          {question.answerGeneratedByAi && (
            <Badge variant="violet">
              <Icon name="bot" size={12} />
              AI 生成答案
            </Badge>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
            <Icon name="flame" size={13} className="text-amber-500" />
            热度 {heat}
          </span>
        </div>

        <h1 className="text-xl font-bold text-ink">{question.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="user" size={12} />
            {question.owner.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="eye" size={12} />
            {question.viewCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="heart" size={12} />
            {question.likeCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="download" size={12} />
            {question.cloneCount}
          </span>
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-line pt-4">
          <QuestionActions
            questionId={question.id}
            isOwner={isOwner}
            visibility={question.visibility}
            initialLiked={alreadyLiked}
            initialLikeCount={question.likeCount}
          />
        </div>
      </Card>

      <PracticePanel
        questionId={question.id}
        referenceAnswer={question.referenceAnswer}
        detailedAnswer={question.detailedAnswer}
      />
    </div>
  );
}
