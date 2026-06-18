"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, IconName } from "@/components/ui";
import { SyncModal } from "@/components/SyncModal";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const mainNav: NavItem[] = [
  { href: "/practice", label: "题库", icon: "book" },
  { href: "/paper", label: "试卷", icon: "file" },
  { href: "/explore", label: "广场", icon: "compass" },
  { href: "/interview", label: "面试", icon: "mic" },
  { href: "/history", label: "记录", icon: "history" },
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
  const [syncOpen, setSyncOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // 取最长匹配的项作为高亮项
  const candidateHrefs = [
    ...mainNav.map((i) => i.href),
    "/practice/import",
    "/admin",
    "/settings",
    "/login",
    "/register",
  ];
  const activeHref = candidateHrefs
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const linkClass = (href: string) =>
    `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 ease-out-soft ${
      href === activeHref
        ? "bg-accent-100 text-accent-700 font-semibold"
        : "text-muted hover:bg-canvas hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas-deep/86 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        {/* 左：品牌 */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-serif font-bold text-ink transition-colors hover:text-brand-500"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent-500 text-white shadow-soft">
            <Icon name="target" size={18} />
          </span>
          <span className="hidden text-base tracking-tight sm:inline">AI 面试助手</span>
        </Link>

        {/* 中：主导航（桌面端） */}
        {userName && (
          <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
            {mainNav.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                <Icon name={item.icon} size={15} />
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* 右：工具区 + 用户区（桌面端） */}
        {userName ? (
          <div className="hidden items-center gap-1 md:flex">
            {canCreate && (
              <Link href="/practice/import" className={linkClass("/practice/import")}>
                <Icon name="download" size={15} />
                导入
              </Link>
            )}
            {role === "admin" && (
              <Link href="/admin" className={linkClass("/admin")}>
                <Icon name="settings" size={15} />
                后台
              </Link>
            )}
            <button
              onClick={() => setSyncOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-25"
              title="输入分享码同步他人题库"
            >
              <Icon name="share" size={15} />
              同步
            </button>
            <div className="mx-1 h-5 w-px bg-line" />
            <Link href="/settings" className={linkClass("/settings")}>
              <Icon name="settings" size={15} />
              设置
            </Link>
            <span className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted">
              <Icon name="user" size={14} />
              {userName}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:bg-brand-25 hover:text-brand-500"
              title="退出登录"
              aria-label="退出登录"
            >
              <Icon name="logout" size={15} />
            </button>
          </div>
        ) : (
          <div className="hidden items-center gap-1 md:flex">
            <Link href="/login" className={linkClass("/login")}>
              登录
            </Link>
            <Link
              href="/register"
              className="ml-1 inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-surface shadow-soft transition-all hover:bg-ink-soft hover:shadow-hover active:scale-[0.98]"
            >
              注册
            </Link>
          </div>
        )}

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
              {/* 用户区 */}
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
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-500 hover:bg-brand-25"
                >
                  <Icon name="logout" size={14} />
                  退出
                </button>
              </div>
              <div className="my-1 h-px bg-line" />
              {/* 主导航 */}
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass(item.href)}
                  onClick={() => setOpen(false)}
                >
                  <Icon name={item.icon} size={16} />
                  {item.label === "题库" ? "我的题库" : item.label === "试卷" ? "我的试卷" : item.label === "广场" ? "题库广场" : item.label === "面试" ? "模拟面试" : "我的记录"}
                </Link>
              ))}
              <div className="my-1 h-px bg-line" />
              {/* 工具区 */}
              {canCreate && (
                <Link
                  href="/practice/import"
                  className={linkClass("/practice/import")}
                  onClick={() => setOpen(false)}
                >
                  <Icon name="download" size={16} />
                  导入题目
                </Link>
              )}
              {role === "admin" && (
                <Link
                  href="/admin"
                  className={linkClass("/admin")}
                  onClick={() => setOpen(false)}
                >
                  <Icon name="settings" size={16} />
                  管理后台
                </Link>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  setSyncOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-25"
              >
                <Icon name="share" size={16} />
                同步他人题库
              </button>
              <div className="my-1 h-px bg-line" />
              {/* 设置 */}
              <Link
                href="/settings"
                className={linkClass("/settings")}
                onClick={() => setOpen(false)}
              >
                <Icon name="settings" size={16} />
                设置
              </Link>
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

      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
    </header>
  );
}
