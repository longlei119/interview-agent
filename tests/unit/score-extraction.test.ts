import { describe, it, expect } from "vitest";

// Replicating the existing extractEvalScore pattern from prompts.ts
function extractEvalScore(text: string): number {
  const match = text.match(/得分[：:]\s*(\d{1,3})/);
  if (!match) return 0;
  const n = parseInt(match[1], 10);
  return Math.max(0, Math.min(100, n));
}

function extractPaperTotalScore(
  scoresText: string
): { extracted: boolean; total: number } {
  const match = scoresText.match(/总分[：:]\s*(\d{1,4})/);
  if (!match) return { extracted: false, total: 0 };
  return { extracted: true, total: parseInt(match[1], 10) };
}

describe("extractEvalScore", () => {
  it("should extract score from '得分：85'", () => {
    expect(extractEvalScore("得分：85")).toBe(85);
  });

  it("should extract score from '得分:90' (half-width colon)", () => {
    expect(extractEvalScore("得分:90")).toBe(90);
  });

  it("should extract score with extra spaces '得分：  100'", () => {
    expect(extractEvalScore("得分：  100")).toBe(100);
  });

  it("should return 0 for no match", () => {
    expect(extractEvalScore("回答不错")).toBe(0);
  });

  it("should clamp score above 100", () => {
    expect(extractEvalScore("得分：150")).toBe(100);
  });

  it("should clamp score below 0", () => {
    expect(extractEvalScore("得分：-5")).toBe(0);
  });

  it("should extract only the first match in multi-line text", () => {
    const text = `
【评价】回答很好
得分：85
【改进建议】
得分：90
    `;
    expect(extractEvalScore(text)).toBe(85);
  });

  it("should handle score in longer feedback text", () => {
    const feedback = `这道题回答得不错，对闭包的概念理解清晰。但从深度来看还有提升空间。

得分：78

建议多看看实际项目中的应用案例。`;
    expect(extractEvalScore(feedback)).toBe(78);
  });

  it("should handle score of 0 correctly", () => {
    expect(extractEvalScore("得分：0")).toBe(0);
  });

  it("should handle edge case: empty string", () => {
    expect(extractEvalScore("")).toBe(0);
  });
});

describe("extractPaperTotalScore", () => {
  it("should extract total from summary text", () => {
    expect(extractPaperTotalScore("总分：250").total).toBe(250);
  });

  it("should return false when no total found", () => {
    const r = extractPaperTotalScore("some text without score");
    expect(r.extracted).toBe(false);
    expect(r.total).toBe(0);
  });
});
