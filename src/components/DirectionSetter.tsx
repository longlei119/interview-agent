"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIRECTIONS } from "@/lib/directions";

// 顶部个人方向：显示当前方向，点「更改」切换为下拉，选后调 /api/me。
export function DirectionSetter({ direction }: { direction: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(next: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: next }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "保存失败");
      }
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="text-gray-400">我的方向</span>
        <select
          defaultValue={direction ?? ""}
          disabled={busy}
          onChange={(e) => e.target.value && save(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          <option value="" disabled>
            选择方向
          </option>
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          取消
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-500">
      我的方向：
      <span className="rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-600">
        {direction || "未设置"}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-brand-600 hover:underline"
      >
        更改
      </button>
    </span>
  );
}
