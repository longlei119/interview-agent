"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Spinner } from "@/components/ui";

export function SyncButtons({ code }: { code: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function doSyncAll() {
    if (!confirm("同步该作者全部公开内容到你的题库？")) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "同步失败");
        return;
      }
      pollStatus(data.syncRecordId);
    } catch (e) {
      alert("同步请求失败");
      setSyncing(false);
    }
  }

  function pollStatus(syncRecordId: string) {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync/status?id=${syncRecordId}`);
        const data = await res.json();
        if (data.status === "done") {
          clearInterval(timer);
          setSyncing(false);
          router.push("/settings");
          router.refresh();
        } else if (data.status === "failed") {
          clearInterval(timer);
          setSyncing(false);
          alert(data.error || "同步失败");
        }
      } catch {
        // 继续轮询
      }
    }, 1500);
  }

  return (
    <div className="mb-6 flex items-center gap-3">
      <button
        onClick={doSyncAll}
        disabled={syncing}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60"
      >
        {syncing ? (
          <Spinner size="sm" />
        ) : (
          <Icon name="download" size={16} />
        )}
        同步全部公开内容
      </button>
      <span className="text-xs text-muted">
        复制到你的题库，可再次编辑和分享
      </span>
    </div>
  );
}
