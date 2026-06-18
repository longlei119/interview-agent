"use client";

import { useState } from "react";
import { AiModelConfigPanel } from "./AiModelConfigPanel";
import { AiPromptConfigPanel } from "./AiPromptConfigPanel";
import { Card, Icon } from "@/components/ui";

type Tab = "models" | "prompts";

export function AdminSettingsPanel() {
  const [tab, setTab] = useState<Tab>("prompts");

  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-surface text-brand-700 shadow-soft"
        : "text-muted hover:text-ink"
    }`;

  return (
    <Card padded>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-semibold text-ink">
            <Icon name="settings" size={18} className="text-brand-500" />
            AI 设置
          </h2>
          <p className="mt-1 text-sm text-muted">
            统一管理模型切换、故障兜底和各功能使用的提示词。
          </p>
        </div>
        <div className="grid w-full grid-cols-2 rounded-lg bg-canvas p-1 sm:w-auto">
          <button onClick={() => setTab("prompts")} className={tabClass(tab === "prompts")}>
            提示词配置
          </button>
          <button onClick={() => setTab("models")} className={tabClass(tab === "models")}>
            模型配置
          </button>
        </div>
      </div>

      <div className="border-t border-line pt-4">
        {tab === "models" ? <AiModelConfigPanel /> : <AiPromptConfigPanel />}
      </div>
    </Card>
  );
}
