"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLES = [
  "前端工程师",
  "后端工程师",
  "全栈工程师",
  "算法工程师",
  "测试工程师",
  "产品经理",
];
const LEVELS = ["初级", "中级", "高级"];

export function StartInterview() {
  const router = useRouter();
  const [role, setRole] = useState(ROLES[0]);
  const [level, setLevel] = useState(LEVELS[1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, level }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.code === "NO_API_KEY"
            ? "尚未配置 DeepSeek API key，无法开始模拟面试。请在 .env.local 中填入 DEEPSEEK_API_KEY 后重启服务。"
            : data.error || "创建面试失败"
        );
        return;
      }
      router.push(`/interview/${data.sessionId}`);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">开始模拟面试</h1>
        <p className="mt-1 text-sm text-gray-500">
          选择目标岗位和级别，AI 面试官会据此调整问题难度，并支持语音对话。
        </p>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            目标岗位
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  role === r
                    ? "border-brand-500 bg-brand-50 text-brand-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-brand-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            目标级别
          </label>
          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  level === l
                    ? "border-brand-500 bg-brand-50 text-brand-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-brand-300"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "面试官准备中..." : "开始面试"}
        </button>
      </div>
    </div>
  );
}
