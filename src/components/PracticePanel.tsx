"use client";

import { useState } from "react";
import { RichContent } from "@/components/RichEditor";
import { VoiceInput } from "@/components/VoiceInput";
import { Button, Card, CardHeader, CardBody, ErrorBanner, Icon, Textarea } from "@/components/ui";

interface Props {
  questionId: string;
  referenceAnswer: string;
  detailedAnswer?: string;
}

function hasText(html: string) {
  if (!html) return false;
  const text = html.replace(/<[^>]+>/g, "").trim();
  return text.length > 0;
}

export function PracticePanel({ questionId, referenceAnswer, detailedAnswer }: Props) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const detailedAvailable = hasText(detailedAnswer ?? "");

  async function handleSubmit() {
    if (!answer.trim()) {
      setError("请先写下你的答案");
      return;
    }
    setError("");
    setLoading(true);
    setFeedback("");
    setScore(null);
    try {
      const res = await fetch(`/api/practice/${questionId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAnswer: answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.code === "NO_API_KEY"
            ? "尚未配置 DeepSeek API key，无法使用 AI 点评。请在 .env.local 中填入 DEEPSEEK_API_KEY 后重启服务。"
            : data.error || "点评失败"
        );
        return;
      }
      setFeedback(data.feedback);
      setScore(data.score);
      setShowReference(true);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card padded>
        <CardHeader
          icon={<Icon name="edit" size={18} />}
          title="你的答案"
          desc="写下回答后让 AI 帮你点评打分"
        />
        <CardBody>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={8}
            placeholder="在这里写下你的回答，然后让 AI 帮你点评..."
          />
          <div className="mt-2">
            <VoiceInput
              onText={(text, replace) => {
                if (replace) {
                  setAnswer(text);
                } else {
                  setAnswer((prev) => (prev && !prev.endsWith(" ") ? `${prev} ${text}` : `${prev}${text}`));
                }
              }}
              getCurrentText={() => answer}
            />
          </div>
          {error && <div className="mt-3"><ErrorBanner>{error}</ErrorBanner></div>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={handleSubmit}
              loading={loading}
              leftIcon={!loading ? <Icon name="sparkles" size={16} /> : undefined}
            >
              {loading ? "AI 点评中..." : "提交，让 AI 点评"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowReference((v) => !v)}
              leftIcon={<Icon name="eye" size={16} />}
            >
              {showReference ? "隐藏标准答案" : "查看标准答案"}
            </Button>
            <Button
              variant="secondary"
              disabled={!detailedAvailable}
              onClick={() => setShowDetailed((v) => !v)}
              leftIcon={<Icon name="book" size={16} />}
              title={detailedAvailable ? "查看详细答案" : "本题没有详细答案"}
            >
              {showDetailed ? "隐藏详细答案" : "查看详细答案"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {feedback && (
        <Card className="animate-fade-in border-brand-200 bg-brand-25/40">
          <CardHeader
            icon={<Icon name="sparkles" size={18} />}
            title="AI 点评"
            action={
              score !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-sm font-bold text-white shadow-soft">
                  {score} 分
                </span>
              )
            }
          />
          <CardBody>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {feedback}
            </div>
          </CardBody>
        </Card>
      )}

      {showReference && (
        <Card padded className="animate-fade-in">
          <CardHeader title="标准答案" icon={<Icon name="book" size={18} />} />
          <CardBody>
            <RichContent html={referenceAnswer} className="text-ink" />
          </CardBody>
        </Card>
      )}

      {showDetailed && detailedAvailable && (
        <Card padded className="animate-fade-in border-violet-200 bg-violet-25/30">
          <CardHeader
            title="详细答案"
            desc="包含落地实现、扩展细节等深入内容"
            icon={<Icon name="list" size={18} />}
          />
          <CardBody>
            <RichContent html={detailedAnswer ?? ""} className="text-ink" />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
