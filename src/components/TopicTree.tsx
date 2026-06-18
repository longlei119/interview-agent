"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { TopicNode } from "@/lib/topics";
import { Icon, Spinner } from "@/components/ui";

interface Props {
  tree: TopicNode[];
  activeId: string | null;
  unclassifiedCount: number;
  countMap: Record<string, number>;
}

const VIS_OPTIONS = [
  { value: "private", label: "私有", icon: "eye" as const, color: "text-muted" },
  { value: "public", label: "公开", icon: "globe" as const, color: "text-emerald-500" },
  { value: "force_off", label: "强制关闭", icon: "x" as const, color: "text-red-500" },
];

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

  async function changeVisibility(id: string, name: string, visibility: string) {
    await call(`/api/topics/${id}`, "PATCH", { visibility });
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

  const itemClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 ${
      active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-canvas hover:text-ink"
    }`;

  return (
    <aside className="w-full shrink-0 md:w-60">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">话题分类</span>
        <button
          onClick={addRoot}
          disabled={busy}
          className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-60"
        >
          {busy ? <Spinner size="sm" /> : <Icon name="plus" size={12} />}
          加根话题
        </button>
      </div>

      <div className="rounded-xl border border-line bg-surface p-2 text-sm shadow-card">
        <Link href="/practice" className={itemClass(!activeId)}>
          <Icon name="list" size={14} />
          <span className="flex-1">全部题目</span>
        </Link>

        {tree.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted">
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
            onChangeVisibility={changeVisibility}
          />
        ))}

        <Link
          href="/practice?topic=none"
          className={`${itemClass(activeId === "none")} mt-1 border-t border-line pt-1`}
        >
          <Icon name="file" size={14} />
          <span className="flex-1">未分类</span>
          <span className="text-xs text-muted">{unclassifiedCount}</span>
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
  onChangeVisibility,
}: {
  node: TopicNode;
  depth: number;
  activeId: string | null;
  countMap: Record<string, number>;
  busy: boolean;
  onAddChild: (id: string, name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string, name: string) => void;
  onChangeVisibility: (id: string, name: string, visibility: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [visOpen, setVisOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const active = activeId === node.id;
  const v = node.visibility || "private";
  const currentVis = VIS_OPTIONS.find((o) => o.value === v) || VIS_OPTIONS[0];

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg px-1 py-1 transition-colors ${
          active ? "bg-brand-50" : "hover:bg-canvas"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-muted transition-transform"
            style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
          >
            <Icon name="chevron-down" size={14} />
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}

        <Link
          href={`/practice?topic=${node.id}`}
          className={`min-w-0 flex-1 truncate ${active ? "text-brand-700" : "text-ink"}`}
        >
          {node.name}
          {node.visibility === "public" && (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" title="已公开" />
          )}
          {node.visibility === "force_off" && (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-red-400" title="强制关闭" />
          )}
          <span className={`ml-1.5 text-xs ${active ? "text-brand-400" : "text-muted"}`}>
            {countMap[node.id] ?? 0}
          </span>
        </Link>

        {/* Visibility quick toggle */}
        <span className="flex shrink-0 items-center gap-0.5 text-muted">
          <div className="relative">
            <button
              onClick={() => setVisOpen(!visOpen)}
              disabled={busy}
              title={`可见性：${currentVis.label}`}
              className={`rounded p-1 transition-opacity hover:bg-canvas ${
                v !== "private" ? `opacity-100 ${currentVis.color}` : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <Icon name={currentVis.icon} size={12} />
            </button>
            {visOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-line bg-surface py-1 shadow-hover min-w-[90px]">
                {VIS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChangeVisibility(node.id, node.name, opt.value);
                      setVisOpen(false);
                    }}
                    className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-xs transition-colors hover:bg-canvas ${
                      v === opt.value ? "font-semibold text-brand-600" : "text-muted"
                    }`}
                  >
                    <Icon name={opt.icon} size={12} className={opt.color} />
                    {opt.label}
                    {v === opt.value && <Icon name="check" size={10} className="ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onAddChild(node.id, node.name)}
              disabled={busy}
              title="新建子话题"
              className="rounded p-1 hover:bg-brand-100 hover:text-brand-600"
            >
              <Icon name="plus" size={12} />
            </button>
            <button
              onClick={() => onRename(node.id, node.name)}
              disabled={busy}
              title="重命名"
              className="rounded p-1 hover:bg-brand-100 hover:text-brand-600"
            >
              <Icon name="edit" size={12} />
            </button>
            <button
              onClick={() => onRemove(node.id, node.name)}
              disabled={busy}
              title="删除"
              className="rounded p-1 hover:bg-red-100 hover:text-red-600"
            >
              <Icon name="trash" size={12} />
            </button>
          </span>
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
              onChangeVisibility={onChangeVisibility}
            />
          ))}
        </div>
      )}
    </div>
  );
}
