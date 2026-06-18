"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ModelRole } from "@/lib/deepseek";
import type { SafeAiModelConfig } from "@/lib/ai-model-config";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorBanner,
  Field,
  HintBanner,
  Icon,
  Input,
  Select,
  Spinner,
} from "@/components/ui";

const roleLabels: Record<ModelRole, { title: string; desc: string }> = {
  primary: { title: "主模型", desc: "用于模拟面试、AI 点评、文本导入和自动分类。" },
  answer: { title: "答案模型", desc: "用于导入题目时给没有答案的题自动补参考答案。" },
  vision: { title: "视觉模型", desc: "用于图片导入识别题目，必须选择支持 image_url 的模型。" },
  asr: { title: "语音识别", desc: "用于录音转文字，OpenAI Whisper 兼容协议。" },
};

const roles: ModelRole[] = ["primary", "answer", "vision"];

interface EnvFallback {
  configured: boolean;
  baseUrl?: string;
  model?: string;
}

interface FormState {
  id?: string;
  role: ModelRole;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: string;
}

const emptyForm = (role: ModelRole): FormState => ({
  role,
  name: "",
  baseUrl: "",
  model: "",
  apiKey: "",
  enabled: true,
  isDefault: false,
  sortOrder: "0",
});

export function AiModelConfigPanel() {
  const router = useRouter();
  const [items, setItems] = useState<SafeAiModelConfig[]>([]);
  const [envFallbacks, setEnvFallbacks] = useState<Record<ModelRole, EnvFallback>>({
    primary: { configured: false },
    answer: { configured: false },
    vision: { configured: false },
    asr: { configured: false },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai-models");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setItems(data.items);
      setEnvFallbacks(data.envFallbacks);
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
    return roles.reduce<Record<ModelRole, SafeAiModelConfig[]>>((acc, role) => {
      acc[role] = items.filter((item) => item.role === role);
      return acc;
    }, { primary: [], answer: [], vision: [], asr: [] });
  }, [items]);

  function edit(item: SafeAiModelConfig) {
    setForm({
      id: item.id,
      role: item.role,
      name: item.name,
      baseUrl: item.baseUrl,
      model: item.model,
      apiKey: "",
      enabled: item.enabled,
      isDefault: item.isDefault,
      sortOrder: String(item.sortOrder),
    });
    setMessage("");
    setError("");
  }

  async function submit() {
    if (!form) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        role: form.role,
        name: form.name,
        baseUrl: form.baseUrl,
        model: form.model,
        enabled: form.enabled,
        isDefault: form.isDefault,
        sortOrder: form.sortOrder,
      };
      if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();
      const res = await fetch(
        form.id ? `/api/admin/ai-models/${form.id}` : "/api/admin/ai-models",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setForm(null);
      setMessage("已保存");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, okMsg: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/ai-models/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "操作失败");
      return;
    }
    setMessage(okMsg);
    await load();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("确定删除这个模型配置？")) return;
    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/ai-models/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "删除失败");
      return;
    }
    setMessage("已删除");
    await load();
    router.refresh();
  }

  async function test(id: string) {
    setError("");
    setMessage("测试中...");
    const res = await fetch(`/api/admin/ai-models/${id}/test`, { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setMessage("");
      setError(data.error || "测试失败");
      await load();
      return;
    }
    setMessage(`测试成功：${data.replyPreview || data.message}`);
    await load();
  }

  const linkBtn =
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors";

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ink">AI 模型配置</h3>
          <p className="mt-1 text-sm text-muted">
            管理三组模型。每组默认模型失败时会自动切换备用模型，最后使用环境变量兜底。
          </p>
        </div>
        <Button onClick={() => setForm(emptyForm("primary"))} size="sm" leftIcon={<Icon name="plus" size={14} />}>
          新增模型
        </Button>
      </div>

      {error && <div className="mb-3"><ErrorBanner>{error}</ErrorBanner></div>}
      {message && (
        <div className="mb-3">
          <HintBanner variant="success">{message}</HintBanner>
        </div>
      )}

      {form && (
        <Card className="mb-4 border-brand-200 bg-brand-25/40" padded>
          <CardHeader title={form.id ? "编辑模型" : "新增模型"} icon={<Icon name="settings" size={16} />} />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="分组">
                <Select
                  value={form.role}
                  disabled={Boolean(form.id)}
                  onChange={(e) => setForm({ ...form, role: e.target.value as ModelRole })}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>{roleLabels[role].title}</option>
                  ))}
                </Select>
              </Field>
              <Field label="名称">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如 智谱视觉备用"
                />
              </Field>
              <Field label="Base URL" className="sm:col-span-2">
                <Input
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder="https://open.bigmodel.cn/api/paas/v4"
                />
              </Field>
              <Field label="模型名">
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="glm-4v-flash"
                />
              </Field>
              <Field label="排序">
                <Input
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  type="number"
                />
              </Field>
              <Field label="API Key" className="sm:col-span-2">
                <Input
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={form.id ? "留空表示不修改现有 API Key" : "新增时必填"}
                  type="password"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="size-4 rounded border-line text-brand-500 focus:ring-brand-500/20"
                />
                启用
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="size-4 rounded border-line text-brand-500 focus:ring-brand-500/20"
                />
                设为默认
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={submit} loading={saving}>
                {saving ? "保存中..." : "保存"}
              </Button>
              <Button variant="secondary" onClick={() => setForm(null)}>
                取消
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Spinner size="lg" />
          <p className="mt-3 text-sm">加载中...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <Card key={role} padded>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-ink">{roleLabels[role].title}</h4>
                  <p className="mt-0.5 text-xs text-muted">{roleLabels[role].desc}</p>
                </div>
                <Button
                  onClick={() => setForm(emptyForm(role))}
                  variant="secondary"
                  size="sm"
                  leftIcon={<Icon name="plus" size={12} />}
                >
                  添加到本组
                </Button>
              </div>

              {grouped[role].length === 0 ? (
                <div className="rounded-lg border border-dashed border-line bg-canvas/50 p-4 text-center text-sm text-muted">
                  还没有数据库配置，将使用环境变量兜底。
                </div>
              ) : (
                <div className="space-y-2">
                  {grouped[role].map((item) => (
                    <div key={item.id} className="rounded-lg border border-line bg-surface p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-ink">{item.name}</span>
                        {item.isDefault && <Badge variant="brand">默认</Badge>}
                        {!item.enabled && <Badge variant="gray">已禁用</Badge>}
                        <Badge variant={item.apiKeyConfigured ? "success" : "warn"}>
                          Key {item.apiKeyConfigured ? "已配置" : "未配置"}
                        </Badge>
                      </div>
                      <div className="mt-1 break-all text-xs text-muted">
                        {item.baseUrl} · {item.model} · sort {item.sortOrder}
                      </div>
                      {item.lastError && (
                        <div className="mt-2">
                          <HintBanner variant="warn">
                            最近错误：{item.lastError}
                          </HintBanner>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1">
                        <button
                          onClick={() => edit(item)}
                          className={`${linkBtn} text-brand-600 hover:bg-brand-50`}
                        >
                          <Icon name="edit" size={12} />
                          编辑
                        </button>
                        {!item.isDefault && (
                          <button
                            onClick={() => patch(item.id, { isDefault: true }, "已设为默认")}
                            className={`${linkBtn} text-muted hover:bg-canvas hover:text-ink`}
                          >
                            设默认
                          </button>
                        )}
                        <button
                          onClick={() => patch(item.id, { enabled: !item.enabled }, item.enabled ? "已禁用" : "已启用")}
                          className={`${linkBtn} text-muted hover:bg-canvas hover:text-ink`}
                        >
                          {item.enabled ? "禁用" : "启用"}
                        </button>
                        <button
                          onClick={() => test(item.id)}
                          className={`${linkBtn} text-muted hover:bg-canvas hover:text-ink`}
                        >
                          <Icon name="sparkles" size={12} />
                          测试
                        </button>
                        <button
                          onClick={() => remove(item.id)}
                          className={`${linkBtn} text-brand-500 hover:bg-brand-25`}
                        >
                          <Icon name="trash" size={12} />
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-xs text-muted">
                <Icon name="info" size={12} />
                环境变量兜底：
                <span className={envFallbacks[role]?.configured ? "text-green" : "text-amber-600"}>
                  {envFallbacks[role]?.configured ? "已配置" : "未配置"}
                </span>
                {envFallbacks[role]?.configured && (
                  <span className="break-all">
                    · {envFallbacks[role].baseUrl} · {envFallbacks[role].model}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
