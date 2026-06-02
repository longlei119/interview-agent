"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIRECTIONS, DIFFICULTIES } from "@/lib/directions";

export interface QuestionFormValues {
  direction: string;
  difficulty: string;
  title: string;
  body: string;
  referenceAnswer: string;
  tags: string;
}

interface Props {
  // 编辑模式传 questionId 和初始值；新建模式不传
  questionId?: string;
  initial?: QuestionFormValues;
}

const empty: QuestionFormValues = {
  direction: DIRECTIONS[0],
  difficulty: DIFFICULTIES[1], // 默认「中等」
  title: "",
  body: "",
  referenceAnswer: "",
  tags: "",
};

export function QuestionForm({ questionId, initial }: Props) {
  const router = useRouter();
  const isEdit = Boolean(questionId);
  const [values, setValues] = useState<QuestionFormValues>(initial ?? empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set<K extends keyof QuestionFormValues>(key: K, v: QuestionFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!values.title.trim() || !values.body.trim()) {
      setError("请填写标题和题目内容");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/questions/${questionId}` : "/api/questions";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "保存失败");
        return;
      }
      const targetId = isEdit ? questionId : data.id;
      router.push(`/practice/${targetId}`);
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">方向</label>
          <select
            value={values.direction}
            onChange={(e) => set("direction", e.target.value)}
            className={inputClass}
          >
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">难度</label>
          <select
            value={values.difficulty}
            onChange={(e) => set("difficulty", e.target.value)}
            className={inputClass}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">标题</label>
        <input
          type="text"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
          className={inputClass}
          placeholder="一句话概括这道题问什么"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">题目内容</label>
        <textarea
          value={values.body}
          onChange={(e) => set("body", e.target.value)}
          rows={5}
          required
          className={`${inputClass} resize-y leading-relaxed`}
          placeholder="完整的题干描述"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          参考答案 <span className="font-normal text-gray-400">（选填，用于 AI 点评对照）</span>
        </label>
        <textarea
          value={values.referenceAnswer}
          onChange={(e) => set("referenceAnswer", e.target.value)}
          rows={6}
          className={`${inputClass} resize-y leading-relaxed`}
          placeholder="标准答案或答题要点，留空也可以"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          标签 <span className="font-normal text-gray-400">（用英文逗号分隔，如 React,Hooks）</span>
        </label>
        <input
          type="text"
          value={values.tags}
          onChange={(e) => set("tags", e.target.value)}
          className={inputClass}
          placeholder="React,Hooks,性能"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "保存中..." : isEdit ? "保存修改" : "创建题目"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </form>
  );
}
