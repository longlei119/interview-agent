"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";
import { useEffect, useCallback, useState } from "react";

// 工具栏按钮配置
const tools = [
  { label: "H1", action: "toggleHeading" as const, level: 1, title: "一级标题", active: "heading" },
  { label: "H2", action: "toggleHeading" as const, level: 2, title: "二级标题", active: "heading" },
  { label: "H3", action: "toggleHeading" as const, level: 3, title: "三级标题", active: "heading" },
] as const;

const inlineTools = [
  { label: "B", action: "toggleBold" as const, title: "加粗", active: "bold" },
  { label: "I", action: "toggleItalic" as const, title: "斜体", active: "italic" },
  { label: "U", action: "toggleUnderline" as const, title: "下划线", active: "underline" },
  { label: "<>", action: "toggleCode" as const, title: "行内代码", active: "code" },
] as const;

const blockTools = [
  { label: "¶", action: "toggleCodeBlock" as const, title: "代码块", active: "codeBlock" },
  { label: "•", action: "toggleBulletList" as const, title: "无序列表", active: "bulletList" },
  { label: "1.", action: "toggleOrderedList" as const, title: "有序列表", active: "orderedList" },
  { label: '"', action: "toggleBlockquote" as const, title: "引用", active: "blockquote" },
  { label: "—", action: "setHorizontalRule" as const, title: "分割线", active: "horizontalRule" },
  { label: "A", action: "toggleHighlight" as const, title: "高亮", active: "highlight" },
] as const;

// 预设颜色
const textColors = [
  "#1a1a1a", "#e60000", "#ff9900", "#008000",
  "#3b6cff", "#6d28d9", "#787878",
];

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  editable?: boolean;
  enableAiFormat?: boolean;
  aiFormatKind?: "standard" | "detailed";
}

export function RichEditor({
  value,
  onChange,
  placeholder = "输入内容...",
  minHeight = "120px",
  editable = true,
  enableAiFormat = false,
  aiFormatKind = "standard",
}: Props) {
  const [formattingMode, setFormattingMode] = useState<"format" | "table" | null>(null);
  const [formatError, setFormatError] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: "rich-code-block" } },
      }),
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
    ],
    content: value,
    editable,
    editorProps: {
      attributes: {
        class: `rich-editor-content prose prose-sm max-w-none outline-none ${editable ? "" : "readonly"}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // 同步外部 value 变化
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  // 处理颜色
  const setColor = useCallback(
    (color: string) => {
      editor?.chain().focus().setColor(color).run();
    },
    [editor]
  );

  // AI 一键排版：把当前内容交给 AI，让它重新结构化成 HTML，再替换编辑器内容
  // mode: "format" 普通排版 | "table" 对比内容识别并生成表格
  const formatWithAi = useCallback(
    async (mode: "format" | "table") => {
      if (!editor || formattingMode) return;
      const current = editor.getHTML();
      const text = current.replace(/<[^>]+>/g, "").trim();
      if (!text) {
        setFormatError("内容为空，无法排版");
        return;
      }
      setFormattingMode(mode);
      setFormatError("");
      try {
        const res = await fetch("/api/ai/format-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: current, kind: aiFormatKind, mode }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormatError(data.error || "排版失败");
          return;
        }
        if (data.html && data.html.trim()) {
          editor.commands.setContent(data.html);
          onChange(data.html);
        } else {
          setFormatError("AI 返回为空，请稍后重试");
        }
      } catch {
        setFormatError("网络错误，请稍后重试");
      } finally {
        setFormattingMode(null);
      }
    },
    [editor, formattingMode, aiFormatKind, onChange]
  );

  if (!editor) {
    return (
      <div
        className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-muted"
        style={{ minHeight }}
      >
        加载编辑器...
      </div>
    );
  }

  return (
    <div className="rich-editor rounded-lg border border-line bg-surface transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5">
          {tools.map(({ label, action, level, title, active }) => {
            const isActive = editor.isActive(active, { level });
            return (
              <button
                key={`${action}-${level}`}
                type="button"
                title={title}
                onClick={() => editor.chain().focus()[action]({ level }).run()}
                className={`min-w-7 rounded px-2 py-1 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-100 text-brand-700"
                    : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}

          <span className="mx-1 text-line">|</span>

          {inlineTools.map(({ label, action, title, active }) => (
            <button
              key={action}
              type="button"
              title={title}
              onClick={() => editor.chain().focus()[action]().run()}
              className={`min-w-7 rounded px-2 py-1 text-xs font-semibold transition-colors ${
                editor.isActive(active)
                  ? "bg-brand-100 text-brand-700"
                  : "text-muted hover:bg-canvas hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}

          <span className="mx-1 text-line">|</span>

          {blockTools.map(({ label, action, title, active }) => (
            <button
              key={action}
              type="button"
              title={title}
              onClick={() => {
                const chain = editor.chain().focus();
                if (action === "setHorizontalRule") {
                  chain.setHorizontalRule().run();
                } else {
                  (chain as unknown as Record<string, () => typeof chain>)[action]().run();
                }
              }}
              className={`min-w-7 rounded px-2 py-1 text-xs font-semibold transition-colors ${
                active !== "horizontalRule" && editor.isActive(active)
                  ? "bg-brand-100 text-brand-700"
                  : "text-muted hover:bg-canvas hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}

          <span className="mx-1 text-line">|</span>

          {textColors.map((color) => (
            <button
              key={color}
              type="button"
              title={`文字颜色 ${color}`}
              onClick={() => setColor(color)}
              className="size-5 rounded-full border border-line transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
            />
          ))}

          {enableAiFormat && (
            <>
              <span className="mx-1 text-line">|</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="让 AI 重新整理这段答案的版式（不改语义、不补内容）"
                  disabled={formattingMode !== null}
                  onClick={() => formatWithAi("format")}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors ${
                    formattingMode !== null
                      ? "bg-brand-50 text-brand-400 cursor-wait"
                      : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                  }`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={formattingMode === "format" ? "animate-spin" : ""}
                  >
                    <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
                  </svg>
                  {formattingMode === "format" ? "排版中..." : "AI 排版"}
                </button>
                <button
                  type="button"
                  title="让 AI 识别内容里的对比关系，用表格呈现（适合多方案/特性对比的内容）"
                  disabled={formattingMode !== null}
                  onClick={() => formatWithAi("table")}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors ${
                    formattingMode !== null
                      ? "bg-violet-50 text-violet-400 cursor-wait"
                      : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                  }`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={formattingMode === "table" ? "animate-spin" : ""}
                  >
                    <rect x="3" y="4" width="18" height="16" rx="1" />
                    <path d="M3 10h18M3 16h18M9 4v16M15 4v16" />
                  </svg>
                  {formattingMode === "table" ? "对比中..." : "AI 对比"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {formatError && (
        <div className="border-t border-red-100 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {formatError}
        </div>
      )}

      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="px-3 py-2 text-sm leading-relaxed text-ink"
      />

      <style jsx global>{`
        .rich-editor-content {
          min-height: ${minHeight};
          max-height: 400px;
          overflow-y: auto;
          font-size: 14px;
          line-height: 1.75;
          color: #1e293b;
        }
        .rich-editor-content > *:first-child {
          margin-top: 0;
        }
        .rich-editor-content > *:last-child {
          margin-bottom: 0;
        }
        .rich-editor-content p {
          margin: 0 0 0.75em 0;
        }
        .rich-editor-content h1,
        .rich-editor-content h2,
        .rich-editor-content h3,
        .rich-editor-content h4 {
          font-weight: 600;
          line-height: 1.4;
          color: #0f172a;
          margin: 1.2em 0 0.6em;
        }
        .rich-editor-content h1 {
          font-size: 1.3em;
          padding-bottom: 0.3em;
          border-bottom: 1px solid #e2e8f0;
        }
        .rich-editor-content h2 {
          font-size: 1.18em;
        }
        .rich-editor-content h3 {
          font-size: 1.06em;
        }
        .rich-editor-content .ProseMirror-placeholder {
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-editor-content ul,
        .rich-editor-content ol {
          padding-left: 1.6em;
          margin: 0.5em 0 0.9em;
        }
        .rich-editor-content ul {
          list-style: disc;
        }
        .rich-editor-content ol {
          list-style: decimal;
        }
        .rich-editor-content li {
          margin: 0.25em 0;
        }
        .rich-editor-content li::marker {
          color: #94a3b8;
        }
        .rich-editor-content a {
          color: #3b6cff;
          text-decoration: none;
          border-bottom: 1px solid rgba(59, 108, 255, 0.3);
        }
        .rich-editor-content strong {
          font-weight: 600;
          color: #0f172a;
        }
        .rich-editor-content code {
          font-family: "JetBrains Mono", "Fira Code", "SFMono-Regular", Consolas, monospace;
          font-size: 0.88em;
          background: #f1f5f9;
          color: #be185d;
          padding: 1px 6px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        .rich-editor-content pre {
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 8px;
          padding: 14px 18px;
          font-family: "JetBrains Mono", "Fira Code", "SFMono-Regular", Consolas, monospace;
          font-size: 13px;
          line-height: 1.6;
          overflow-x: auto;
          margin: 0.8em 0 1em;
        }
        .rich-editor-content pre code {
          background: none;
          border: none;
          color: inherit;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }
        .rich-editor-content blockquote {
          margin: 0.9em 0;
          padding: 0.4em 0 0.4em 14px;
          border-left: 3px solid #3b6cff;
          background: #f5f7fb;
          border-radius: 0 6px 6px 0;
          color: #475569;
        }
        .rich-editor-content blockquote p {
          margin: 0;
        }
        .rich-editor-content mark {
          background: #fef3c7;
          color: #78350f;
          padding: 1px 4px;
          border-radius: 3px;
        }
        .rich-editor-content hr {
          margin: 1.4em 0;
          border: none;
          border-top: 1px solid #e2e8f0;
        }
        .rich-editor-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.9em 0;
          font-size: 13px;
          overflow-x: auto;
          display: block;
        }
        .rich-editor-content thead {
          background: #f1f5f9;
        }
        .rich-editor-content th,
        .rich-editor-content td {
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          text-align: left;
          vertical-align: top;
        }
        .rich-editor-content th {
          font-weight: 600;
          color: #0f172a;
        }
        .ProseMirror:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}

/** 安全渲染 HTML 内容（用于显示只读区域） */
export function RichContent({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  if (!html) return null;

  return (
    <div
      className={`rich-content text-sm leading-relaxed text-ink ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
