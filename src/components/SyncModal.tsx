"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Spinner } from "@/components/ui";

export function SyncModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) {
      alert("分享码为 8 位字符");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/u/${trimmed}`);
      if (!res.ok) {
        alert("分享码无效或该用户无公开内容");
        setBusy(false);
        return;
      }
      router.push(`/u/${trimmed}`);
      onClose();
    } catch {
      alert("验证失败");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-hover animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink">同步他人题库</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:text-ink">
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-muted mb-2">
            输入对方的 8 位分享码
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="如：AB3K7X9M"
            className="w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-center font-mono text-lg tracking-widest text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            autoFocus
          />
          <p className="mt-2 text-xs text-muted">
            输入对方设置页中的分享码即可查看和同步其公开题库。
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-canvas"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={busy || code.trim().length !== 8}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:bg-brand-600 disabled:opacity-40"
            >
              {busy ? <Spinner size="sm" /> : <Icon name="search" size={14} />}
              查看公开主页
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
