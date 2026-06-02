"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

interface Props {
  questionId: string;
  isOwner: boolean;
  // owner 用
  visibility?: string;
  // 非 owner 用
  initialLiked?: boolean;
  initialLikeCount?: number;
}

export function QuestionActions({
  questionId,
  isOwner,
  visibility = "private",
  initialLiked = false,
  initialLikeCount = 0,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // owner: 公开状态
  const [isPublic, setIsPublic] = useState(visibility === "public");
  // 非 owner: 点赞状态
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  async function toggleVisibility() {
    setBusy(true);
    setError("");
    try {
      const next = isPublic ? "private" : "public";
      const res = await fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "操作失败");
        return;
      }
      setIsPublic(!isPublic);
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("确定删除这道题吗？删除后将从你的题库移除。")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "删除失败");
        return;
      }
      router.push("/practice");
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/questions/${questionId}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "操作失败");
        return;
      }
      setLiked(data.liked);
      setLikeCount(data.likeCount);
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setBusy(false);
    }
  }

  async function handleClone() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/questions/${questionId}/clone`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "拉取失败");
        return;
      }
      router.push(`/practice/${data.id}`);
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isOwner ? (
        <>
          <Link
            href={`/practice/${questionId}/edit`}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            编辑
          </Link>
          <button
            onClick={toggleVisibility}
            disabled={busy}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
              isPublic
                ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {isPublic ? "已公开 · 点击转私有" : "设为公开"}
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            删除
          </button>
        </>
      ) : (
        <>
          <button
            onClick={toggleLike}
            disabled={busy}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
              liked
                ? "border border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100"
                : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {liked ? "❤️ 已赞" : "🤍 点赞"} {likeCount}
          </button>
          <button
            onClick={handleClone}
            disabled={busy}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            拉到我的题库
          </button>
        </>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
