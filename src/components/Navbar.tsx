"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, IconName } from "@/components/ui";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const navItems: NavItem[] = [
  { href: "/practice", label: "我的题库", icon: "book" },
  { href: "/paper", label: "我的试卷", icon: "file" },
  { href: "/explore", label: "题库广场", icon: "compass" },
  { href: "/interview", label: "模拟面试", icon: "mic" },
  { href: "/history", label: "我的记录", icon: "history" },
];

export function Navbar({
  userName,
  role,
  canCreate,
}: {
  userName: string | null;
  role: string | null;
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const items: (NavItem & { admin?: boolean })[] = [
    ...navItems,
    ...(canCreate
      ? [{ href: "/practice/import", label: "导入题目", icon: "download" as IconName }]
      : []),
    ...(role === "admin"
      ? [{ href: "/admin", label: "管理后台", icon: "settings" as IconName, admin: true }]
      : []),
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // 取最长匹配的项作为高亮项，避免 /practice/import 同时点亮「我的题库」和「导入题目」
  const activeHref = [...items.map((i) => i.href), "/login", "/register"]
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const linkClass = (href: string) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-out-soft ${
      href === activeHref
        ? "bg-brand-50 text-brand-700"
        : "text-muted hover:bg-canvas hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-ink transition-colors hover:text-brand-600"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-500 text-white shadow-soft">
            <Icon name="target" size={18} />
          </span>
          <span className="hidden text-base sm:inline">AI 面试助手</span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {userName ? (
            <>
              {items.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </Link>
              ))}
              <div className="ml-2 flex items-center gap-1 border-l border-line pl-2">
                <span className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted">
                  <Icon name="user" size={14} />
                  {userName}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                  title="退出登录"
                >
                  <Icon name="logout" size={14} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass("/login")}>
                登录
              </Link>
              <Link
                href="/register"
                className="ml-1 inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-soft transition-all hover:bg-brand-600 hover:shadow-hover active:scale-[0.98]"
              >
                注册
              </Link>
            </>
          )}
        </nav>

        {/* 移动端汉堡按钮 */}
        <button
          className="rounded-lg p-2 text-muted transition-colors hover:bg-canvas md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="菜单"
        >
          <Icon name={open ? "x" : "menu"} size={22} />
        </button>
      </div>

      {/* 移动端展开菜单 */}
      {open && (
        <nav className="border-t border-line bg-surface px-4 py-2 md:hidden">
          {userName ? (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Icon name="user" size={14} />
                  {userName}
                </span>
                <button
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Icon name="logout" size={14} />
                  退出
                </button>
              </div>
              <div className="my-1 h-px bg-line" />
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass(item.href)}
                  onClick={() => setOpen(false)}
                >
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
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
