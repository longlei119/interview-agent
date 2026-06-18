import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { chat, DeepSeekNotConfiguredError } from "@/lib/deepseek";

// AI 一键排版答案：把当前答案内容（HTML 或纯文本）交给主模型，
// 让它重新组织成结构清晰的 HTML（标题、列表、代码块、引用等）。
// 不改语义、不补内容，只做版式重排。
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!user.canCreate) {
    return NextResponse.json({ error: "你的权限已被关闭" }, { status: 403 });
  }

  const { content, kind, mode } = await req.json();
  const raw = typeof content === "string" ? content.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "内容为空，无需排版" }, { status: 400 });
  }

  const preferTable = mode === "table";

  const kindLabel =
    kind === "detailed" ? "详细答案（含落地实现、扩展细节）" : "标准答案（面试场景的一句话/要点答案）";

  const baseSystem = [
    "你是一个答案排版助手。给定一段用户输入的答案（可能是富文本 HTML，也可能是纯文本），",
    "请在不改变语义、不补充新内容、不删减关键信息的前提下，把它重新组织成结构清晰、便于阅读的 HTML。",
    "",
    "通用要求：",
    "1. 输出必须是合法的 HTML 片段，不要输出 markdown、不要包 <html>/<body>、不要加代码块围栏。",
    "2. 根据内容语义使用合适的标签：<h1>/<h2>/<h3> 做标题，<p> 做段落，<ul>/<ol>/<li> 做列表，",
    "   <pre><code> 做代码块，<blockquote> 做引用，<strong>/<em> 做强调，<code> 做行内代码。",
    "3. 不要添加原文没有的标题；如果原文已分点，就保留分点结构。",
    "4. 不要加 class、style、id 等属性；只保留语义标签。",
    "5. 代码块不要带语言 class（如 language-js）；统一用 <pre><code>。",
    "6. 只输出排版后的 HTML 本身，不要任何解释、前言、后记。",
  ];

  const tableRules = [
    "",
    "本次任务的额外重点：识别内容里是否存在「对比关系」——例如多个方案/选项/模型/技术/版本/语言之间的对比，",
    "或同一事物在多个维度上的差异。判断标准：只要内容里出现了「A vs B」「对比维度」「属性」「字段」这类暗示，",
    "或者列举了多个对象并描述它们各自的多个相同维度，就属于对比关系。",
    "",
    "**识别到对比关系时，必须用 <table> 表达，禁止把对比内容散落在段落或列表里。** 这是硬性要求。",
    "",
    "对比表格要求：",
    "- 用 <table><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table> 完整结构，不要漏掉 thead/tbody。",
    "- 表头选择规则：如果被对比的对象少于 5 个、每个对象要描述的维度多于 3 个，就把「对比对象」放表头（每列一个对象），「维度」放每行；",
    "  反之就把「维度」放表头，「对象」放每行。优先选信息密度更高、更易读的那种。",
    "- 表格只承载可对齐的对比内容；表格前可用一个 <p> 或 <h2>/<h3> 做简短引言，表格后可有总结段落，但对比本身必须在表格里。",
    "- 表格不要加 caption、summary 等额外标签，不要加 class/style。",
    "- 如果内容里真的完全没有对比关系（只有一个对象的属性罗列，没有第二个对象与之对比），才允许不出表格。",
    "",
    "示例（输入包含 BGE-M3 与 Qwen3-Embedding 的多维度对比，应输出）：",
    "<h3>核心推荐模型对比</h3>",
    "<table>",
    "<thead><tr><th>对比维度</th><th>BGE-M3</th><th>Qwen3-Embedding</th></tr></thead>",
    "<tbody>",
    "<tr><td>架构</td><td>Encoder-only（BERT 系）</td><td>Decoder-only（Qwen3 LLM 微调）</td></tr>",
    "<tr><td>语言 / 跨语言</td><td>100+ 语言，中英对齐</td><td>多语言更强，复杂 query 理解更好</td></tr>",
    "<tr><td>向量类型</td><td>Dense + 原生 Sparse（混合检索）</td><td>仅 Dense（需 BM25 / 外部 sparse）</td></tr>",
    "</tbody>",
    "</table>",
  ];

  const system = preferTable
    ? [...baseSystem, ...tableRules].join("\n")
    : baseSystem.join("\n");

  const taskHint = preferTable ? "（本次重点：识别并提取对比内容，用表格呈现）" : "";
  const userMsg = [
    `这是待排版的「${kindLabel}」内容${taskHint}：`,
    "",
    "----- BEGIN -----",
    raw,
    "----- END -----",
    "",
    "请输出排版后的 HTML 片段。",
  ].join("\n");

  try {
    const reply = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.2, role: "primary" }
    );

    const html = extractHtml(reply);
    if (!html) {
      return NextResponse.json({ error: "AI 返回为空，请稍后重试" }, { status: 502 });
    }
    return NextResponse.json({ html });
  } catch (e) {
    if (e instanceof DeepSeekNotConfiguredError) {
      return NextResponse.json(
        { error: "尚未配置 AI 模型，无法排版。请联系管理员在后台配置 AI 模型。", code: "NO_API_KEY" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "排版失败" },
      { status: 500 }
    );
  }
}

// 从 AI 回复里抽出 HTML 片段：
// - 去掉可能的 ```html ... ``` 围栏
// - 去掉前言/后记，取第一个 < 到最后一个 > 之间的内容
function extractHtml(reply: string): string {
  let s = reply.trim();
  // 去掉 markdown 代码围栏
  const fence = s.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/i);
  if (fence) s = fence[1].trim();
  // 取从首个 < 到末个 > 之间
  const first = s.indexOf("<");
  const last = s.lastIndexOf(">");
  if (first >= 0 && last > first) {
    s = s.slice(first, last + 1);
  }
  return s.trim();
}
