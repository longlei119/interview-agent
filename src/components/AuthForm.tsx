"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, ErrorBanner, Field, Icon, Input } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mailReady, setMailReady] = useState(true);

  // 发送验证码相关
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRegister = mode === "register";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/mail")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMailReady(Boolean(d.configured));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (countdown <= 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [countdown]);

  async function handleSendCode() {
    setError("");
    if (!email) {
      setError("请先填写邮箱");
      return;
    }
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "register" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "发送失败");
        return;
      }
      setCodeSent(true);
      setCountdown(60);
      timerRef.current = setInterval(() => setCountdown((n) => (n > 0 ? n - 1 : 0)), 1000);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { email, password, name, code } : { email, password }
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
            onChange={(e) => {
              setEmail(e.target.value);
              if (codeSent) {
                setCodeSent(false);
                setCode("");
              }
            }}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>

        {isRegister && mailReady && (
          <Field label="邮箱验证码">
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="6 位验证码"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSendCode}
                loading={sendingCode}
                disabled={countdown > 0 || !email}
                className="shrink-0"
              >
                {countdown > 0 ? `${countdown}s` : codeSent ? "重新发送" : "发送验证码"}
              </Button>
            </div>
          </Field>
        )}

        {isRegister && !mailReady && (
          <ErrorBanner>邮件服务未配置，暂无法注册，请联系管理员</ErrorBanner>
        )}

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

        <Button type="submit" loading={loading} fullWidth size="lg" disabled={isRegister && !mailReady}>
          {isRegister ? "注册" : "登录"}
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm text-muted">
        {!isRegister ? (
          <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">
            忘记密码？
          </Link>
        ) : (
          <span />
        )}
        <p>
          {isRegister ? "已有账号？" : "还没有账号？"}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="ml-1 font-medium text-brand-600 hover:underline"
          >
            {isRegister ? "去登录" : "去注册"}
          </Link>
        </p>
      </div>
    </div>
  );
}
