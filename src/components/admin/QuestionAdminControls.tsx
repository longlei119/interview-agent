"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Icon, Input } from "@/components/ui";

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
      <Button
        onClick={toggleDelist}
        disabled={busy}
        size="sm"
        variant={delisted ? "secondary" : "danger"}
        leftIcon={<Icon name={delisted ? "check" : "x"} size={14} />}
      >
        {delisted ? "已下架 · 恢复" : "下架"}
      </Button>
      <span className="flex items-center gap-1.5 text-sm text-muted">
        热度
        <Input
          type="number"
          min={0}
          value={heat}
          onChange={(e) => setHeat(e.target.value)}
          className="w-20 py-1"
        />
        <Button onClick={saveHeat} disabled={busy} size="sm" variant="secondary">
          保存
        </Button>
      </span>
    </div>
  );
}
