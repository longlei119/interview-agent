"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui";

interface Props {
  questionId: string;
  title: string;
  /** 紧凑模式：题库列表卡片用图标按钮；详情页用完整按钮 */
  variant?: "icon" | "full";
  /** 删除成功后跳转的路径，默认 /practice */
  redirectTo?: string;
}

// 题目删除按钮：二次确认 → 调 DELETE /api/questions/[id] → 软删 + 同步从试卷剔除
export function DeleteQuestionButton({
  questionId,
  title,
  variant = "full",
  redirectTo = "/practice",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!confirm(`确定删除「${title}」吗？\n删除后将从题库移除，引用它的试卷也会自动剔除这道题。`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "删除失败");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        title={busy ? "删除中..." : "删除"}
        disabled={busy}
        onClick={handleDelete}
        className="inline-flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        <Icon name="trash" size={14} />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleDelete}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
    >
      <Icon name="trash" size={14} />
      {busy ? "删除中..." : "删除"}
    </button>
  );
}
