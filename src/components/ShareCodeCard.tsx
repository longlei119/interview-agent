"use client";

import { useState } from "react";
import { Icon, Spinner } from "@/components/ui";

interface Props {
  shareCode: string | null;
  shareCodeSetAt: string | null;
}

export function ShareCodeCard({ shareCode, shareCodeSetAt }: Props) {
  const [code, setCode] = useState(shareCode);
  const [setAt, setSetAt] = useState(shareCodeSetAt);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!code) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}/u/${code}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function reset() {
    if (!confirm("重置分享码后旧码立即失效，确定继续？")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/me/share-code/reset", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCode(data.shareCode);
        setSetAt(new Date().toISOString());
        window.location.reload();
      } else {
        alert(data.error || "重置失败");
      }
    } finally {
      setBusy(false);
    }
  }

  const canReset = (() => {
    if (!setAt) return true;
    return Date.now() - new Date(setAt).getTime() >= 24 * 60 * 60 * 1000;
  })();

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <h2 className="font-semibold text-ink mb-1">我的分享码</h2>
      <p className="text-xs text-muted mb-4">
        将分享码发给别人，他们就能浏览和同步你公开的题库。
      </p>

      {code ? (
        <div className="flex items-center gap-3">
          <code className="rounded-lg bg-canvas px-4 py-2 text-xl font-mono tracking-widest text-brand-700 border border-line">
            {code}
          </code>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50"
          >
            <Icon name={copied ? "check" : "copy"} size={14} />
            {copied ? "已复制" : "复制链接"}
          </button>
          <button
            onClick={reset}
            disabled={busy || !canReset}
            title={!canReset ? "每天只能重置一次" : "重置分享码"}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-brand-25 hover:text-brand-500 disabled:opacity-40"
          >
            {busy ? <Spinner size="sm" /> : <Icon name="refresh" size={14} />}
            重置
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">暂未生成分享码，联系管理员处理。</p>
      )}

      {!canReset && setAt && (
        <p className="mt-2 text-xs text-muted">
          距离可重置时间还有{" "}
          {Math.ceil(
            (24 * 60 * 60 * 1000 - (Date.now() - new Date(setAt).getTime())) /
              (60 * 60 * 1000)
          )}{" "}
          小时
        </p>
      )}
    </div>
  );
}
