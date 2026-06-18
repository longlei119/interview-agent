"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";

export function PaperVisibilityToggle({
  paperId,
  isPublic,
}: {
  paperId: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/papers/${paperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      if (res.ok) router.refresh();
      else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "操作失败");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={isPublic ? "设为私有" : "设为公开"}
      className={`rounded-lg p-1.5 text-xs transition-colors ${
        isPublic
          ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
          : "text-muted hover:bg-brand-50 hover:text-brand-600"
      }`}
    >
      <Icon name={isPublic ? "globe" : "eye"} size={14} />
    </button>
  );
}
