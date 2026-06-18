"use client";

import { useState } from "react";
import { AiModelConfigPanel } from "./AiModelConfigPanel";
import { AiPromptConfigPanel } from "./AiPromptConfigPanel";
import { QuestionManagementPanel } from "./QuestionManagementPanel";
import { UserManagementPanel } from "./UserManagementPanel";
import { AsrConfigPanel } from "./AsrConfigPanel";
import { Card, Icon, IconName } from "@/components/ui";

type AdminTab = "models" | "prompts" | "users" | "questions" | "asr";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  canCreate: boolean;
  _count: { questions: number };
}

interface AdminQuestion {
  id: string;
  title: string;
  direction: string;
  difficulty: string;
  isDelisted: boolean;
  manualHeat: number;
  cloneCount: number;
  likeCount: number;
  viewCount: number;
  heat: number;
  owner: { name: string };
}

interface Props {
  users: AdminUser[];
  currentUserId: string;
  questions: AdminQuestion[];
}

const tabs: Array<{ key: AdminTab; title: string; desc: string; icon: IconName }> = [
  { key: "models", title: "模型配置", desc: "三组模型与故障切换", icon: "sparkles" },
  { key: "asr", title: "语音识别", desc: "语音转文字服务配置", icon: "mic" },
  { key: "prompts", title: "提示词配置", desc: "各功能 AI 指令模板", icon: "edit" },
  { key: "users", title: "用户管理", desc: "加题权限与账号", icon: "users" },
  { key: "questions", title: "题库管理", desc: "公开题目与热度", icon: "compass" },
];

export function AdminDashboard({ users, currentUserId, questions }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>("prompts");
  const active = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Card padded={false} className="p-3 lg:sticky lg:top-4 lg:self-start">
        <div className="mb-3 px-2 py-1">
          <div className="text-sm font-semibold text-ink">管理菜单</div>
          <div className="mt-1 text-xs text-muted">切换不同的管理功能</div>
        </div>
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                <Icon name={tab.icon} size={16} className="mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold">{tab.title}</div>
                  <div className={`mt-0.5 text-xs ${isActive ? "text-brand-500" : "text-muted"}`}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </Card>

      <Card padded className="min-w-0">
        <div className="mb-4 border-b border-line pb-3">
          <h2 className="text-xl font-semibold text-ink">{active.title}</h2>
          <p className="mt-1 text-sm text-muted">{active.desc}</p>
        </div>

        {activeTab === "models" && <AiModelConfigPanel />}
        {activeTab === "asr" && <AsrConfigPanel />}
        {activeTab === "prompts" && <AiPromptConfigPanel />}
        {activeTab === "users" && (
          <UserManagementPanel users={users} currentUserId={currentUserId} />
        )}
        {activeTab === "questions" && <QuestionManagementPanel questions={questions} />}
      </Card>
    </div>
  );
}
