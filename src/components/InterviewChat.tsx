"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTTS } from "./useTTS";
import { useSTT } from "./useSTT";

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

  // 自动滚到底部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, summary]);

  // 进入页面时朗读面试官最后一句开场白
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
    <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      {/* 头部 */}
      <div className="mb-3 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div>
          <div className="font-semibold text-gray-900">
            {role} · {level}
          </div>
          <div className="text-xs text-gray-400">
            {finished ? "面试已结束" : "面试进行中"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tts.supported && (
            <button
              onClick={() => {
                if (tts.speaking) tts.stop();
                tts.setEnabled(!tts.enabled);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                tts.enabled
                  ? "bg-brand-50 text-brand-600"
                  : "bg-gray-100 text-gray-400"
              }`}
              title="面试官语音播报开关"
            >
              {tts.enabled ? "🔊 朗读开" : "🔇 朗读关"}
            </button>
          )}
          {!finished && (
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-60"
            >
              {finishing ? "生成中..." : "结束并评分"}
            </button>
          )}
        </div>
      </div>

      {/* 对话区 */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4"
      >
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {streaming && <MessageBubble role="interviewer" content={streaming} />}
        {sending && !streaming && (
          <MessageBubble role="interviewer" content="思考中…" />
        )}

        {/* 总评卡片 */}
        {finished && summary && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold text-brand-700">面试总评</h3>
              <span className="rounded-full bg-brand-500 px-3 py-1 text-sm font-bold text-white">
                {score} 分
              </span>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {summary}
            </div>
            <button
              onClick={() => router.push("/interview")}
              className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              再来一场
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* 输入区 */}
      {!finished && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
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
            className="w-full resize-none rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-brand-500"
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stt.supported ? (
                <button
                  onClick={toggleMic}
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    stt.listening
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {stt.listening ? "● 停止" : "🎤 语音作答"}
                </button>
              ) : (
                <span className="text-xs text-gray-400">
                  当前浏览器不支持语音输入，请用文字作答
                </span>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              发送
            </button>
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
            ? "rounded-tl-sm bg-gray-100 text-gray-800"
            : "rounded-tr-sm bg-brand-500 text-white"
        }`}
      >
        <div className="mb-0.5 text-xs opacity-70">
          {isInterviewer ? "面试官" : "我"}
        </div>
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
