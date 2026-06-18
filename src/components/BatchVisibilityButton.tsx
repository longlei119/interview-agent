"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Spinner } from "@/components/ui";

export function BatchVisibilityButton({
  topicIds,
  label,
}: {
  topicIds: string[];
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setPublic() {
    if (!confirm(`将「${label}」及其子目录设为公开？\n公开后任何人凭你的分享码都能看到这些题目。`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/topics/batch-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicIds, visibility: "public" }),
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

  if (topicIds.length === 0) return null;

  return (
    <button
      onClick={setPublic}
      disabled={busy}
      className="inline-flex h-8 items-center gap-1 rounded-lg border border-green bg-[rgba(95,122,77,0.15)] px-3 text-xs font-medium text-green transition-colors hover:bg-[rgba(95,122,77,0.25)] disabled:opacity-60"
    >
      {busy ? <Spinner size="sm" /> : <Icon name="globe" size={13} />}
      一键公开
    </button>
  );
}
