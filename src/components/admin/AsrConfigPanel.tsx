"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorBanner,
  HintBanner,
  Icon,
  Input,
  Spinner,
} from "@/components/ui";

interface EnvFallback {
  configured: boolean;
  baseUrl?: string;
  model?: string;
}

interface FormState {
  id?: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: string;
}

const emptyForm = (): FormState => ({
  name: "",
  baseUrl: "",
  model: "",
  apiKey: "",
  enabled: true,
  isDefault: false,
  sortOrder: "0",
});

interface ConfigItem {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
  apiKeyConfigured: boolean;
  lastErrorAt: string | null;
  lastError: string | null;
}

export function AsrConfigPanel() {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [envFallback, setEnvFallback] = useState<EnvFallback>({ configured: false });
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
      const asrItems = (data.items as ConfigItem[]).filter(
        (item: any) => item.role === "asr"
      );
      setItems(asrItems);
      setEnvFallback(data.envFallbacks?.asr || { configured: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(item: ConfigItem) {
    setForm({
      id: item.id,
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
        role: "asr",
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, data: Record<string, unknown>, okMsg: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/ai-models/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      setError(result.error || "操作失败");
      return;
    }
    setMessage(okMsg);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("确定删除这个配置？")) return;
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
  }

  async function test(id: string) {
    setError("");
    setMessage("测试中...");
    const res = await fetch(`/api/admin/ai-models/${id}/test-asr`, { method: "POST" });
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
          <h3 className="text-base font-semibold text-ink">语音识别配置</h3>
          <p className="mt-1 text-sm text-muted">
            配置语音转文字服务（如智谱 glm-4-voice），所有页面的语音输入都会优先使用此服务，
            配置失败时自动回退浏览器原生识别。
          </p>
        </div>
        <Button onClick={() => setForm(emptyForm())} size="sm" leftIcon={<Icon name="plus" size={14} />}>
          新增配置
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
          <CardHeader title={form.id ? "编辑配置" : "新增配置"} icon={<Icon name="settings" size={16} />} />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="text-sm font-medium mb-1">名称</div>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如「智谱语音识别」"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm font-medium mb-1">Base URL</div>
                <Input
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder="https://open.bigmodel.cn/api/paas/v4"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">模型名</div>
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="glm-4-voice"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">排序</div>
                <Input
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  type="number"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm font-medium mb-1">API Key</div>
                <Input
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={form.id ? "留空表示不修改现有 API Key" : "新增时必填"}
                  type="password"
                />
              </div>
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
        <div>
          <Card padded>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-ink">语音识别配置列表</h4>
                <p className="mt-0.5 text-xs text-muted">多配置按排序自动故障转移</p>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line bg-canvas/50 p-4 text-center text-sm text-muted">
                还没有数据库配置，将使用环境变量兜底（如果配置了 ASR_BASE_URL/ASR_API_KEY/ASR_MODEL）。
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
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
                        className={`${linkBtn} text-red-600 hover:bg-red-50`}
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
              <span className={envFallback?.configured ? "text-emerald-600" : "text-amber-600"}>
                {envFallback?.configured ? "已配置" : "未配置"}
              </span>
              {envFallback?.configured && (
                <span className="break-all">
                  · {envFallback.baseUrl} · {envFallback.model}
                </span>
              )}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
