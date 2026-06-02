// 面试方向固定列表。用户和题目都从中选一个方向。
export const DIRECTIONS = [
  "前端",
  "后端",
  "客户端",
  "算法",
  "测试",
  "产品",
  "其他",
] as const;

export type Direction = (typeof DIRECTIONS)[number];

export function isValidDirection(d: string): d is Direction {
  return (DIRECTIONS as readonly string[]).includes(d);
}

export const DIFFICULTIES = ["简单", "中等", "困难"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export function isValidDifficulty(d: string): d is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(d);
}
