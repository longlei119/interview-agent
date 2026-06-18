import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";
import { findTopicPath } from "./topics";

// 题目导出：把题目按「方向 / 话题树路径 / 题目标题」写成 Markdown 文件。
// 触发点：新建题目、AI 导入题目。异步调用，失败只记日志，不影响业务。
//
// 目录示例：
//   exports/questions/
//     前端/
//       JavaScript/
//         什么是闭包.md
//       React/
//         hooks 原理.md
//     后端/
//       未分类/
//         CAP 理论.md
//
// 测试时不要删现有数据：导出只写文件，不删任何 DB 记录；同名文件覆盖（标题相同的题）。

const ROOT_DIR = path.resolve(process.cwd(), "exports", "questions");

// Windows / macOS / Linux 文件名都禁用的字符，统一替换成下划线
function sanitizeName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "未命名";
}

// HTML → 纯文本（导出 Markdown 正文用，去掉标签）
function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/?h[1-6][^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface ExportInput {
  questionId: string;
}

// 解析题目 + 所属话题路径，渲染 Markdown，写入文件。
// 导出失败不抛错，只 log，避免影响新建/导入主流程。
export async function exportQuestionToFile({ questionId }: ExportInput): Promise<void> {
  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { topic: true },
    });
    if (!question) return;

    // 拼话题路径：没有 topicId → 「未分类」；有 → 从根到该节点
    let topicSegments: string[] = ["未分类"];
    if (question.topicId) {
      const allTopics = await prisma.topic.findMany({
        where: { userId: question.ownerId },
        select: { id: true, name: true, parentId: true, sortOrder: true },
      });
      const trail = findTopicPath(
        allTopics.map((t) => ({ id: t.id, name: t.name, parentId: t.parentId, sortOrder: t.sortOrder })),
        question.topicId
      );
      if (trail.length > 0) {
        topicSegments = trail.map((t) => sanitizeName(t.name));
      }
    }

    const direction = sanitizeName(question.direction || "其他");
    const title = sanitizeName(question.title || "未命名题目");
    const dir = path.join(ROOT_DIR, direction, ...topicSegments);
    await fs.mkdir(dir, { recursive: true });

    const tags = question.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const lines: string[] = [];
    lines.push(`# ${question.title || "未命名题目"}`);
    lines.push("");
    lines.push(`> 题目 ID: \`${question.id}\``);
    lines.push("");
    lines.push(`- 方向: ${question.direction || "其他"}`);
    lines.push(`- 话题路径: ${[direction, ...topicSegments].join(" / ")}`);
    lines.push(`- 难度: ${question.difficulty}`);
    if (tags.length > 0) lines.push(`- 标签: ${tags.join(", ")}`);
    if (question.visibility === "public") lines.push(`- 可见性: 公开`);
    if (question.answerGeneratedByAi) lines.push(`- 标准答案: AI 生成`);
    if (question.importedByAi) lines.push(`- 来源: AI 导入`);
    lines.push(`- 创建时间: ${question.createdAt.toISOString()}`);
    lines.push("");
    lines.push(`## 题目`);
    lines.push("");
    lines.push(question.body || "（无题干）");
    lines.push("");
    lines.push(`## 标准答案`);
    lines.push("");
    lines.push(htmlToText(question.referenceAnswer) || "（无标准答案）");
    lines.push("");
    lines.push(`## 详细答案`);
    lines.push("");
    lines.push(htmlToText(question.detailedAnswer) || "（无详细答案）");
    lines.push("");

    const filePath = path.join(dir, `${title}.md`);
    await fs.writeFile(filePath, lines.join("\n"), "utf8");
  } catch (e) {
    console.error(`[export-question] 导出失败 questionId=${questionId}:`, e);
  }
}
