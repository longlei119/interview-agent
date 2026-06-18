"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIRECTIONS } from "@/lib/directions";
import { Icon, Select } from "@/components/ui";

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
        <span className="text-muted">我的方向</span>
        <Select
          defaultValue={direction ?? ""}
          disabled={busy}
          onChange={(e) => e.target.value && save(e.target.value)}
          className="w-auto py-1"
        >
          <option value="" disabled>
            选择方向
          </option>
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-muted hover:text-ink"
        >
          取消
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      我的方向：
      <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
        <Icon name="compass" size={12} />
        {direction || "未设置"}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
      >
        <Icon name="edit" size={12} />
        更改
      </button>
    </span>
  );
}
