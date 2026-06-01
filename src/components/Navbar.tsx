"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/practice", label: "刷题" },
  { href: "/interview", label: "模拟面试" },
  { href: "/history", label: "我的记录" },
];

export function Navbar({ userName }: { userName: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname.startsWith(href)
        ? "bg-brand-500 text-white"
        : "text-gray-600 hover:bg-brand-50 hover:text-brand-600"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-600">
          <span className="text-xl">🎯</span>
          <span className="hidden sm:inline">AI 面试助手</span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {userName ? (
            <>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                  {item.label}
                </Link>
              ))}
              <span className="ml-2 text-sm text-gray-500">你好，{userName}</span>
              <button
                onClick={handleLogout}
                className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass("/login")}>
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                注册
              </Link>
            </>
          )}
        </nav>

        {/* 移动端汉堡按钮 */}
        <button
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="菜单"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* 移动端展开菜单 */}
      {open && (
        <nav className="border-t border-gray-100 bg-white px-4 py-2 md:hidden">
          {userName ? (
            <div className="flex flex-col gap-1">
              <span className="px-3 py-2 text-sm text-gray-500">你好，{userName}</span>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass(item.href)}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                退出
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Link href="/login" className={linkClass("/login")} onClick={() => setOpen(false)}>
                登录
              </Link>
              <Link href="/register" className={linkClass("/register")} onClick={() => setOpen(false)}>
                注册
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
