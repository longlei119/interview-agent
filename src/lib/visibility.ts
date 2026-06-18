import { prisma } from "./db";

// 获取 topic 从当前节点到根的完整路径（根→当前）
async function getTopicChain(topicId: string) {
  const chain: { id: string; parentId: string | null; visibility: string }[] = [];
  let cur = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { id: true, parentId: true, visibility: true },
  });
  while (cur) {
    chain.unshift(cur);
    if (!cur.parentId) break;
    cur = await prisma.topic.findUnique({
      where: { id: cur.parentId },
      select: { id: true, parentId: true, visibility: true },
    });
  }
  return chain; // 根 → 当前
}

// 计算某个 Topic 是否对凭码访问者可见
export async function isTopicVisibleToCode(topicId: string): Promise<boolean> {
  const chain = await getTopicChain(topicId);
  let visible = false;
  for (const node of chain) {
    if (node.visibility === "force_off") return false;
    if (node.visibility === "public") visible = true;
  }
  return visible;
}

// 计算某道 Question 是否对码可见
export async function isQuestionVisibleToCode(question: {
  visibility: string;
  forceHidden: boolean;
  topicId: string | null;
}): Promise<boolean> {
  if (question.forceHidden) return false;
  if (question.visibility === "public") return true;
  if (question.topicId) return await isTopicVisibleToCode(question.topicId);
  return false;
}

// 计算某道 Question 是否进广场
export async function isInExplore(question: {
  visibility: string;
  forceHidden: boolean;
  isDelisted: boolean;
  topicId: string | null;
}): Promise<boolean> {
  if (question.forceHidden || question.isDelisted) return false;
  if (question.visibility === "public") return true;
  if (question.topicId) return await isTopicVisibleToCode(question.topicId);
  return false;
}

// 获取某用户对凭码访问者可见的所有 topic
export async function getVisibleTopicsForUser(userId: string): Promise<Set<string>> {
  const allTopics = await prisma.topic.findMany({
    where: { userId },
    select: { id: true, visibility: true, parentId: true },
  });
  // 从根向下传播可见性
  const byParent = new Map<string | null, typeof allTopics>();
  for (const t of allTopics) {
    const key = t.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(t);
  }

  const visible = new Set<string>();
  const visited = new Set<string>();

  function walk(topicId: string | null, ancestorPublic: boolean, ancestorForceOff: boolean) {
    const children = byParent.get(topicId) ?? [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);

      const currentForceOff = ancestorForceOff || child.visibility === "force_off";
      const currentPublic = !currentForceOff && (ancestorPublic || child.visibility === "public");

      if (currentPublic) visible.add(child.id);
      walk(child.id, currentPublic, currentForceOff);
    }
  }

  walk(null, false, false);
  return visible;
}

// 获取某用户的公开主页完整数据（供 API 和页面复用）
export async function getPublicProfileData(shareCode: string) {
  const user = await prisma.user.findUnique({
    where: { shareCode },
    select: { id: true, name: true },
  });
  if (!user) return null;

  const visibleTopicIds = await getVisibleTopicsForUser(user.id);
  const allTopics = await prisma.topic.findMany({
    where: { userId: user.id },
    select: { id: true, parentId: true, name: true, sortOrder: true },
  });
  const visibleTopics = allTopics.filter((t) => visibleTopicIds.has(t.id));

  const allQuestions = await prisma.question.findMany({
    where: {
      ownerId: user.id,
      deletedAt: null,
      isDelisted: false,
    },
    select: {
      id: true,
      topicId: true,
      title: true,
      direction: true,
      difficulty: true,
      tags: true,
      viewCount: true,
      likeCount: true,
      cloneCount: true,
      visibility: true,
      forceHidden: true,
    },
  });

  const visibleQuestions = [];
  for (const q of allQuestions) {
    if (await isQuestionVisibleToCode(q)) {
      visibleQuestions.push({
        id: q.id,
        topicId: q.topicId,
        title: q.title,
        direction: q.direction,
        difficulty: q.difficulty,
        tags: q.tags,
        viewCount: q.viewCount,
        likeCount: q.likeCount,
        cloneCount: q.cloneCount,
      });
    }
  }

  const publicPapers = await prisma.testPaper.findMany({
    where: { userId: user.id, isPublic: true },
    select: {
      id: true,
      title: true,
      description: true,
      timeLimit: true,
      items: { select: { id: true } },
    },
  });

  return {
    user: { name: user.name },
    stats: {
      topicCount: visibleTopics.length,
      questionCount: visibleQuestions.length,
      paperCount: publicPapers.length,
    },
    topics: visibleTopics.map((t) => ({
      id: t.id,
      parentId: t.parentId,
      name: t.name,
      sortOrder: t.sortOrder,
      questionCount: allQuestions.filter((q) => q.topicId === t.id).length,
    })),
    questions: visibleQuestions,
    papers: publicPapers.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      timeLimit: p.timeLimit,
      questionCount: p.items.length,
    })),
  };
}
