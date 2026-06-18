"use client";

import { useState } from "react";
import { Button, Icon, ErrorBanner, HintBanner } from "@/components/ui";

// 题库页「一键导出题库」按钮：调 /api/questions/export，把当前用户所有题
// 导出成 exports/questions/方向/话题路径/标题.md。
export function ExportLibraryButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; total: number; dir?: string } | null>(null);
  const [error, setError] = useState("");

  async function handleExport() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/questions/export", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "导出失败");
        return;
      }
      setResult({
        success: data.success ?? 0,
        failed: data.failed ?? 0,
        total: data.total ?? 0,
        dir: data.dir,
      });
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleExport}
        loading={loading}
        leftIcon={!loading ? <Icon name="download" size={14} /> : undefined}
      >
        {loading ? "导出中..." : "一键导出题库"}
      </Button>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {result && (
        <div className="w-full">
          <HintBanner variant={result.failed > 0 ? "warn" : "success"}>
            {result.total === 0
              ? "题库为空，无需导出。"
              : `已导出 ${result.success}/${result.total} 道题${
                  result.failed > 0 ? `（${result.failed} 道失败）` : ""
                }，保存在项目根目录的 ${result.dir ?? "exports/questions"} 文件夹下，按「方向 / 话题路径 / 标题.md」分层。`}
          </HintBanner>
        </div>
      )}
    </div>
  );
}
