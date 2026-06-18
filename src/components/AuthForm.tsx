"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button, ErrorBanner, Field, Icon, Input } from "@/components/ui";

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
    <div className="mx-auto mt-6 w-full max-w-sm animate-fade-in rounded-2xl border border-line bg-surface p-6 shadow-card sm:mt-12 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-soft">
          <Icon name="target" size={22} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink">
          {isRegister ? "创建账号" : "欢迎回来"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isRegister ? "注册后即可开始刷题和模拟面试" : "登录继续你的面试准备"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <Field label="昵称">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="怎么称呼你"
            />
          </Field>
        )}
        <Field label="邮箱">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>
        <Field label="密码">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="至少 6 位"
          />
        </Field>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <Button type="submit" loading={loading} fullWidth size="lg">
          {isRegister ? "注册" : "登录"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
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
