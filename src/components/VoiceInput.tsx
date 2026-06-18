"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { resolveDefaultVoiceMode, type VoiceMode as Mode } from "@/lib/voice-mode";

interface Props {
  /**
   * 识别文本回调。
   * text: 识别到的文本
   * replace: true = 替换整个输入框内容为 text（原生模式实时转写用）
   *          false = 把 text 追加到已有文本末尾（后端模式返回整句用）
   */
  onText: (text: string, replace?: boolean) => void;
  /** 获取输入框当前文本，用于在原生模式 replace 时保留用户手动输入的前缀 */
  getCurrentText?: () => string;
  className?: string;
}

// 浏览器原生 SpeechRecognition 类型（部分浏览器 prefixed）
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
  onnomatch?: (() => void) | null;
};

function getNativeRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

// 语音输入按钮：支持两种模式
// - native: 浏览器 SpeechRecognition API，免费、Chrome/Edge 好、Firefox 不支持
// - server: 录音上传后端 /api/ai/asr，需后台配置 ASR_BASE_URL/API_KEY/MODEL
// 模式切换由组件内部维护，server 模式可用时默认 server，否则 native。
export function VoiceInput({ onText, getCurrentText, className = "" }: Props) {
  const [mode, setMode] = useState<Mode>("native");
  const [serverAvailable, setServerAvailable] = useState(false);
  const [nativeSupported, setNativeSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalTextRef = useRef("");
  const prefixRef = useRef("");
  // 连续 no-speech 计数 + 是否检测到过说话声，用于在收不到声音时给用户明确提示
  const noSpeechCountRef = useRef(0);
  const speechDetectedRef = useRef(false);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  // 启动时查后端 ASR 是否可用，决定默认模式
  useEffect(() => {
    const supported = getNativeRecognition() !== null;
    setNativeSupported(supported);

    let cancelled = false;
    fetch("/api/ai/asr/status")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const configured = Boolean(d.configured);
        setServerAvailable(configured);
        setMode(
          resolveDefaultVoiceMode({
            nativeSupported: supported,
            serverConfigured: configured,
          })
        );
      })
      .catch(() => {
        // 拉取失败不影响原生模式
        if (!cancelled) {
          setMode(
            resolveDefaultVoiceMode({
              nativeSupported: supported,
              serverConfigured: false,
            })
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAll() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }

  async function startNative() {
    const rec = getNativeRecognition();
    if (!rec) {
      setError("当前浏览器不支持原生语音识别，请用 Chrome/Edge，或切换到高精度模式");
      return;
    }
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;
    finalTextRef.current = "";
    prefixRef.current = getCurrentText?.() ?? "";
    noSpeechCountRef.current = 0;
    speechDetectedRef.current = false;

    // 诊断日志：确认识别的生命周期走到哪一步
    rec.onstart = () => console.log("[STT] onstart 识别已启动");
    rec.onaudiostart = () => console.log("[STT] onaudiostart 开始接收音频");
    rec.onspeechstart = () => {
      console.log("[STT] onspeechstart 检测到说话");
      speechDetectedRef.current = true;
      noSpeechCountRef.current = 0;
      setError("");
    };
    rec.onspeechend = () => console.log("[STT] onspeechend 说话结束");
    rec.onnomatch = () => console.log("[STT] onnomatch 未匹配到内容");

    rec.onresult = (e) => {
      let finalChunk = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const transcript = r[0].transcript;
        const real = r as unknown as { isFinal?: boolean };
        if (real.isFinal) finalChunk += transcript;
        else interim += transcript;
      }
      console.log("[STT] onresult final=", JSON.stringify(finalChunk), "interim=", JSON.stringify(interim));
      if (finalChunk) {
        finalTextRef.current += finalChunk;
      }
      // 无论 isFinal 还是 interim，都通过 onText 把完整文本（final + interim）推出去
      // 这样用户能实时看到识别中的文字，isFinal 时文字固定，interim 时文字会微调
      const full = finalTextRef.current + interim;
      if (full) {
        // 拼上用户手动输入的前缀，一次性替换输入框
        const display = prefixRef.current
          ? (prefixRef.current.endsWith(" ") || !prefixRef.current ? `${prefixRef.current}${full}` : `${prefixRef.current} ${full}`)
          : full;
        onTextRef.current(display, true);
      }
    };
    rec.onerror = (e) => {
      const err = e.error || "";
      console.log("[STT] onerror error=", err);
      // no-speech: 没检测到语音，属于正常间隙，自动重启继续听
      // aborted: 用户切了标签页或浏览器中断，也自动重启
      if (err === "no-speech" || err === "aborted") {
        if (err === "no-speech") {
          noSpeechCountRef.current += 1;
          // 从未检测到说话声，且连续多次 no-speech：极可能是麦克风没选对/被静音/被占用
          if (!speechDetectedRef.current && noSpeechCountRef.current >= 2) {
            setError("没听到声音：请检查麦克风是否选对、是否静音，或被其它程序占用");
          }
        }
        if (recognitionRef.current === rec) {
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
      setError(
        err === "not-allowed"
          ? "麦克风权限被拒绝，请在浏览器地址栏允许麦克风"
          : err === "network"
            ? "原生识别需要联网（Chrome 会把音频发到 Google 识别），当前网络不可达"
            : err === "language-not-supported"
              ? "当前浏览器不支持中文识别"
              : err || "识别失败"
      );
      setListening(false);
    };
    rec.onend = () => {
      console.log("[STT] onend 识别结束");
      // 如果仍在 listening 态但 recognition 自己停了（Chrome 会在 ~60s 静默后停），
      // 自动重启；只有用户主动 stop 时 recognitionRef 才被清空
      if (recognitionRef.current === rec) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
        return;
      }
      setListening(false);
    };

    recognitionRef.current = rec;
    try {
      console.log("[STT] 调用 rec.start()，mode=native，浏览器=", navigator.userAgent);
      rec.start();
      setListening(true);
      setError("");
    } catch (e) {
      console.log("[STT] rec.start() 抛异常", e);
      setError(e instanceof Error ? e.message : "无法启动麦克风");
    }
  }

  function stopNative() {
    // 先清 ref，这样 onend 不会自动重启
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }

  async function startServer() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mime || "audio/webm",
        });
        chunksRef.current = [];
        if (blob.size === 0) {
          setListening(false);
          return;
        }
        await uploadAndRecognize(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setListening(true);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "麦克风权限被拒绝"
          : "无法启动录音"
      );
      setListening(false);
    }
  }

  async function uploadAndRecognize(blob: Blob) {
    setError("");
    try {
      const form = new FormData();
      const ext = blob.type.includes("webm") ? "webm" : "audio";
      form.append("file", blob, `recording.${ext}`);
      const res = await fetch("/api/ai/asr", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || "识别失败";
        setError(errMsg);
        // 后端 ASR 不可用时（未配置 / 欠费 / 服务异常），自动回退到原生模式
        if (res.status === 503 || res.status === 502) {
          setMode("native");
          setError(`高精度模式暂不可用（${errMsg}），已自动切回浏览器原生模式，请重新点击麦克风`);
        }
        return;
      }
      if (data.text) onTextRef.current(data.text);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setListening(false);
    }
  }

  function stopServer() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    // listening 状态在 onstop → uploadAndRecognize 完成后才置 false
  }

  function handleClick() {
    if (listening) {
      if (mode === "native") stopNative();
      else stopServer();
      return;
    }
    setError("");
    if (mode === "native") startNative();
    else startServer();
  }

  function toggleMode() {
    if (listening) return;
    if (mode === "native" && !serverAvailable) return;
    if (mode === "server" && !nativeSupported) return;
    setMode(mode === "native" ? "server" : "native");
    setError("");
  }

  const label = listening
    ? mode === "native"
      ? "停止听写"
      : "录音中…点击结束"
    : "语音输入";

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        title={label}
        onClick={handleClick}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          listening
            ? "bg-rose-50 text-rose-600 animate-pulse"
            : "bg-violet-50 text-violet-700 hover:bg-violet-100"
        }`}
      >
        <Icon name="mic" size={14} />
        {label}
      </button>
      {serverAvailable && (
        <button
          type="button"
          title={
            mode === "native"
              ? "当前：浏览器原生（免费）。点击切到高精度（后端 ASR）"
              : "当前：高精度（后端 ASR）。点击切回浏览器原生"
          }
          disabled={listening}
          onClick={toggleMode}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
            mode === "server"
              ? "bg-brand-100 text-brand-700"
              : "bg-canvas text-muted hover:text-ink"
          }`}
        >
          {mode === "native" ? "原生" : "高精度"}
        </button>
      )}
      {error && (
        <span className="text-xs text-rose-600">{error}</span>
      )}
    </div>
  );
}
