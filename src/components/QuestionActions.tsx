"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button, ErrorBanner, Icon } from "@/components/ui";

interface Props {
  questionId: string;
  isOwner: boolean;
  visibility?: string;
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

  const [isPublic, setIsPublic] = useState(visibility === "public");
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {isOwner ? (
          <>
            <Link
              href={`/practice/${questionId}/edit`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-canvas"
            >
              <Icon name="edit" size={14} />
              编辑
            </Link>
            <Button
              onClick={toggleVisibility}
              variant={isPublic ? "secondary" : "secondary"}
              size="sm"
              disabled={busy}
              leftIcon={
                <Icon name={isPublic ? "eye" : "check"} size={14} className={isPublic ? "text-emerald-600" : ""} />
              }
              className={isPublic ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : ""}
            >
              {isPublic ? "已公开 · 转私有" : "设为公开"}
            </Button>
            <Button
              onClick={handleDelete}
              variant="danger"
              size="sm"
              disabled={busy}
              leftIcon={<Icon name="trash" size={14} />}
            >
              删除
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={toggleLike}
              variant="secondary"
              size="sm"
              disabled={busy}
              leftIcon={
                <Icon
                  name="heart"
                  size={14}
                  className={liked ? "text-rose-500" : ""}
                />
              }
              className={liked ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100" : ""}
            >
              {liked ? "已赞" : "点赞"} {likeCount}
            </Button>
            <Button
              onClick={handleClone}
              variant="primary"
              size="sm"
              disabled={busy}
              leftIcon={<Icon name="download" size={14} />}
            >
              拉到我的题库
            </Button>
          </>
        )}
      </div>
      {error && <ErrorBanner>{error}</ErrorBanner>}
    </div>
  );
}
