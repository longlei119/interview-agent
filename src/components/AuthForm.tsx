"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { email, password, name } : { email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "操作失败");
        return;
      }
      router.push("/practice");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:mt-16 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        {isRegister ? "创建账号" : "欢迎回来"}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {isRegister ? "注册后即可开始刷题和模拟面试" : "登录继续你的面试准备"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">昵称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="怎么称呼你"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            placeholder="至少 6 位"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "处理中..." : isRegister ? "注册" : "登录"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        {isRegister ? "已有账号？" : "还没有账号？"}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="ml-1 font-medium text-brand-600 hover:underline"
        >
          {isRegister ? "去登录" : "去注册"}
        </Link>
      </p>
    </div>
  );
}
