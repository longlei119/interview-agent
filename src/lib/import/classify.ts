import { chat } from "../deepseek";
import { parseJsonLoose } from "./json";
import { classifyMessages } from "./prompts";
import type { ClassifyDecision, ExtractedQuestion } from "./types";

interface RawDecision {
  kind?: string;
  topicId?: string;
  name?: string;
  parentId?: string | null;
}

// 为一道题决定归属。喂入用户现有话题选项（id + 层级 label）。
// 解析失败、返回非法 kind、或引用了不在列表里的 id → 降级 fallback，绝不抛错中断。
export async function classifyQuestion(
  q: ExtractedQuestion,
  topicOptions: { id: string; label: string }[]
): Promise<ClassifyDecision> {
  let reply: string;
  try {
    reply = await chat(classifyMessages(q, topicOptions), {
      role: "primary",
      temperature: 0.1,
    });
  } catch {
    return { kind: "fallback" };
  }

  const raw = parseJsonLoose<RawDecision>(reply);
  if (!raw) return { kind: "fallback" };

  const validIds = new Set(topicOptions.map((t) => t.id));

  if (raw.kind === "existing") {
    if (raw.topicId && validIds.has(raw.topicId)) {
      return { kind: "existing", topicId: raw.topicId };
    }
    return { kind: "fallback" };
  }

  if (raw.kind === "new") {
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) return { kind: "fallback" };
    // parentId 要么是 null（新顶级分类），要么是列表里真实存在的 id；非法则降级兜底
    const parentId =
      raw.parentId && validIds.has(raw.parentId) ? raw.parentId : null;
    if (raw.parentId && !validIds.has(raw.parentId)) {
      return { kind: "fallback" };
    }
    return { kind: "new", name, parentId };
  }

  return { kind: "fallback" };
}
