"use client";

import { useState } from "react";

interface Props {
  questionId: string;
  referenceAnswer: string;
}

export function PracticePanel({ questionId, referenceAnswer }: Props) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!answer.trim()) {
      setError("请先写下你的答案");
      return;
    }
    setError("");
    setLoading(true);
    setFeedback("");
    setScore(null);
    try {
      const res = await fetch(`/api/practice/${questionId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAnswer: answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.code === "NO_API_KEY"
            ? "尚未配置 DeepSeek API key，无法使用 AI 点评。请在 .env.local 中填入 DEEPSEEK_API_KEY 后重启服务。"
            : data.error || "点评失败"
        );
        return;
      }
      setFeedback(data.feedback);
      setScore(data.score);
      setShowReference(true);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 答题区 */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          你的答案
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={8}
          placeholder="在这里写下你的回答，然后让 AI 帮你点评..."
          className="w-full resize-y rounded-xl border border-gray-300 p-3 text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "AI 点评中..." : "提交，让 AI 点评"}
          </button>
          <button
            onClick={() => setShowReference((v) => !v)}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {showReference ? "隐藏参考答案" : "查看参考答案"}
          </button>
        </div>
      </div>

      {/* AI 点评 */}
      {feedback && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-brand-700">AI 点评</h3>
            {score !== null && (
              <span className="rounded-full bg-brand-500 px-3 py-1 text-sm font-bold text-white">
                {score} 分
              </span>
            )}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {feedback}
          </div>
        </div>
      )}

      {/* 参考答案 */}
      {showReference && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-2 font-semibold text-gray-700">参考答案</h3>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {referenceAnswer}
          </div>
        </div>
      )}
    </div>
  );
}
