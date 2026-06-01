import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "AI 面试助手",
  description: "模拟真实面试场景 · 刷题 · AI 面试官 · 语音对话",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <html lang="zh-CN">
      <body>
        <Navbar userName={session?.name ?? null} />
        <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
