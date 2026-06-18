import { prisma } from "./db";
import { isTopicVisibleToCode, isQuestionVisibleToCode } from "./visibility";

type TopicTreeItem = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
};

function sortByDepth(topics: TopicTreeItem[]): TopicTreeItem[] {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const depthCache = new Map<string, number>();

  function depth(id: string | null): number {
    if (!id) return 0;
    if (depthCache.has(id)) return depthCache.get(id)!;
    const t = byId.get(id);
    const d = 1 + depth(t?.parentId ?? null);
    depthCache.set(id, d);
    return d;
  }

  return [...topics].sort((a, b) => depth(a.id) - depth(b.id));
}

function collectChildren(
  topics: TopicTreeItem[],
  rootIds: string[],
): TopicTreeItem[] {
  const byParent = new Map<string | null, TopicTreeItem[]>();
  for (const t of topics) {
    const key = t.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(t);
  }

  const result: TopicTreeItem[] = [];
  const queue = [...rootIds];
  const seen = new Set(rootIds);
  while (queue.length) {
    const id = queue.shift()!;
    const t = topics.find((t) => t.id === id);
    if (t) result.push(t);
    const kids = byParent.get(id) ?? [];
    for (const kid of kids) {
      if (!seen.has(kid.id)) {
        seen.add(kid.id);
        queue.push(kid.id);
      }
    }
  }
  return result;
}

interface TopicSyncResult {
  topicMap: Map<string, string>;
  newTopicCount: number;
  createdQuestions: number;
  skippedQuestions: number;
}

async function execSyncTopics(
  fromUserId: string,
  topicIds: string[],
  toUserId: string,
): Promise<TopicSyncResult> {
  // 1. 收集所有要同步的 topic（选中 + 子孙）
  const allFromTopicsFlat = await prisma.topic.findMany({
    where: { userId: fromUserId },
  });
  const allFromTopics = collectChildren(allFromTopicsFlat, topicIds);

  // 2. 过滤掉不对码可见的 topic
  const visibleTopics: TopicTreeItem[] = [];
  for (const t of allFromTopics) {
    if (await isTopicVisibleToCode(t.id)) visibleTopics.push(t);
  }

  // 3. 收集这些 topic 下的可见题目
  const visibleTopicIds = visibleTopics.map((t) => t.id);
  const fromQuestions = await prisma.question.findMany({
    where: {
      ownerId: fromUserId,
      topicId: { in: visibleTopicIds },
      deletedAt: null,
      forceHidden: false,
    },
  });

  const visibleQuestions = [];
  for (const q of fromQuestions) {
    if (await isQuestionVisibleToCode(q)) visibleQuestions.push(q);
  }

  // 4. 创建目录副本
  const topicMap = new Map<string, string>();
  let newTopicCount = 0;
  for (const t of sortByDepth(visibleTopics)) {
    const newParentId = t.parentId ? (topicMap.get(t.parentId) ?? null) : null;

    const existing = await prisma.topic.findFirst({
      where: { userId: toUserId, parentId: newParentId, name: t.name },
      select: { id: true },
    });
    if (existing) {
      topicMap.set(t.id, existing.id);
      continue;
    }

    const created = await prisma.topic.create({
      data: {
        userId: toUserId,
        parentId: newParentId,
        name: t.name,
        sortOrder: t.sortOrder,
        visibility: "private",
      },
    });
    topicMap.set(t.id, created.id);
    newTopicCount++;
  }

  // 5. 创建题目副本
  let createdQ = 0;
  let skippedQ = 0;
  for (const q of visibleQuestions) {
    const dup = await prisma.question.findFirst({
      where: { ownerId: toUserId, title: q.title, deletedAt: null },
      select: { id: true },
    });
    if (dup) {
      skippedQ++;
      continue;
    }

    await prisma.question.create({
      data: {
        ownerId: toUserId,
        topicId: topicMap.get(q.topicId!) ?? null,
        direction: q.direction,
        difficulty: q.difficulty,
        title: q.title,
        body: q.body,
        referenceAnswer: q.referenceAnswer,
        detailedAnswer: q.detailedAnswer,
        answerGeneratedByAi: q.answerGeneratedByAi,
        importedByAi: q.importedByAi,
        tags: q.tags,
        visibility: "private",
        forceHidden: false,
        sourceId: q.id,
      },
    });

    await prisma.question.update({
      where: { id: q.id },
      data: { cloneCount: { increment: 1 } },
    });
    createdQ++;
  }

  return { topicMap, newTopicCount, createdQuestions: createdQ, skippedQuestions: skippedQ };
}

interface PaperSyncResult {
  createdQuestions: number;
  skippedQuestions: number;
  newPaperId: string;
}

async function execSyncPaper(
  fromPaperId: string,
  toUserId: string,
): Promise<PaperSyncResult | null> {
  const paper = await prisma.testPaper.findFirst({
    where: { id: fromPaperId, isPublic: true },
    include: { items: { include: { question: true } } },
  });
  if (!paper) return null;

  const dup = await prisma.testPaper.findFirst({
    where: { userId: toUserId, title: paper.title },
  });
  if (dup) return null;

  let createdQ = 0;
  let skippedQ = 0;

  const newPaper = await prisma.testPaper.create({
    data: {
      userId: toUserId,
      title: paper.title,
      description: paper.description,
      timeLimit: paper.timeLimit,
      isPublic: false,
    },
  });

  for (const item of paper.items) {
    const q = item.question;
    let localQ = await prisma.question.findFirst({
      where: { ownerId: toUserId, title: q.title, deletedAt: null },
    });

    if (!localQ) {
      localQ = await prisma.question.create({
        data: {
          ownerId: toUserId,
          topicId: null,
          direction: q.direction,
          difficulty: q.difficulty,
          title: q.title,
          body: q.body,
          referenceAnswer: q.referenceAnswer,
          detailedAnswer: q.detailedAnswer,
          answerGeneratedByAi: q.answerGeneratedByAi,
          importedByAi: q.importedByAi,
          tags: q.tags,
          visibility: "private",
          sourceId: q.id,
        },
      });
      await prisma.question.update({
        where: { id: q.id },
        data: { cloneCount: { increment: 1 } },
      });
      createdQ++;
    } else {
      skippedQ++;
    }

    await prisma.testPaperItem.create({
      data: { paperId: newPaper.id, questionId: localQ.id, sortOrder: item.sortOrder },
    });
  }

  return { createdQuestions: createdQ, skippedQuestions: skippedQ, newPaperId: newPaper.id };
}

// 同步选中目录（含子树）-- API 调用入口
export async function syncTopics(
  fromUserId: string,
  topicIds: string[],
  toUserId: string,
  syncRecordId: string,
): Promise<void> {
  try {
    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: { status: "running" },
    });

    const r = await execSyncTopics(fromUserId, topicIds, toUserId);

    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: {
        status: "done",
        createdCount: r.createdQuestions,
        skippedCount: r.skippedQuestions,
        newTopicCount: r.newTopicCount,
        finishedAt: new Date(),
      },
    });
  } catch (e: any) {
    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: { status: "failed", error: e.message || "同步失败", finishedAt: new Date() },
    });
  }
}

// 同步单张试卷 -- API 调用入口
export async function syncPaper(
  fromPaperId: string,
  toUserId: string,
  syncRecordId: string,
): Promise<void> {
  try {
    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: { status: "running" },
    });

    const r = await execSyncPaper(fromPaperId, toUserId);

    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: r
        ? { status: "done", createdCount: r.createdQuestions, skippedCount: r.skippedQuestions, newPaperCount: 1, finishedAt: new Date() }
        : { status: "done", finishedAt: new Date() },
    });
  } catch (e: any) {
    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: { status: "failed", error: e.message || "同步失败", finishedAt: new Date() },
    });
  }
}

// 同步全部 -- API 调用入口
export async function syncAll(
  fromUserId: string,
  toUserId: string,
  syncRecordId: string,
): Promise<void> {
  try {
    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: { status: "running" },
    });

    // 同步公开 Topic（根节点中可见的）
    const allTopics = await prisma.topic.findMany({
      where: { userId: fromUserId },
    });
    const visibleRootIds: string[] = [];
    for (const t of allTopics) {
      if (t.parentId === null && (await isTopicVisibleToCode(t.id))) {
        visibleRootIds.push(t.id);
      }
    }

    const topicResult = await execSyncTopics(fromUserId, visibleRootIds, toUserId);

    // 同步所有公开试卷
    const publicPapers = await prisma.testPaper.findMany({
      where: { userId: fromUserId, isPublic: true },
      select: { id: true },
    });

    let totalCreatedQ = topicResult.createdQuestions;
    let totalSkippedQ = topicResult.skippedQuestions;
    let newPaperCount = 0;

    for (const p of publicPapers) {
      const pr = await execSyncPaper(p.id, toUserId);
      if (pr) {
        totalCreatedQ += pr.createdQuestions;
        totalSkippedQ += pr.skippedQuestions;
        newPaperCount++;
      }
    }

    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: {
        status: "done",
        createdCount: totalCreatedQ,
        skippedCount: totalSkippedQ,
        newTopicCount: topicResult.newTopicCount,
        newPaperCount,
        finishedAt: new Date(),
      },
    });
  } catch (e: any) {
    await prisma.syncRecord.update({
      where: { id: syncRecordId },
      data: { status: "failed", error: e.message || "同步失败", finishedAt: new Date() },
    });
  }
}
