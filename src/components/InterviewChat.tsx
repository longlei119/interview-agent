"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTTS } from "./useTTS";
import { useSTT } from "./useSTT";
import { Button, ErrorBanner, Icon, Spinner } from "@/components/ui";

interface Msg {
  role: "interviewer" | "candidate";
  content: string;
}

interface Props {
  sessionId: string;
  role: string;
  level: string;
  initialMessages: Msg[];
  initialStatus: string;
  initialSummary: string;
  initialScore: number;
}

export function InterviewChat({
  sessionId,
  role,
  level,
  initialMessages,
  initialStatus,
  initialSummary,
  initialScore,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [finished, setFinished] = useState(initialStatus === "finished");
  const [summary, setSummary] = useState(initialSummary);
  const [score, setScore] = useState(initialScore);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");

  const tts = useTTS();
  const stt = useSTT((text) => setInput(text));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, summary]);

  useEffect(() => {
    const last = initialMessages[initialMessages.length - 1];
    if (last?.role === "interviewer") tts.speak(last.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    const answer = input.trim();
    if (!answer || sending) return;
    if (stt.listening) stt.stop();
    setError("");
    setInput("");
    setMessages((m) => [...m, { role: "candidate", content: answer }]);
    setSending(true);
    setStreaming("");

    try {
      const res = await fetch(`/api/interview/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "对话失败，请稍后重试");
        setSending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreaming(full);
      }
      setMessages((m) => [...m, { role: "interviewer", content: full }]);
      setStreaming("");
      tts.speak(full);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSending(false);
    }
  }

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    setError("");
    tts.stop();
    try {
      const res = await fetch(`/api/interview/${sessionId}/finish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "生成总评失败");
        return;
      }
      setSummary(data.summary);
      setScore(data.score);
      setFinished(true);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setFinishing(false);
    }
  }

  function toggleMic() {
    if (stt.listening) stt.stop();
    else stt.start();
  }

  return (
    <div className="flex animate-fade-in flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      {/* 头部 */}
      <div className="mb-3 flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon name="user" size={20} />
          </div>
          <div>
            <div className="font-semibold text-ink">{role} · {level}</div>
            <div className="flex items-center gap-1 text-xs text-muted">
              <span
                className={`inline-block size-1.5 rounded-full ${
                  finished ? "bg-muted" : "bg-[rgba(95,122,77,0.15)]0"
                }`}
              />
              {finished ? "面试已结束" : "面试进行中"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tts.supported && (
            <button
              onClick={() => {
                if (tts.speaking) tts.stop();
                tts.setEnabled(!tts.enabled);
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tts.enabled
                  ? "bg-brand-50 text-brand-700"
                  : "bg-canvas text-muted hover:text-ink"
              }`}
              title="面试官语音播报开关"
            >
              <Icon name={tts.enabled ? "volume" : "volume-off"} size={14} />
              {tts.enabled ? "朗读开" : "朗读关"}
            </button>
          )}
          {!finished && (
            <Button onClick={handleFinish} loading={finishing} size="sm" variant="secondary">
              {finishing ? "生成中..." : "结束并评分"}
            </Button>
          )}
        </div>
      </div>

      {/* 对话区 */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-card"
      >
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {streaming && <MessageBubble role="interviewer" content={streaming} />}
        {sending && !streaming && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm bg-canvas px-4 py-3 text-sm text-muted">
              <Spinner size="sm" />
              思考中…
            </div>
          </div>
        )}

        {finished && summary && (
          <div className="animate-fade-in rounded-xl border border-brand-200 bg-brand-25/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-bold text-brand-700">
                <Icon name="sparkles" size={16} />
                面试总评
              </h3>
              <span className="rounded-full bg-brand-500 px-3 py-1 text-sm font-bold text-white shadow-soft">
                {score} 分
              </span>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {summary}
            </div>
            <Button
              onClick={() => router.push("/interview")}
              className="mt-4"
              leftIcon={<Icon name="play" size={14} />}
            >
              再来一场
            </Button>
          </div>
        )}
      </div>

      {error && <div className="mt-2"><ErrorBanner>{error}</ErrorBanner></div>}

      {/* 输入区 */}
      {!finished && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-3 shadow-card">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            placeholder={
              stt.listening ? "正在聆听，请说话…" : "输入你的回答，或点麦克风语音作答（Enter 发送）"
            }
            className="w-full resize-none rounded-lg border border-line bg-surface p-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stt.supported ? (
                <>
                  <button
                    onClick={toggleMic}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      stt.listening
                        ? "bg-brand-500 text-white shadow-soft hover:bg-brand-600"
                        : "bg-canvas text-muted hover:bg-line hover:text-ink"
                    }`}
                  >
                    {stt.listening ? (
                      <>
                        <span className="relative flex size-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-surface opacity-75" />
                          <span className="relative inline-flex size-2.5 rounded-full bg-surface" />
                        </span>
                        停止
                      </>
                    ) : (
                      <>
                        <Icon name="mic" size={16} />
                        语音作答
                      </>
                    )}
                  </button>
                  {stt.serverAvailable && (
                    <button
                      type="button"
                      disabled={stt.listening}
                      onClick={stt.toggleMode}
                      title={
                        stt.mode === "native"
                          ? "当前：浏览器原生。点击切到高精度（后端 ASR）"
                          : "当前：高精度（后端 ASR）。点击切回浏览器原生"
                      }
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        stt.mode === "server"
                          ? "bg-brand-100 text-brand-700"
                          : "bg-canvas text-muted hover:text-ink"
                      }`}
                    >
                      {stt.mode === "native" ? "原生" : "高精度"}
                    </button>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted">
                  当前浏览器不支持语音输入，请用文字作答
                </span>
              )}
              {stt.error && <span className="text-xs text-rose-600">{stt.error}</span>}
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              leftIcon={!sending ? <Icon name="send" size={16} /> : undefined}
              loading={sending}
            >
              发送
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isInterviewer = role === "interviewer";
  return (
    <div className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isInterviewer
            ? "rounded-tl-sm bg-canvas text-ink"
            : "rounded-tr-sm bg-brand-500 text-white shadow-soft"
        }`}
      >
        <div
          className={`mb-0.5 text-xs ${
            isInterviewer ? "text-muted" : "text-white/70"
          }`}
        >
          {isInterviewer ? "面试官" : "我"}
        </div>
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
