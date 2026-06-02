"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  userId: string;
  canCreate: boolean;
  // 自己这一行不给关，避免把自己锁死
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
    return <span className="text-xs text-gray-400">（你自己）</span>;
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-lg px-3 py-1 text-sm font-medium disabled:opacity-60 ${
        value
          ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
      }`}
    >
      {value ? "可加题 · 点击关闭" : "已禁用 · 点击开启"}
    </button>
  );
}
