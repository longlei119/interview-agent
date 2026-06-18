import { describe, it, expect, vi } from "vitest";
import { canResetShareCode, timeUntilReset } from "@/lib/share-code";

describe("canResetShareCode", () => {
  it("应允许重置：距上次重置已超过 24 小时", () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(canResetShareCode(past)).toBe(true);
  });

  it("应阻止重置：距上次重置不足 24 小时", () => {
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000);
    expect(canResetShareCode(recent)).toBe(false);
  });

  it("应允许重置：恰好 24 小时", () => {
    const exact = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(canResetShareCode(exact)).toBe(true);
  });
});

describe("timeUntilReset", () => {
  it("计算剩余等待时间（毫秒）", () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const remaining = timeUntilReset(oneHourAgo);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(23 * 60 * 60 * 1000);
  });

  it("已过冷却期时返回 0", () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(timeUntilReset(past)).toBe(0);
  });
});
