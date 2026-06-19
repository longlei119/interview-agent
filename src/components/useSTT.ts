"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveDefaultVoiceMode } from "@/lib/voice-mode";

// 浏览器 Web Speech API 的最小类型声明（标准 TS lib 未包含）
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number } & Record<number, SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export type SttMode = "native" | "server";

// 语音输入：支持浏览器原生 + 后端 ASR 双模式。
// - native: Web Speech API，实时转写，免费
// - server: 录音上传 /api/ai/asr，后端调智谱/通义等，高精度
export function useSTT(onTranscript: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [mode, setMode] = useState<SttMode>("native");
  const [error, setError] = useState("");

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalRef = useRef("");
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  // 启动时查后端 ASR 是否可用
  useEffect(() => {
    let cancelled = false;
    const nativeAvailable = getRecognitionCtor() !== null;
    setSupported(nativeAvailable);

    fetch("/api/ai/asr/status")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const avail = Boolean(d.configured);
        setServerAvailable(avail);
        setMode(
          resolveDefaultVoiceMode({
            nativeSupported: nativeAvailable,
            serverConfigured: avail,
          })
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMode(
            resolveDefaultVoiceMode({
              nativeSupported: nativeAvailable,
              serverConfigured: false,
            })
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- native ---
  const startNative = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("浏览器不支持原生识别");
      return;
    }
    const rec = new Ctor();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      callbackRef.current(finalRef.current + interim);
    };
    rec.onerror = (e) => {
      const err = e.error || "";
      // no-speech: 没检测到语音，属于正常间隙，自动重启继续听
      // aborted: 用户切了标签页或浏览器中断，也自动重启
      if (err === "no-speech" || err === "aborted") {
        if (recRef.current === rec) {
          try {
            rec.start();
          } catch {
            setListening(false);
            setError("语音识别中断，请重新点击麦克风");
          }
        }
        return;
      }
      // 其他错误（not-allowed / network / service-not-allowed）是致命的
      setError(err || "识别失败");
      setListening(false);
    };
    rec.onend = () => {
      // 如果仍然在 listening 态但 recognition 自己停了（ Chrome 会在 ~60s 静默后停），
      // 自动重启；只有用户主动 stop 时 recRef.current 才被清空
      if (recRef.current === rec) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
        return;
      }
      setListening(false);
    };

    recRef.current = rec;
    rec.start();
    setListening(true);
    setError("");
  }, []);

  const stopNative = useCallback(() => {
    // 先清 ref，这样 onend 不会自动重启
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  // --- server ---
  const startServer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        chunksRef.current = [];
        if (blob.size === 0) {
          setListening(false);
          return;
        }
        // 上传到后端 ASR
        setError("");
        try {
          const form = new FormData();
          form.append("file", blob, `recording.${mime ? "webm" : "audio"}`);
          const res = await fetch("/api/ai/asr", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) {
            const errMsg = data.error || "后端识别失败";
            setError(errMsg);
            // 后端 ASR 不可用时（未配置 / 欠费 / 服务异常），自动回退到原生模式
            if (res.status === 503 || res.status === 502) {
              setMode("native");
              if (getRecognitionCtor()) {
                setError(`高精度模式暂不可用（${errMsg}），已自动切回浏览器原生模式`);
              }
            }
            return;
          }
          if (data.text) callbackRef.current(data.text);
        } catch {
          setError("网络错误，请稍后重试");
        } finally {
          setListening(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setListening(true);
      setError("");
    } catch (e) {
      const notAllowed = e instanceof Error && e.name === "NotAllowedError";
      const insecure = typeof window !== "undefined" && !window.isSecureContext;
      setError(
        insecure
          ? "当前为 HTTP 访问，iOS 要求 HTTPS 才能用麦克风，请联系管理员启用 HTTPS"
          : notAllowed
            ? "麦克风权限被拒绝"
            : "无法录音"
      );
      setListening(false);
    }
  }, []);

  const stopServer = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    // listening 在 onstop 回调完成后才置 false
  }, []);

  // --- 公共 ---
  const start = useCallback(() => {
    if (mode === "server" && serverAvailable) startServer();
    else startNative();
  }, [mode, serverAvailable, startServer, startNative]);

  const stop = useCallback(() => {
    if (mode === "server") stopServer();
    else stopNative();
  }, [mode, stopServer, stopNative]);

  function toggleMode() {
    if (listening) return;
    if (mode === "native" && !serverAvailable) return;
    if (mode === "server" && !supported) return;
    setMode(mode === "native" ? "server" : "native");
    setError("");
  }

  return {
    supported,
    listening,
    start,
    stop,
    mode,
    serverAvailable,
    error,
    toggleMode,
  };
}
