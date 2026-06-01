"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 语音播报：基于浏览器内置 SpeechSynthesis，无需任何外部服务
export function useTTS() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSupported(true);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !enabled || !text.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel(); // 打断上一段
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "zh-CN";
      utter.rate = 1;
      utter.pitch = 1;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      utterRef.current = utter;
      setSpeaking(true);
      synth.speak(utter);
    },
    [supported, enabled]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  // 卸载时停止
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { supported, speaking, enabled, setEnabled, speak, stop };
}
