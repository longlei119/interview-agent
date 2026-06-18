"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Icon,
  Input,
} from "@/components/ui";

interface QuestionOption {
  id: string;
  difficulty: string;
  title: string;
  topic: string | null;
  topicId: string | null;
}

interface TopicNode {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  children: TopicNode[];
}

interface Props {
  mode: "create" | "edit";
  paperId?: string;
  userQuestions: QuestionOption[];
  topics: TopicNode[];
  initial?: {
    title: string;
    description: string;
    timeLimit: number | null;
    isPublic?: boolean;
    questionIds: string[];
  };
}

export function PaperForm({ mode, paperId, userQuestions, topics, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [timeLimit, setTimeLimit] = useState<string>(
    initial?.timeLimit != null ? String(initial.timeLimit) : "30"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initial?.questionIds ?? [])
  );
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = userQuestions.filter((q) => {
    if (filterTopic && q.topicId !== filterTopic) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !q.title.toLowerCase().includes(s) &&
        !(q.topic ?? "").toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  function toggleQuestion(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setError("");
    if (!title.trim()) {
      setError("请填写试卷标题");
      return;
    }
    if (selectedIds.size === 0) {
      setError("请至少选择一道题目");
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/papers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            timeLimit: timeLimit ? Number(timeLimit) : null,
            isPublic,
            questionIds: Array.from(selectedIds),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          router.push("/paper");
          router.refresh();
        } else {
          setError(data.error ?? "创建失败");
        }
      } else if (mode === "edit" && paperId) {
        const res = await fetch(`/api/papers/${paperId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            timeLimit: timeLimit ? Number(timeLimit) : null,
            isPublic,
            questionIds: Array.from(selectedIds),
          }),
        });
        if (res.ok) {
          router.push("/paper");
          router.refresh();
        } else {
          const data = await res.json();
          setError(data.error ?? "更新失败");
        }
      }
    } catch {
      setError("操作失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  function renderTopicTree(nodes: TopicNode[], depth: number): React.ReactNode {
    return nodes.map((n) => (
      <div key={n.id}>
        <button
          onClick={() => setFilterTopic(filterTopic === n.id ? null : n.id)}
          className={`flex w-full items-center gap-1 rounded-lg px-1 py-1 text-left text-sm transition-colors ${
            filterTopic === n.id
              ? "bg-brand-50 text-brand-700"
              : "text-ink hover:bg-canvas"
          }`}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {n.children.length > 0 ? (
            <Icon name="chevron-down" size={12} className="shrink-0 text-muted" />
          ) : (
            <span className="h-3 w-3 shrink-0" />
          )}
          <span className="min-w-0 truncate">{n.name}</span>
        </button>
        {n.children.length > 0 && renderTopicTree(n.children, depth + 1)}
      </div>
    ));
  }

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition-colors duration-150 ${
      active
        ? "bg-brand-500 text-white shadow-soft"
        : "bg-surface text-muted border border-line hover:border-brand-300 hover:text-ink"
    }`;

  return (
    <div>
      <Card padded className="mb-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <Input
                placeholder="试卷标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              限时
              <Input
                className="w-16 text-center"
                type="number"
                min={1}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
              />
              分钟
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="试卷描述（可选）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <label className="flex items-center gap-2 text-sm text-muted whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-line text-brand-500 focus:ring-brand-400"
              />
              <Icon name="globe" size={14} className={isPublic ? "text-emerald-500" : "text-muted"} />
              公开试卷
            </label>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-3">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      <div className="flex flex-col gap-5 md:flex-row">
        <aside className="w-full shrink-0 md:w-56">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              话题分类
            </span>
          </div>
          <div className="rounded-xl border border-line bg-surface p-2 shadow-card">
            <button
              onClick={() => setFilterTopic(null)}
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                !filterTopic
                  ? "bg-brand-50 text-brand-700"
                  : "text-muted hover:bg-canvas hover:text-ink"
              }`}
            >
              全部题目
            </button>
            {renderTopicTree(topics, 0)}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Icon
                name="search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                className="pl-9"
                placeholder="搜索题目关键词..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {["", "简单", "中等", "困难"].map((d) => (
                <button
                  key={d}
                  onClick={() => setFilterDifficulty(d)}
                  className={chipClass(filterDifficulty === d)}
                >
                  {d || "全部"}
                </button>
              ))}
            </div>
          </div>

          <Card padded={false} className="overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted">没有匹配的题目</div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {filtered.map((q) => {
                  const sel = selectedIds.has(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      className={`flex cursor-pointer items-start gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 ${
                        sel ? "bg-brand-25/60" : "hover:bg-canvas"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                          sel
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-line"
                        }`}
                      >
                        {sel && <Icon name="check" size={12} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink">{q.title}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            difficulty={q.difficulty as "简单" | "中等" | "困难"}
                          />
                          {q.topic && <span className="text-xs text-muted">{q.topic}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line bg-canvas/50 px-4 py-3">
              <span className="text-sm font-semibold text-ink">
                已选 <span className="text-brand-600">{selectedIds.size}</span> 题
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  清空
                </Button>
                <Button onClick={handleSave} loading={saving} size="sm">
                  {saving ? "保存中..." : mode === "create" ? "创建试卷" : "更新试卷"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
