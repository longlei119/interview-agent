"use client";

import { useState } from "react";
import Link from "next/link";

const MAX_IMAGES = 6;
const MAX_SIZE = 5 * 1024 * 1024; // 单张 5MB

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
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-brand-500 text-brand-600"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div>
      {/* tab 切换 */}
      <div className="mb-4 flex gap-2 border-b border-gray-200">
        <button className={tabClass(tab === "text")} onClick={() => setTab("text")}>
          粘贴文本
        </button>
        <button className={tabClass(tab === "image")} onClick={() => setTab("image")}>
          上传图片
        </button>
      </div>

      {tab === "text" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          placeholder={"把面试题粘进来，一道或多道都行。\n有答案的会保留，没答案的 AI 会自动补。"}
        />
      ) : (
        <div>
          {!visionConfigured && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              视觉识别模型尚未配置，图片导入暂不可用。可以先用「粘贴文本」导入。
            </div>
          )}
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 transition-colors hover:border-brand-300 ${
              !visionConfigured ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <span className="text-2xl">🖼️</span>
            <span className="mt-2">点击选择图片（最多 {MAX_IMAGES} 张，单张 ≤5MB）</span>
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
                    className="h-20 w-full rounded-lg border border-gray-200 object-cover"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    title="移除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={loading || (tab === "image" && !visionConfigured)}
        className="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? "识别中…（AI 处理需要一点时间）" : "开始导入"}
      </button>

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: ImportResult }) {
  if (result.created === 0 && result.failed === 0) {
    return (
      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-500">
        {result.message || "未识别到任何面试题，换段更清晰的文本试试。"}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold text-gray-900">
          成功导入 {result.created} 道
        </span>
        {result.answersGenerated > 0 && (
          <span className="text-violet-600">🤖 自动补答案 {result.answersGenerated} 道</span>
        )}
        {result.newTopics.length > 0 && (
          <span className="text-gray-500">
            新建分类：{result.newTopics.map((t) => t.name).join("、")}
          </span>
        )}
        {result.failed > 0 && (
          <span className="text-red-500">失败 {result.failed} 道</span>
        )}
      </div>

      <ul className="space-y-1 text-sm text-gray-600">
        {result.items.map((it) => (
          <li key={it.id} className="flex items-center gap-2">
            <span className="truncate">{it.title.slice(0, 40)}</span>
            <span className="shrink-0 text-xs text-gray-400">→ {it.topicLabel}</span>
            {it.answerGeneratedByAi && (
              <span className="shrink-0 rounded bg-violet-100 px-1.5 text-xs text-violet-700">
                🤖 AI 答案
              </span>
            )}
          </li>
        ))}
      </ul>

      {result.errors.length > 0 && (
        <ul className="space-y-1 border-t border-gray-100 pt-2 text-xs text-red-500">
          {result.errors.map((e, i) => (
            <li key={i}>
              {e.title}：{e.message}
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/practice"
        className="inline-block text-sm font-medium text-brand-600 hover:underline"
      >
        去我的题库查看 →
      </Link>
    </div>
  );
}
