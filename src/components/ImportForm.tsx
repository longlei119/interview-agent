"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  ErrorBanner,
  HintBanner,
  Icon,
  Textarea,
} from "@/components/ui";

const MAX_IMAGES = 6;
const MAX_SIZE = 5 * 1024 * 1024;

interface ImportResult {
  ok: boolean;
  created: number;
  failed: number;
  answersGenerated: number;
  newTopics: { id: string; name: string }[];
  items: { id: string; title: string; topicLabel: string; answerGeneratedByAi: boolean }[];
  errors: { title: string; message: string }[];
  message?: string;
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

export function ImportForm({ visionConfigured }: { visionConfigured: boolean }) {
  const [tab, setTab] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    const picked = Array.from(files);
    const next: { name: string; url: string }[] = [];
    for (const f of picked) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > MAX_SIZE) {
        setError(`「${f.name}」超过 5MB，已跳过`);
        continue;
      }
      next.push({ name: f.name, url: await fileToDataUrl(f) });
    }
    setImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    setError("");
    setResult(null);
    if (tab === "text" && !text.trim()) {
      setError("请粘贴要导入的文本");
      return;
    }
    if (tab === "image" && images.length === 0) {
      setError("请上传至少一张图片");
      return;
    }
    setLoading(true);
    try {
      const body =
        tab === "text"
          ? { mode: "text", text }
          : { mode: "image", images: images.map((i) => i.url) };
      const res = await fetch("/api/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "导入失败");
        return;
      }
      setResult(data as ImportResult);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-brand-50 text-brand-700"
        : "text-muted hover:bg-canvas hover:text-ink"
    }`;

  return (
    <div>
      <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-line bg-canvas p-1">
        <button className={`rounded-md ${tabClass(tab === "text")}`} onClick={() => setTab("text")}>
          <Icon name="file" size={14} />
          粘贴文本
        </button>
        <button className={`rounded-md ${tabClass(tab === "image")}`} onClick={() => setTab("image")}>
          <Icon name="image" size={14} />
          上传图片
        </button>
      </div>

      {tab === "text" ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"把面试题粘进来，一道或多道都行。\n有答案的会保留，没答案的 AI 会自动补。"}
        />
      ) : (
        <div>
          {!visionConfigured && (
            <div className="mb-3">
              <HintBanner variant="warn">
                视觉识别模型尚未配置，图片导入暂不可用。可以先用「粘贴文本」导入。
              </HintBanner>
            </div>
          )}
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-canvas px-4 py-10 text-center text-sm text-muted transition-colors hover:border-brand-300 hover:bg-brand-25/40 ${
              !visionConfigured ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-surface text-brand-500 shadow-soft">
              <Icon name="image" size={20} />
            </div>
            <span className="mt-3 font-medium text-ink">点击选择图片</span>
            <span className="mt-1 text-xs">最多 {MAX_IMAGES} 张，单张 ≤5MB</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={!visionConfigured}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={i} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.name}
                    className="h-20 w-full rounded-lg border border-line object-cover"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
                    title="移除"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-3"><ErrorBanner>{error}</ErrorBanner></div>}

      <div className="mt-4">
        <Button
          onClick={submit}
          loading={loading}
          disabled={tab === "image" && !visionConfigured}
          leftIcon={!loading ? <Icon name="sparkles" size={16} /> : undefined}
          size="lg"
        >
          {loading ? "识别中…（AI 处理需要一点时间）" : "开始导入"}
        </Button>
      </div>

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: ImportResult }) {
  if (result.created === 0 && result.failed === 0) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-line bg-canvas p-6 text-center text-sm text-muted">
        {result.message || "未识别到任何面试题，换段更清晰的文本试试。"}
      </div>
    );
  }

  return (
    <div className="mt-5 animate-fade-in space-y-3 rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        <span className="inline-flex items-center gap-1 font-semibold text-ink">
          <Icon name="check" size={14} className="text-emerald-600" />
          成功导入 {result.created} 道
        </span>
        {result.answersGenerated > 0 && (
          <Badge variant="violet">
            <Icon name="bot" size={12} />
            自动补答案 {result.answersGenerated} 道
          </Badge>
        )}
        {result.newTopics.length > 0 && (
          <span className="text-muted">
            新建分类：{result.newTopics.map((t) => t.name).join("、")}
          </span>
        )}
        {result.failed > 0 && <span className="text-red-600">失败 {result.failed} 道</span>}
      </div>

      <ul className="space-y-1.5 text-sm text-ink">
        {result.items.map((it) => (
          <li key={it.id} className="flex items-center gap-2">
            <span className="truncate">{it.title.slice(0, 40)}</span>
            <span className="shrink-0 text-xs text-muted">→ {it.topicLabel}</span>
            {it.answerGeneratedByAi && (
              <Badge variant="violet" className="shrink-0">
                <Icon name="bot" size={10} />
                AI 答案
              </Badge>
            )}
          </li>
        ))}
      </ul>

      {result.errors.length > 0 && (
        <ul className="space-y-1 border-t border-line pt-2 text-xs text-red-600">
          {result.errors.map((e, i) => (
            <li key={i}>
              {e.title}：{e.message}
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/practice"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        去我的题库查看
        <Icon name="arrow-right" size={14} />
      </Link>
    </div>
  );
}
