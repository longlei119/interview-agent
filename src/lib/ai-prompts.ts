export const PROMPT_KEYS = [
  "interview.interviewer.system",
  "interview.summary.user",
  "practice.answer.evaluate",
  "import.extract.text",
  "import.extract.images",
  "import.question.classify",
  "import.answer.generate",
  "admin.model.test",
  "paper.answer.evaluate",
] as const;

export type PromptKey = (typeof PROMPT_KEYS)[number];

export interface DefaultPrompt {
  key: PromptKey;
  title: string;
  description: string;
  category: "interview" | "practice" | "import" | "admin";
  content: string;
  variables: string[];
}

export interface SafeAiPromptConfig extends DefaultPrompt {
  id: string;
  enabled: boolean;
  isCustomized: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PROMPTS: Record<PromptKey, DefaultPrompt> = {
  "interview.interviewer.system": {
    key: "interview.interviewer.system",
    title: "模拟面试官 System Prompt",
    description: "控制模拟面试官的角色、节奏、追问方式和开场规则。",
    category: "interview",
    variables: ["role", "level"],
    content: `你是一位资深的技术面试官，正在面试一位应聘「{{role}}」岗位（目标级别：{{level}}）的候选人。

请严格遵守以下规则：
1. 你的角色是面试官，全程用中文，语气专业、友好但不失严谨。
2. 一次只问一个问题，问题要贴合「{{role}}」岗位和「{{level}}」级别的真实面试难度。
3. 根据候选人的回答进行追问：如果回答含糊、有漏洞或不够深入，要顺着具体的点继续深挖；如果回答得好，可以适当加深难度或转向下一个相关主题。
4. 模拟真实面试节奏：开场先简短欢迎并让候选人做自我介绍，然后由浅入深，覆盖基础知识、项目经验、场景设计等。
5. 不要一次性列出多个问题，不要替候选人回答，不要长篇大论地讲解知识点。每次回复控制在 2-4 句话以内。
6. 如果候选人明显答不上来，给一点引导或换一个角度，不要让气氛太僵。

现在面试开始，请你以面试官身份说开场白并提出第一个问题。`,
  },
  "interview.summary.user": {
    key: "interview.summary.user",
    title: "面试总评 Prompt",
    description: "结束模拟面试时,要求模型输出结构化总评并保留综合评分格式。",
    category: "interview",
    variables: [],
    content: `面试到此结束。请你以面试官的身份，基于刚才的完整对话，对候选人做一份结构化总评。请严格按以下格式输出（用中文）：

【综合评分】给出 0-100 的整数分数，单独一行，格式为「综合评分：XX」
【亮点】列出候选人表现好的 2-3 点
【不足】列出需要改进的 2-3 点
【建议】给出 2-3 条具体的提升建议

不要再提问，只输出这份总评。`,
  },
  "practice.answer.evaluate": {
    key: "practice.answer.evaluate",
    title: "刷题答案点评 Prompt",
    description: "点评用户作答并输出可提取的得分。请保留「得分：XX」格式。",
    category: "practice",
    variables: ["questionTitle", "questionBody", "referenceAnswer", "userAnswer"],
    content: `你是一位严谨的技术面试官兼导师，擅长点评候选人对面试题的回答。请用中文，客观、有建设性。

面试题目：{{questionTitle}}

题目描述：
{{questionBody}}

参考答案：
{{referenceAnswer}}

候选人的回答：
{{userAnswer}}

请你完成以下点评，严格按格式输出：
【得分】给出 0-100 的整数，单独一行，格式为「得分：XX」
【评价】对照参考答案，指出候选人回答的优点与不足（3-5 句）
【改进建议】给出 1-3 条具体可操作的改进建议
不要重复抄写参考答案全文，聚焦在对候选人这次回答的针对性反馈上。`,
  },
  "import.extract.text": {
    key: "import.extract.text",
    title: "文本导入题目提取 Prompt",
    description: "从粘贴文本中识别面试题,必须输出 JSON 数组。",
    category: "import",
    variables: [],
    content: `你是一个面试题整理助手。请从我给你的内容里识别出所有「面试题」，逐题提取。

严格按以下 JSON 数组格式输出，不要输出任何额外说明文字、不要用 markdown 代码块：
[
  {
    "question": "题目的完整文字（一道题问什么）",
    "answer": "如果原文里有这道题的答案/解析就原样提取，没有就留空字符串",
    "difficulty": "简单 或 中等 或 困难，判断不出就留空字符串"
  }
]

规则：
1. 一道题一个对象。如果有多道题，数组里就有多个对象。
2. 只提取面试题本身，忽略页码、水印、广告、无关的标题装饰文字。
3. answer 只在原文确实给出答案时才填；原文只有题目没有答案时，answer 必须是空字符串（后续会自动补）。
4. 如果内容里没有任何可识别的面试题，返回空数组 []。`,
  },
  "import.extract.images": {
    key: "import.extract.images",
    title: "图片导入题目提取 Prompt",
    description: "从图片中识别面试题,必须输出 JSON 数组。图片由代码以 image_url 传入。",
    category: "import",
    variables: [],
    content: `你是一个面试题整理助手。请从我给你的图片内容里识别出所有「面试题」，逐题提取。

严格按以下 JSON 数组格式输出，不要输出任何额外说明文字、不要用 markdown 代码块：
[
  {
    "question": "题目的完整文字（一道题问什么）",
    "answer": "如果图片里有这道题的答案/解析就原样提取，没有就留空字符串",
    "difficulty": "简单 或 中等 或 困难，判断不出就留空字符串"
  }
]

规则：
1. 一道题一个对象。如果有多道题，数组里就有多个对象。
2. 只提取面试题本身，忽略页码、水印、广告、无关的标题装饰文字。
3. answer 只在图片里确实给出答案时才填；只有题目没有答案时，answer 必须是空字符串（后续会自动补）。
4. 如果内容里没有任何可识别的面试题，返回空数组 []。`,
  },
  "import.question.classify": {
    key: "import.question.classify",
    title: "导入题目自动分类 Prompt",
    description: "把导入题归到已有话题或建议新话题。topicId/parentId 必须来自真实列表。",
    category: "import",
    variables: ["topicTree", "questionBody"],
    content: `你是一个面试题分类助手。用户有一棵私人的话题分类树，你要为一道题决定它应该归到哪个分类。

用户现有的话题分类（每行是一个可选节点，路径用 / 表示层级）：
{{topicTree}}

请为这道题做出分类决策，严格按以下 JSON 之一输出，不要任何额外说明、不要 markdown：

1) 如果现有分类里有合适的，选最贴切的一个：
{ "kind": "existing", "topicId": "上面列表里的某个 id" }

2) 如果现有分类都不合适，但你能判断它该属于某个现有节点之下的新子分类：
{ "kind": "new", "name": "新分类名（简短，如 消息队列）", "parentId": "上面列表里某个 id 作为父节点" }

3) 如果现有分类都不合适、且应该作为一个新的顶级分类：
{ "kind": "new", "name": "新分类名", "parentId": null }

4) 如果你实在判断不出合适的分类：
{ "kind": "fallback" }

只输出一个 JSON 对象。topicId 和 parentId 必须是上面列表里真实存在的 id，不要编造。

题目：{{questionBody}}`,
  },
  "import.answer.generate": {
    key: "import.answer.generate",
    title: "导入题目补答案 Prompt",
    description: "为导入时没有答案的面试题生成参考答案。",
    category: "import",
    variables: ["questionBody"],
    content: `你是一位资深技术面试官。请为下面这道面试题写一份准确、有条理的参考答案，用中文。
要求：直接给出答案内容，不要重复题目，不要寒暄，不要用「答：」之类的前缀。条理清晰，覆盖关键点，篇幅适中。

面试题：{{questionBody}}`,
  },
  "admin.model.test": {
    key: "admin.model.test",
    title: "模型连通测试 Prompt",
    description: "后台测试模型配置时发送的最小提示词。",
    category: "admin",
    variables: [],
    content: "请只回复 OK",
  },
  "paper.answer.evaluate": {
    key: "paper.answer.evaluate",
    title: "试卷答案点评 Prompt",
    description: "点评试卷中的单题回答并输出得分。请保留「得分：XX」格式。",
    category: "practice",
    variables: ["questionTitle", "questionBody", "referenceAnswer", "userAnswer"],
    content: `你是一位严谨的技术面试官兼导师，正在评阅一份试卷。请用中文，客观、有建设性地点评下面这道题的回答。

题目：{{questionTitle}}

题目描述：
{{questionBody}}

参考答案：
{{referenceAnswer}}

考生的回答：
{{userAnswer}}

请你完成以下点评，严格按格式输出：
【得分】给出 0-100 的整数，单独一行，格式为「得分：XX」
【评价】对照参考答案，指出考生回答的优点与不足（3-5 句）
【改进建议】给出 1-3 条具体可操作的改进建议
不要重复抄写参考答案全文，聚焦在对考生这次回答的针对性反馈上。`,
  },
};

export function isPromptKey(value: unknown): value is PromptKey {
  return typeof value === "string" && PROMPT_KEYS.includes(value as PromptKey);
}

export function renderTemplate(template: string, variables: Record<string, unknown>, allowed: string[]): string {
  const allow = new Set(allowed);
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (match, key) => {
    if (!allow.has(key)) return match;
    const value = variables[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

function parseVariables(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function buildSafe(row: {
  id: string;
  key: string;
  title: string;
  description: string;
  category: string;
  content: string;
  variables: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SafeAiPromptConfig {
  const key = row.key as PromptKey;
  const fallback = DEFAULT_PROMPTS[key];
  return {
    key,
    id: row.id,
    title: row.title,
    description: row.description,
    category: fallback?.category ?? "admin",
    content: row.content,
    variables: parseVariables(row.variables),
    enabled: row.enabled,
    isCustomized: fallback ? row.content !== fallback.content : true,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function sanitizeAiPromptConfig(row: Parameters<typeof buildSafe>[0]) {
  return buildSafe(row);
}

export async function syncDefaultPrompts() {
  const { prisma } = await import("./db");
  const out = [];
  for (const prompt of Object.values(DEFAULT_PROMPTS)) {
    const row = await prisma.aiPromptConfig.upsert({
      where: { key: prompt.key },
      update: {
        title: prompt.title,
        description: prompt.description,
        category: prompt.category,
        variables: JSON.stringify(prompt.variables),
      },
      create: {
        key: prompt.key,
        title: prompt.title,
        description: prompt.description,
        category: prompt.category,
        content: prompt.content,
        variables: JSON.stringify(prompt.variables),
        enabled: true,
      },
    });
    out.push(row);
  }
  return out.map(buildSafe);
}

export async function getPromptConfig(key: PromptKey) {
  try {
    const { prisma } = await import("./db");
    const row = await prisma.aiPromptConfig.findUnique({ where: { key } });
    const fallback = DEFAULT_PROMPTS[key];
    if (!row || !row.enabled || !row.content.trim()) return fallback;
    return {
      ...fallback,
      content: row.content,
      variables: parseVariables(row.variables),
    };
  } catch {
    return DEFAULT_PROMPTS[key];
  }
}

export async function renderPrompt(key: PromptKey, variables: Record<string, unknown> = {}) {
  const prompt = await getPromptConfig(key);
  return renderTemplate(prompt.content, variables, prompt.variables);
}
