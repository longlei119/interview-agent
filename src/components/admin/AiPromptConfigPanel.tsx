"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SafeAiPromptConfig } from "@/lib/ai-prompts";
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  HintBanner,
  Icon,
  Spinner,
  Textarea,
} from "@/components/ui";

type Category = SafeAiPromptConfig["category"];

const categoryLabels: Record<Category, { title: string; desc: string }> = {
  interview: { title: "模拟面试", desc: "开场、追问和结束总评。" },
  practice: { title: "刷题点评", desc: "练习答案评分与改进建议。" },
  import: { title: "题目导入", desc: "文本/图片提取、分类和补答案。" },
  admin: { title: "后台测试", desc: "管理后台内部测试用提示词。" },
};

const categories: Category[] = ["interview", "practice", "import", "admin"];

const variableSamples: Record<string, string> = {
  role: "前端工程师",
  level: "高级",
  questionTitle: "什么是闭包？",
  questionBody: "请解释 JavaScript 闭包的概念、使用场景和常见风险。",
  referenceAnswer: "闭包是函数和其词法环境的组合，可用于封装状态、函数工厂等。",
  userAnswer: "闭包就是函数里面返回另一个函数，可以访问外层变量。",
  topicTree: "- id: topic_js | 路径: 前端 / JavaScript\n- id: topic_react | 路径: 前端 / React",
};

function buildVariables(item: SafeAiPromptConfig) {
  return Object.fromEntries(item.variables.map((key) => [key, variableSamples[key] ?? `示例${key}`]));
}

function needsReminder(key: string) {
  return key.includes("extract") || key.includes("classify") || key.includes("evaluate") || key.includes("summary");
}

export function AiPromptConfigPanel() {
  const router = useRouter();
  const [items, setItems] = useState<SafeAiPromptConfig[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("interview");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [editingKey, setEditingKey] = useState("");
  const [draft, setDraft] = useState("");
  const [previewKey, setPreviewKey] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai-prompts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    return categories.reduce<Record<Category, SafeAiPromptConfig[]>>((acc, category) => {
      acc[category] = items.filter((item) => item.category === category);
      return acc;
    }, { interview: [], practice: [], import: [], admin: [] });
  }, [items]);

  const activeItems = grouped[activeCategory];
  const activeLabel = categoryLabels[activeCategory];

  function switchCategory(category: Category) {
    setActiveCategory(category);
    setEditingKey("");
    setDraft("");
    setPreviewKey("");
    setPreview("");
    setError("");
    setMessage("");
  }

  function startEdit(item: SafeAiPromptConfig) {
    setEditingKey(item.key);
    setDraft(item.content);
    setPreviewKey("");
    setPreview("");
    setError("");
    setMessage("");
  }

  async function save(item: SafeAiPromptConfig) {
    setSavingKey(item.key);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/ai-prompts/${encodeURIComponent(item.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft, enabled: item.enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setEditingKey("");
      setDraft("");
      setPreviewKey("");
      setPreview("");
      setMessage("已保存提示词");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingKey("");
    }
  }

  async function patch(item: SafeAiPromptConfig, body: Record<string, unknown>, okMsg: string) {
    setSavingKey(item.key);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/ai-prompts/${encodeURIComponent(item.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      setMessage(okMsg);
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setSavingKey("");
    }
  }

  async function reset(item: SafeAiPromptConfig) {
    if (!confirm("确定恢复为系统默认提示词？当前自定义内容会被覆盖。")) return;
    setSavingKey(item.key);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/ai-prompts/${encodeURIComponent(item.key)}/reset`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "恢复失败");
      setEditingKey("");
      setDraft("");
      setPreviewKey("");
      setPreview("");
      setMessage("已恢复默认提示词");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "恢复失败");
    } finally {
      setSavingKey("");
    }
  }

  async function makePreview(item: SafeAiPromptConfig) {
    setSavingKey(item.key);
    setError("");
    setPreviewKey("");
    setPreview("");
    try {
      const res = await fetch(`/api/admin/ai-prompts/${encodeURIComponent(item.key)}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingKey === item.key ? draft : item.content, variables: buildVariables(item) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "预览失败");
      setPreviewKey(item.key);
      setPreview(data.rendered || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "预览失败");
    } finally {
      setSavingKey("");
    }
  }

  const linkBtn =
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors";

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-ink">AI 提示词配置</h3>
        <p className="mt-1 text-sm text-muted">
          左侧选择功能分组，右侧编辑对应提示词；禁用单条配置会回退到代码内置默认提示词。
        </p>
      </div>

      {error && <div className="mb-3"><ErrorBanner>{error}</ErrorBanner></div>}
      {message && (
        <div className="mb-3">
          <HintBanner variant="success">{message}</HintBanner>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Spinner size="lg" />
          <p className="mt-3 text-sm">加载中...</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Card padded={false} className="p-2 lg:sticky lg:top-4 lg:self-start">
            <div className="mb-2 px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted">
              提示词分组
            </div>
            <div className="space-y-1">
              {categories.map((category) => {
                const label = categoryLabels[category];
                const count = grouped[category].length;
                const customized = grouped[category].filter((item) => item.isCustomized).length;
                const active = activeCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => switchCategory(category)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                      active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{label.title}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          active ? "bg-surface text-brand-600" : "bg-canvas text-muted"
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                    <div className={`mt-0.5 text-xs ${active ? "text-brand-500" : "text-muted"}`}>
                      {label.desc}
                    </div>
                    {customized > 0 && (
                      <div className="mt-1 text-xs font-medium text-brand-600">
                        {customized} 个已自定义
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card padded className="min-w-0">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
              <div>
                <h4 className="font-semibold text-ink">{activeLabel.title}</h4>
                <p className="mt-0.5 text-xs text-muted">{activeLabel.desc}</p>
              </div>
              <Badge variant="gray">{activeItems.length} 个提示词</Badge>
            </div>

            <div className="space-y-3">
              {activeItems.map((item) => {
                const editing = editingKey === item.key;
                return (
                  <div key={item.key} className="rounded-lg border border-line bg-surface p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-ink">{item.title}</span>
                          <Badge variant="gray">{item.key}</Badge>
                          {!item.enabled && <Badge variant="gray">已禁用</Badge>}
                          {item.isCustomized && <Badge variant="brand">已自定义</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted">{item.description}</p>
                        {item.variables.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.variables.map((v) => (
                              <Badge key={v} variant="info">{`{{${v}}}`}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => startEdit(item)}
                          className={`${linkBtn} text-brand-600 hover:bg-brand-50`}
                        >
                          <Icon name="edit" size={12} />
                          编辑
                        </button>
                        <button
                          disabled={savingKey === item.key}
                          onClick={() => patch(item, { enabled: !item.enabled }, item.enabled ? "已禁用，将回退默认提示词" : "已启用")}
                          className={`${linkBtn} text-muted hover:bg-canvas hover:text-ink disabled:opacity-50`}
                        >
                          {item.enabled ? "禁用" : "启用"}
                        </button>
                        <button
                          onClick={() => makePreview(item)}
                          className={`${linkBtn} text-muted hover:bg-canvas hover:text-ink`}
                        >
                          <Icon name="eye" size={12} />
                          预览
                        </button>
                        <button
                          onClick={() => reset(item)}
                          className={`${linkBtn} text-brand-500 hover:bg-brand-25`}
                        >
                          <Icon name="history" size={12} />
                          恢复默认
                        </button>
                      </div>
                    </div>

                    {needsReminder(item.key) && (
                      <div className="mt-3">
                        <HintBanner variant="warn">
                          请保留当前输出格式约束，否则 JSON 解析或分数提取可能失败。
                        </HintBanner>
                      </div>
                    )}

                    {editing && (
                      <div className="mt-3 space-y-3">
                        <Textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="min-h-72 font-mono leading-6"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={savingKey === item.key}
                            loading={savingKey === item.key}
                            onClick={() => save(item)}
                            size="sm"
                          >
                            保存
                          </Button>
                          <Button
                            onClick={() => makePreview(item)}
                            variant="secondary"
                            size="sm"
                            leftIcon={<Icon name="eye" size={14} />}
                          >
                            变量预览
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingKey("");
                              setDraft("");
                              setPreviewKey("");
                              setPreview("");
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    )}

                    {previewKey === item.key && preview && (
                      <div className="mt-3 animate-fade-in rounded-lg border border-line bg-canvas p-3">
                        <div className="mb-2 text-xs font-medium text-muted">预览结果</div>
                        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-ink">
                          {preview}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
