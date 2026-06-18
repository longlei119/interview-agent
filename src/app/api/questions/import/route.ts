import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isValidDifficulty, isValidDirection } from "@/lib/directions";
import { ADMIN_DEFAULT_MANUAL_HEAT } from "@/lib/heat";
import { buildTopicTree, flattenForSelect } from "@/lib/topics";
import { isVisionConfigured, VisionModelNotConfiguredError } from "@/lib/deepseek";
import { extractFromText, extractFromImages } from "@/lib/import/extract";
import { classifyQuestion } from "@/lib/import/classify";
import { generateAnswer } from "@/lib/import/answer";
import { exportQuestionToFile } from "@/lib/export-question";
import type { ExtractedQuestion } from "@/lib/import/types";

const FALLBACK_ROOT_NAME = "模型生成";

// 「导入题目」：图片/文本 → AI 识别 → 自动分类 → 无答案补答案 → 全自动入库。
// 不复用强制 topicId 的 POST /api/questions（那是手动建题规则）；这里分类由 AI 决定。
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!user.canCreate) {
    return NextResponse.json({ error: "你的加题权限已被管理员关闭" }, { status: 403 });
  }

  const { mode, text, images } = await req.json();

  if (mode !== "text" && mode !== "image") {
    return NextResponse.json({ error: "无效的导入方式" }, { status: 400 });
  }
  if (mode === "image" && !(await isVisionConfigured())) {
    return NextResponse.json(
      { error: "视觉模型未配置，暂时无法从图片识别题目，请改用粘贴文本" },
      { status: 422 }
    );
  }

  // 1) 提取
  let extracted: ExtractedQuestion[];
  try {
    if (mode === "text") {
      if (typeof text !== "string" || !text.trim()) {
        return NextResponse.json({ error: "请粘贴要导入的文本" }, { status: 400 });
      }
      extracted = await extractFromText(text);
    } else {
      if (!Array.isArray(images) || images.length === 0) {
        return NextResponse.json({ error: "请上传至少一张图片" }, { status: 400 });
      }
      extracted = await extractFromImages(images as string[]);
    }
  } catch (e) {
    if (e instanceof VisionModelNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 422 });
    }
    return NextResponse.json(
      { error: "识别失败：" + (e instanceof Error ? e.message : "未知错误") },
      { status: 500 }
    );
  }

  if (extracted.length === 0) {
    return NextResponse.json({
      ok: true,
      created: 0,
      failed: 0,
      answersGenerated: 0,
      newTopics: [],
      items: [],
      errors: [],
      message: "未识别到任何面试题",
    });
  }

  // 2) 一次性加载话题树（内存副本：新建节点后追加，供后续题命中）
  const flatTopics = await prisma.topic.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  let topicOptions = flattenForSelect(buildTopicTree(flatTopics));

  // sortOrder 批量计数器：某父首次建子时用实时 count 作种子，之后本地 +1，避免循环里 count 不自增撞车
  const sortCounters = new Map<string, number>();
  const parentKey = (parentId: string | null) => parentId ?? "ROOT";
  async function nextSortOrder(parentId: string | null): Promise<number> {
    const key = parentKey(parentId);
    if (!sortCounters.has(key)) {
      const count = await prisma.topic.count({
        where: { userId: user!.id, parentId: parentId ?? null },
      });
      sortCounters.set(key, count);
    }
    const cur = sortCounters.get(key)!;
    sortCounters.set(key, cur + 1);
    return cur;
  }

  // 同名同父去重：先查内存（含本次新建），命中已有节点则复用
  function findExistingTopic(name: string, parentId: string | null): string | null {
    const hit = flatTopics.find(
      (t) => t.name === name && (t.parentId ?? null) === (parentId ?? null)
    );
    return hit ? hit.id : null;
  }

  async function createTopic(name: string, parentId: string | null): Promise<string> {
    const existing = findExistingTopic(name, parentId);
    if (existing) return existing;
    const sortOrder = await nextSortOrder(parentId);
    const created = await prisma.topic.create({
      data: { userId: user!.id, parentId: parentId ?? null, name, sortOrder },
    });
    // 加进内存副本，后续题/去重可命中
    flatTopics.push({ id: created.id, name, parentId: parentId ?? null, sortOrder });
    topicOptions = flattenForSelect(buildTopicTree(flatTopics));
    return created.id;
  }

  // 兜底根「模型生成」find-or-create（懒创建：只有真有题落兜底才建）
  let fallbackRootId: string | null = null;
  async function getFallbackRoot(): Promise<string> {
    if (fallbackRootId) return fallbackRootId;
    const existing = findExistingTopic(FALLBACK_ROOT_NAME, null);
    fallbackRootId = existing ?? (await createTopic(FALLBACK_ROOT_NAME, null));
    return fallbackRootId;
  }

  const direction = isValidDirection(user.direction ?? "") ? user.direction! : "其他";
  const manualHeat = user.role === "admin" ? ADMIN_DEFAULT_MANUAL_HEAT : 0;

  const newTopics: { id: string; name: string }[] = [];
  const items: { id: string; title: string; topicLabel: string; answerGeneratedByAi: boolean }[] = [];
  const errors: { title: string; message: string }[] = [];
  let answersGenerated = 0;

  // 3) 逐题顺序处理（每题 try/catch，单题失败不拖垮整批）
  for (const q of extracted) {
    try {
      const decision = await classifyQuestion(q, topicOptions);

      let topicId: string;
      if (decision.kind === "existing") {
        topicId = decision.topicId;
      } else if (decision.kind === "new") {
        const before = flatTopics.length;
        topicId = await createTopic(decision.name, decision.parentId);
        // 若确实新建了（不是命中已有），记到 newTopics
        if (flatTopics.length > before) {
          newTopics.push({ id: topicId, name: decision.name });
        }
      } else {
        topicId = await getFallbackRoot();
      }

      // 补答案：原文没答案才生成
      let referenceAnswer = q.referenceAnswer;
      let answerGeneratedByAi = false;
      if (!referenceAnswer.trim()) {
        try {
          referenceAnswer = await generateAnswer(q);
          answerGeneratedByAi = true;
          answersGenerated++;
        } catch {
          referenceAnswer = ""; // 补答案失败也入库，只是没答案、不打徽章
        }
      }

      const difficulty = isValidDifficulty(q.difficulty ?? "") ? q.difficulty! : "中等";

      const created = await prisma.question.create({
        data: {
          ownerId: user.id,
          topicId,
          direction,
          difficulty,
          title: q.body, // 标题=题目
          body: q.body,
          referenceAnswer,
          tags: "",
          visibility: "private",
          importedByAi: true,
          answerGeneratedByAi,
          manualHeat,
        },
      });

      // 异步导出到 exports/questions/方向/话题路径/标题.md
      void exportQuestionToFile({ questionId: created.id });

      const label =
        topicOptions.find((t) => t.id === topicId)?.label ?? FALLBACK_ROOT_NAME;
      items.push({
        id: created.id,
        title: q.body,
        topicLabel: label,
        answerGeneratedByAi,
      });
    } catch (e) {
      errors.push({
        title: q.body.slice(0, 40),
        message: e instanceof Error ? e.message : "入库失败",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    created: items.length,
    failed: errors.length,
    answersGenerated,
    newTopics,
    items,
    errors,
  });
}
