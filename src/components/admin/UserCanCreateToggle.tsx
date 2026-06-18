"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  userId: string;
  canCreate: boolean;
  isSelf: boolean;
}

export function UserCanCreateToggle({ userId, canCreate, isSelf }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(canCreate);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (isSelf) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canCreate: !value }),
      });
      if (res.ok) {
        setValue(!value);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (isSelf) {
    return <span className="text-xs text-muted">（你自己）</span>;
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-60 ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-line bg-surface text-muted hover:bg-canvas hover:text-ink"
      }`}
    >
      {value ? "可加题 · 点击关闭" : "已禁用 · 点击开启"}
    </button>
  );
}
