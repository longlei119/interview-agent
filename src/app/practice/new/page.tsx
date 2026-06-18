import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildTopicTree, flattenForSelect } from "@/lib/topics";
import { QuestionForm } from "@/components/QuestionForm";
import { Button, Card, EmptyState, HintBanner, Icon } from "@/components/ui";

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/practice/new");

  if (!user.canCreate) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <Link
          href="/practice"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
        >
          <Icon name="arrow-left" size={16} />
          返回我的题库
        </Link>
        <Card padded>
          <HintBanner variant="warn">
            你的加题权限已被管理员关闭，暂时无法新建题目。
          </HintBanner>
        </Card>
      </div>
    );
  }

  const { topic } = await searchParams;

  const flatTopics = await prisma.topic.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  const topicOptions = flattenForSelect(buildTopicTree(flatTopics));
  const preselect = topic && flatTopics.some((t) => t.id === topic) ? topic : null;

  if (topicOptions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <Link
          href="/practice"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
        >
          <Icon name="arrow-left" size={16} />
          返回我的题库
        </Link>
        <EmptyState
          icon="list"
          title="你还没有任何话题分类"
          desc="题目需要挂在话题下。先去「我的题库」左侧点「加根话题」建一个分类（如 分布式 / AI面试），再到分类下加题。"
          action={
            <Link href="/practice">
              <Button variant="primary" rightIcon={<Icon name="arrow-right" size={16} />}>
                去建话题
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <Link
        href="/practice"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
      >
        <Icon name="arrow-left" size={16} />
        返回我的题库
      </Link>
      <h1 className="font-serif text-2xl font-bold text-ink">新建题目</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        题目默认私有，只有你自己能看到。创建后可在详情页设为公开，分享到题库广场。
      </p>
      <Card padded>
        <QuestionForm
          topicOptions={topicOptions}
          direction={user.direction || "其他"}
          requireTopic
          initial={{
            difficulty: "中等",
            title: "",
            body: "",
            referenceAnswer: "",
            detailedAnswer: "",
            tags: "",
            topicId: preselect,
          }}
        />
      </Card>
    </div>
  );
}
