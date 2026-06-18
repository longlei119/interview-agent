"use client";

import { useState } from "react";
import { RichContent } from "@/components/RichEditor";
import { Badge, Icon } from "@/components/ui";

interface Props {
  index: number;
  title: string;
  difficulty: string;
  userAnswer: string;
  referenceAnswer: string;
  detailedAnswer?: string;
  feedback: string;
  score: number;
  defaultOpen: boolean;
}

function hasText(html: string | undefined) {
  if (!html) return false;
  const text = html.replace(/<[^>]+>/g, "").trim();
  return text.length > 0;
}

export function ResultView({
  index,
  title,
  difficulty,
  userAnswer,
  referenceAnswer,
  detailedAnswer,
  feedback,
  score,
  defaultOpen,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [showDetailed, setShowDetailed] = useState(false);

  const scoreVariant = score >= 80 ? "success" : score >= 60 ? "warn" : "danger";
  const detailedAvailable = hasText(detailedAnswer);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card transition-colors hover:border-brand-300">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-canvas"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">
            {index + 1}. {title}
          </span>
          <Badge difficulty={difficulty as "简单" | "中等" | "困难"} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={scoreVariant} className="text-sm font-bold">
            {score} 分
          </Badge>
          <Icon
            name="chevron-down"
            size={16}
            className="text-muted transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </div>
      </button>

      {open && (
        <div className="animate-fade-in border-t border-line px-5 py-4">
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              你的回答
            </h4>
            <div className="rounded-lg bg-brand-25/60 p-4 text-sm leading-relaxed text-ink">
              {userAnswer || <span className="text-muted">未作答</span>}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              标准答案
            </h4>
            <div className="rounded-lg bg-canvas p-4">
              <RichContent html={referenceAnswer} />
            </div>
          </div>

          {detailedAvailable && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowDetailed((v) => !v)}
                className="mb-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-violet-600 transition-colors hover:text-violet-700"
              >
                <Icon
                  name="chevron-right"
                  size={12}
                  style={{ transform: showDetailed ? "rotate(90deg)" : "rotate(0deg)" }}
                />
                详细答案
                <span className="font-normal text-muted">{showDetailed ? "（点击收起）" : "（点击展开）"}</span>
              </button>
              {showDetailed && (
                <div className="animate-fade-in rounded-lg bg-violet-50/50 p-4">
                  <RichContent html={detailedAnswer ?? ""} />
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-violet-600">
              <Icon name="sparkles" size={12} />
              AI 点评
            </h4>
            <div className="rounded-lg bg-violet-50/60 p-4 text-sm leading-relaxed text-violet-900">
              {feedback || "暂无点评"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
