"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui";

interface Props {
  paperId: string;
  title: string;
  attemptCount: number;
}

// 试卷删除：硬删，连带 attempts 一起删（schema onDelete: Cascade）。
// 二次确认时把 attempt 数告诉用户，避免误删历史成绩。
export function DeletePaperButton({ paperId, title, attemptCount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const hint =
      attemptCount > 0
        ? `\n\n注意：该试卷已有 ${attemptCount} 次作答记录，删除后将一并清除。`
        : "";
    if (!confirm(`确定删除试卷「${title}」吗？${hint}`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/papers/${paperId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "删除失败");
        return;
      }
      router.refresh();
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      title={busy ? "删除中..." : "删除试卷"}
      disabled={busy}
      onClick={handleDelete}
      className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-brand-200 bg-surface px-3 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-25 disabled:opacity-50"
    >
      <Icon name="trash" size={14} />
      {busy ? "..." : "删除"}
    </button>
  );
}
