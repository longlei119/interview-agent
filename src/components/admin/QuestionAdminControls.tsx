"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  questionId: string;
  isDelisted: boolean;
  manualHeat: number;
}

export function QuestionAdminControls({ questionId, isDelisted, manualHeat }: Props) {
  const router = useRouter();
  const [delisted, setDelisted] = useState(isDelisted);
  const [heat, setHeat] = useState(String(manualHeat));
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    } finally {
      setBusy(false);
    }
  }

  async function toggleDelist() {
    const ok = await patch({ isDelisted: !delisted });
    if (ok) {
      setDelisted(!delisted);
      router.refresh();
    }
  }

  async function saveHeat() {
    const n = Number(heat);
    if (!Number.isFinite(n) || n < 0) return;
    const ok = await patch({ manualHeat: Math.floor(n) });
    if (ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={toggleDelist}
        disabled={busy}
        className={`rounded-lg px-3 py-1 text-sm font-medium disabled:opacity-60 ${
          delisted
            ? "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            : "border border-red-200 bg-white text-red-600 hover:bg-red-50"
        }`}
      >
        {delisted ? "已下架 · 恢复" : "下架"}
      </button>
      <span className="flex items-center gap-1 text-sm text-gray-500">
        热度
        <input
          type="number"
          min={0}
          value={heat}
          onChange={(e) => setHeat(e.target.value)}
          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <button
          onClick={saveHeat}
          disabled={busy}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          保存
        </button>
      </span>
    </div>
  );
}
