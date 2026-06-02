"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { TopicNode } from "@/lib/topics";

interface Props {
  tree: TopicNode[];
  activeId: string | null; // 当前选中的话题节点（null = 全部）
  unclassifiedCount: number; // 未分类题目数
  // 每个话题节点（含子孙）下的题目数，用于显示计数
  countMap: Record<string, number>;
}

export function TopicTree({ tree, activeId, unclassifiedCount, countMap }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function addRoot() {
    const name = prompt("新建根话题名称（如：分布式 / AI面试）");
    if (!name?.trim()) return;
    await call("/api/topics", "POST", { name: name.trim(), parentId: null });
  }

  async function addChild(parentId: string, parentName: string) {
    const name = prompt(`在「${parentName}」下新建子话题`);
    if (!name?.trim()) return;
    await call("/api/topics", "POST", { name: name.trim(), parentId });
  }

  async function rename(id: string, oldName: string) {
    const name = prompt("重命名话题", oldName);
    if (!name?.trim() || name.trim() === oldName) return;
    await call(`/api/topics/${id}`, "PATCH", { name: name.trim() });
  }

  async function remove(id: string, name: string) {
    if (
      !confirm(
        `删除话题「${name}」？\n子话题会上移到上一级，话题下的题目会移到「未分类」，题目不会被删除。`
      )
    )
      return;
    await call(`/api/topics/${id}`, "DELETE");
  }

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
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
    <aside className="w-full shrink-0 md:w-60">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400">话题分类</span>
        <button
          onClick={addRoot}
          disabled={busy}
          className="rounded-md px-2 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-60"
        >
          + 加根话题
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-2 text-sm">
        {/* 全部 */}
        <Link
          href="/practice"
          className={`block rounded-lg px-2 py-1.5 ${
            !activeId
              ? "bg-brand-500 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          全部题目
        </Link>

        {tree.length === 0 && (
          <p className="px-2 py-3 text-xs text-gray-400">
            还没有话题，点上方「加根话题」开始组织你的题库。
          </p>
        )}

        {tree.map((node) => (
          <TopicItem
            key={node.id}
            node={node}
            depth={0}
            activeId={activeId}
            countMap={countMap}
            busy={busy}
            onAddChild={addChild}
            onRename={rename}
            onRemove={remove}
          />
        ))}

        {/* 未分类 */}
        <Link
          href="/practice?topic=none"
          className={`mt-1 flex items-center justify-between rounded-lg px-2 py-1.5 ${
            activeId === "none"
              ? "bg-brand-500 text-white"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <span>未分类</span>
          <span className="text-xs opacity-70">{unclassifiedCount}</span>
        </Link>
      </div>
    </aside>
  );
}

function TopicItem({
  node,
  depth,
  activeId,
  countMap,
  busy,
  onAddChild,
  onRename,
  onRemove,
}: {
  node: TopicNode;
  depth: number;
  activeId: string | null;
  countMap: Record<string, number>;
  busy: boolean;
  onAddChild: (id: string, name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const active = activeId === node.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg px-1 py-1 ${
          active ? "bg-brand-500 text-white" : "hover:bg-gray-50"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {/* 折叠箭头 */}
        {hasChildren ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-xs opacity-70"
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}

        {/* 节点名（点击筛选） */}
        <Link
          href={`/practice?topic=${node.id}`}
          className={`min-w-0 flex-1 truncate ${
            active ? "text-white" : "text-gray-700"
          }`}
        >
          {node.name}
          <span
            className={`ml-1 text-xs ${active ? "opacity-80" : "text-gray-400"}`}
          >
            {countMap[node.id] ?? 0}
          </span>
        </Link>

        {/* 悬停操作 */}
        <span
          className={`flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
            active ? "text-white" : "text-gray-400"
          }`}
        >
          <button
            onClick={() => onAddChild(node.id, node.name)}
            disabled={busy}
            title="新建子话题"
            className="rounded px-1 hover:bg-black/10"
          >
            +
          </button>
          <button
            onClick={() => onRename(node.id, node.name)}
            disabled={busy}
            title="重命名"
            className="rounded px-1 hover:bg-black/10"
          >
            ✎
          </button>
          <button
            onClick={() => onRemove(node.id, node.name)}
            disabled={busy}
            title="删除"
            className="rounded px-1 hover:bg-black/10"
          >
            ✕
          </button>
        </span>
      </div>

      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <TopicItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              countMap={countMap}
              busy={busy}
              onAddChild={onAddChild}
              onRename={onRename}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
