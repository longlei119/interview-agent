"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, ErrorBanner, Field, Icon, Input } from "@/components/ui";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
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
    setInfo("");
    if (!email) {
      setError("请先填写邮箱");
      return;
    }
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "reset" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "发送失败");
        return;
      }
      setInfo("若该邮箱已注册，验证码已发送，请查收（可能在垃圾邮件箱）");
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
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "重置失败");
        return;
      }
      router.push("/login?reset=1");
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
        <h1 className="mt-4 text-2xl font-bold text-ink">找回密码</h1>
        <p className="mt-1 text-sm text-muted">输入注册邮箱，通过验证码重置密码</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <Field label="验证码">
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
              {countdown > 0 ? `${countdown}s` : "发送验证码"}
            </Button>
          </div>
        </Field>

        <Field label="新密码">
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="至少 6 位"
          />
        </Field>

        {info && (
          <div className="rounded-lg border border-brand-200 bg-brand-25 px-3 py-2 text-sm text-brand-700">
            {info}
          </div>
        )}
        {error && <ErrorBanner>{error}</ErrorBanner>}

        <Button type="submit" loading={loading} fullWidth size="lg">
          重置密码
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        想起来了？
        <Link href="/login" className="ml-1 font-medium text-brand-600 hover:underline">
          返回登录
        </Link>
      </p>
    </div>
  );
}
