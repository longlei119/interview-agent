"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIFFICULTIES } from "@/lib/directions";
import { RichEditor } from "@/components/RichEditor";
import {
  Button,
  ErrorBanner,
  Field,
  HintBanner,
  Icon,
  Input,
  Select,
} from "@/components/ui";

export interface QuestionFormValues {
  difficulty: string;
  title: string;
  body: string;
  referenceAnswer: string;
  detailedAnswer: string;
  tags: string;
  topicId: string | null;
}

export interface TopicOption {
  id: string;
  label: string;
}

interface Props {
  questionId?: string;
  initial?: QuestionFormValues;
  topicOptions: TopicOption[];
  direction: string;
  requireTopic?: boolean;
}

function makeEmpty(topicId: string | null): QuestionFormValues {
  return {
    difficulty: DIFFICULTIES[1],
    title: "",
    body: "",
    referenceAnswer: "",
    detailedAnswer: "",
    tags: "",
    topicId,
  };
}

export function QuestionForm({
  questionId,
  initial,
  topicOptions,
  direction,
  requireTopic = false,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(questionId);
  const [values, setValues] = useState<QuestionFormValues>(
    initial ?? makeEmpty(null)
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  function set<K extends keyof QuestionFormValues>(key: K, v: QuestionFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  // 继续添加：保留话题分类和难度（批量录入同一分类下通常一致），清空其余字段
  function continueAdding() {
    setValues((prev) => ({
      ...makeEmpty(prev.topicId),
      difficulty: prev.difficulty,
      topicId: prev.topicId,
    }));
    setCreatedId(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!values.title.trim()) {
      setError("请填写标题");
      return;
    }
    if (requireTopic && !values.topicId) {
      setError("请选择一个话题分类");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/questions/${questionId}` : "/api/questions";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "保存失败");
        return;
      }
      if (isEdit) {
        router.push(`/practice/${questionId}`);
        router.refresh();
        return;
      }
      // 新建成功：不跳转，留在表单页，给出「继续添加 / 查看」两个出口
      setCreatedId(data.id);
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="难度">
          <Select
            value={values.difficulty}
            onChange={(e) => set("difficulty", e.target.value)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="话题分类" required={requireTopic}>
          <Select
            value={values.topicId ?? ""}
            onChange={(e) => set("topicId", e.target.value || null)}
          >
            {requireTopic ? (
              <option value="" disabled>
                请选择话题分类…
              </option>
            ) : (
              <option value="">未分类</option>
            )}
            {topicOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="flex items-center gap-1 text-xs text-muted">
        <Icon name="info" size={12} />
        方向跟随你的个人方向（当前：{direction}），无需逐题选择。
      </p>

      <Field label="标题">
        <Input
          type="text"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="一句话概括这道题问什么"
        />
      </Field>

      <Field
        label="标准答案"
        hint="面试场景下的一句话/要点答案，用于 AI 点评对照。可点 AI 排版自动整理版式"
      >
        <RichEditor
          value={values.referenceAnswer}
          onChange={(html) => set("referenceAnswer", html)}
          placeholder="粘贴或输入标准答案，支持从语雀等工具直接粘贴带格式内容..."
          minHeight="140px"
          enableAiFormat
          aiFormatKind="standard"
        />
      </Field>

      <Field
        label="详细答案"
        hint="选填，可包含落地实现、扩展细节、坑点等，默认不展示给答题者。可点 AI 排版自动整理版式"
      >
        <RichEditor
          value={values.detailedAnswer}
          onChange={(html) => set("detailedAnswer", html)}
          placeholder="可选：补充落地实现、源码细节、扩展阅读等更深入的内容..."
          minHeight="140px"
          enableAiFormat
          aiFormatKind="detailed"
        />
      </Field>

      <Field label="标签" hint="用英文逗号分隔，如 缓存,并发">
        <Input
          type="text"
          value={values.tags}
          onChange={(e) => set("tags", e.target.value)}
          placeholder="缓存,并发,JVM"
        />
      </Field>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {createdId && !isEdit && (
        <div className="animate-fade-in space-y-3">
          <HintBanner variant="success">
            题目已创建成功。
          </HintBanner>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={continueAdding}
              leftIcon={<Icon name="plus" size={16} />}
            >
              继续添加
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                router.push(`/practice/${createdId}`);
                router.refresh();
              }}
              leftIcon={<Icon name="arrow-right" size={16} />}
            >
              查看刚创建的题目
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={loading} size="lg">
          {loading ? "保存中..." : isEdit ? "保存修改" : "创建题目"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.back()}
        >
          取消
        </Button>
      </div>
    </form>
  );
}
