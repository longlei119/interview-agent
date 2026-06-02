// 热度计算：集中在此，便于以后调整权重。
// 分量分开存在 Question 表（manualHeat/cloneCount/likeCount/viewCount），此处只负责合成。

export interface HeatComponents {
  manualHeat: number;
  cloneCount: number;
  likeCount: number;
  viewCount: number;
}

const WEIGHTS = {
  manualHeat: 100, // 管理员手动值，权重最高 → 精选题天然靠前
  cloneCount: 10, // 被拉取
  likeCount: 5, // 被点赞
  viewCount: 1, // 被点开
};

export function computeHeat(c: HeatComponents): number {
  return (
    c.manualHeat * WEIGHTS.manualHeat +
    c.cloneCount * WEIGHTS.cloneCount +
    c.likeCount * WEIGHTS.likeCount +
    c.viewCount * WEIGHTS.viewCount
  );
}

// 管理员新建题目的默认手动热度
export const ADMIN_DEFAULT_MANUAL_HEAT = 50;
