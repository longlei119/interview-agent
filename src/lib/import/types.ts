// 「导入题目」流水线的共享类型。

// 从图片/文本里识别出的一道题（入库前的中间形态）。
export interface ExtractedQuestion {
  title: string; // = body，标题和题目内容存同样内容（产品决策）
  body: string;
  referenceAnswer: string; // 原文没答案则为空字符串
  difficulty?: string; // AI 顺带判，无效/缺省时入库兜底「中等」
}

// 分类阶段对一道题的归属决策。
export type ClassifyDecision =
  | { kind: "existing"; topicId: string } // 命中用户现有话题节点
  | { kind: "new"; name: string; parentId: string | null } // 新建节点，挂在 parentId 下（null = 挂兜底根）
  | { kind: "fallback" }; // 判断不出 → 进兜底根「模型生成」
