"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Icon,
  Spinner,
  Textarea,
} from "@/components/ui";
import { VoiceInput } from "@/components/VoiceInput";

interface ExamQuestion {
  id: string;
  title: string;
  body: string;
  difficulty: string;
}

interface Props {
  paperId: string;
  paperTitle: string;
  timeLimit: number | null;
  questions: ExamQuestion[];
}

export function ExamPanel({ paperId, paperTitle, timeLimit, questions }: Props) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "active" | "submitting" | "submitted">("loading");
  const [timeLeft, setTimeLeft] = useState((timeLimit ?? 0) * 60);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/papers/${paperId}/attempt`, {
          method: "POST",
        });
        const data = await res.json();
        if (res.ok) {
          setAttemptId(data.attemptId);
          setPhase("active");
        } else {
          setError(data.error ?? "无法开始作答");
        }
      } catch {
        setError("网络错误，请刷新重试");
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);

  useEffect(() => {
    if (phase !== "active" || !timeLimit) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timeLimit]);

  useEffect(() => {
    if (timeLeft === 0 && attemptId && phase === "active") {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  useEffect(() => {
    if (!attemptId || phase !== "active") return;
    const interval = setInterval(async () => {
      try {
        await fetch(`/api/papers/${paperId}/attempt`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, answers }),
        });
      } catch { /* silent */ }
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, answers, phase, paperId]);

  const q = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;

  function goPrev() {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  }

  function goNext() {
    if (!isLast) setCurrentIdx((i) => i + 1);
  }

  async function handleSubmit() {
    if (!attemptId) return;
    setPhase("submitting");
    setError("");

    await fetch(`/api/papers/${paperId}/attempt`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, answers }),
    });

    try {
      const res = await fetch(`/api/papers/${paperId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      if (res.ok) {
        setPhase("submitted");
        router.push(`/paper/${paperId}/result/${attemptId}`);
        router.refresh();
      } else {
        const data = await res.json();
        if (data.unanswered) {
          const firstMissingIdx = questions.findIndex((q) =>
            data.unanswered.includes(q.id)
          );
          if (firstMissingIdx >= 0) {
            setCurrentIdx(firstMissingIdx);
            setError("还有题目未作答，已跳转到第一道未答题目");
            setPhase("active");
            return;
          }
        }
        setError(data.error ?? "提交失败");
        setPhase("active");
      }
    } catch {
      setError("网络错误，请重试");
      setPhase("active");
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted">
        <Spinner size="lg" />
        <p className="mt-3 text-sm">加载中...</p>
      </div>
    );
  }

  if (error && phase !== "active") {
    return (
      <Card padded>
        <ErrorBanner>{error}</ErrorBanner>
      </Card>
    );
  }

  const timerText = timeLimit
    ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`
    : null;
  const timerWarning = timeLeft < 300 && timeLeft >= 60;
  const timerDanger = timeLeft < 60;

  return (
    <div className="animate-fade-in">
      {error && phase === "active" && (
        <div className="mb-3">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ink">
              第 {currentIdx + 1}/{questions.length} 题
            </span>
            <Badge difficulty={q?.difficulty as "简单" | "中等" | "困难"} />
          </div>
          {timerText && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-bold tabular-nums ${
                timerDanger
                  ? "bg-red-50 text-red-700 animate-pulse"
                  : timerWarning
                    ? "bg-amber-50 text-amber-700"
                    : "bg-canvas text-ink"
              }`}
            >
              <Icon name="clock" size={14} />
              {timerText}
            </span>
          )}
        </div>

        <div className="h-1 bg-canvas">
          <div
            className="h-full bg-brand-500 transition-all duration-300 ease-out-soft"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="px-5 py-6">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            题目 {currentIdx + 1}
          </div>
          <h2 className="mb-4 text-lg font-bold text-ink">{q?.title}</h2>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">你的回答</span>
            <VoiceInput
              onText={(text, replace) =>
                setAnswers((prev) => {
                  const cur = prev[q.id] ?? "";
                  const next = replace ? text : (cur && !cur.endsWith(" ") ? `${cur} ${text}` : `${cur}${text}`);
                  return { ...prev, [q.id]: next };
                })
              }
              getCurrentText={() => answers[q?.id] ?? ""}
            />
          </div>
          <Textarea
            className="min-h-[160px]"
            placeholder="在此输入你的答案..."
            value={answers[q?.id] ?? ""}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
            }
          />
        </div>

        <div className="flex items-center justify-between border-t border-line bg-canvas/50 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrentIdx(i)}
                className={`size-2.5 rounded-full transition-all ${
                  i === currentIdx
                    ? "scale-125 bg-brand-500"
                    : answers[qq.id]?.trim()
                      ? "bg-brand-400"
                      : "bg-slate-300 hover:bg-slate-400"
                }`}
                title={`第 ${i + 1} 题`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={currentIdx === 0}
              leftIcon={<Icon name="arrow-left" size={14} />}
            >
              上一题
            </Button>
            {isLast ? (
              <Button
                onClick={handleSubmit}
                loading={phase === "submitting"}
                size="sm"
                leftIcon={phase !== "submitting" ? <Icon name="check" size={14} /> : undefined}
              >
                {phase === "submitting" ? "正在提交..." : "提交试卷"}
              </Button>
            ) : (
              <Button onClick={goNext} size="sm" rightIcon={<Icon name="arrow-right" size={14} />}>
                下一题
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
