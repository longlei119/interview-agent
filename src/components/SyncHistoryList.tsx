"use client";

import { Badge } from "@/components/ui";

interface SyncRecordRow {
  id: string;
  fromUserName: string;
  scope: string;
  status: string;
  createdCount: number;
  skippedCount: number;
  newTopicCount: number;
  newPaperCount: number;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

function scopeLabel(scope: string) {
  if (scope === "all") return "全部同步";
  if (scope === "topic") return "目录同步";
  if (scope === "paper") return "试卷同步";
  return scope;
}

function statusBadge(status: string) {
  if (status === "done") return <Badge variant="success">完成</Badge>;
  if (status === "running") return <Badge variant="violet">进行中</Badge>;
  if (status === "pending") return <Badge variant="gray">排队中</Badge>;
  if (status === "failed") return <Badge variant="danger">失败</Badge>;
  return <Badge variant="gray">{status}</Badge>;
}

export function SyncHistoryList({ records }: { records: SyncRecordRow[] }) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
        <h2 className="font-semibold text-ink mb-1">同步记录</h2>
        <p className="text-sm text-muted">还没有同步记录。</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <h2 className="font-semibold text-ink mb-1">同步记录</h2>
      <p className="text-xs text-muted mb-4">你从其他人同步过来的题库记录。</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="pb-2 font-medium">来源</th>
              <th className="pb-2 font-medium">范围</th>
              <th className="pb-2 font-medium">状态</th>
              <th className="pb-2 font-medium">结果</th>
              <th className="pb-2 font-medium">时间</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-line/50">
                <td className="py-2 pr-3">{r.fromUserName}</td>
                <td className="py-2 pr-3 text-xs">{scopeLabel(r.scope)}</td>
                <td className="py-2 pr-3">{statusBadge(r.status)}</td>
                <td className="py-2 pr-3 text-xs">
                  {r.status === "done" && (
                    <span>
                      新建 {r.newTopicCount > 0 ? `${r.newTopicCount} 目录，` : ""}
                      {r.createdCount} 题
                      {r.skippedCount > 0 && `，跳过 ${r.skippedCount}`}
                      {r.newPaperCount > 0 && `，${r.newPaperCount} 试卷`}
                    </span>
                  )}
                  {r.status === "failed" && (
                    <span className="text-red-500">{r.error || "失败"}</span>
                  )}
                  {r.status === "pending" && <span className="text-muted">等待执行</span>}
                  {r.status === "running" && <span className="text-muted">正在同步</span>}
                </td>
                <td className="py-2 text-xs text-muted">
                  {new Date(r.createdAt).toLocaleString("zh-CN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
