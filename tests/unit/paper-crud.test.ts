import { describe, it, expect } from "vitest";
import {
  validatePaperInput,
  validatePaperItems,
  formatPaperResponse,
  parseIsPublic,
} from "@/lib/paper-utils";

describe("validatePaperInput", () => {
  it("should reject empty title", () => {
    const r = validatePaperInput({ questionIds: ["q1"] });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("标题"))).toBe(true);
  });

  it("should reject title over 200 chars", () => {
    const r = validatePaperInput({ title: "x".repeat(201), questionIds: ["q1"] });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("200"))).toBe(true);
  });

  it("should accept title of exactly 200 chars", () => {
    const r = validatePaperInput({ title: "x".repeat(200), questionIds: ["q1"] });
    expect(r.valid).toBe(true);
  });

  it("should reject zero timeLimit", () => {
    const r = validatePaperInput({ title: "Test", timeLimit: 0, questionIds: ["q1"] });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("时间"))).toBe(true);
  });

  it("should reject negative timeLimit", () => {
    const r = validatePaperInput({ title: "Test", timeLimit: -5, questionIds: ["q1"] });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("时间"))).toBe(true);
  });

  it("should reject non-integer timeLimit", () => {
    const r = validatePaperInput({ title: "Test", timeLimit: 3.5, questionIds: ["q1"] });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("时间"))).toBe(true);
  });

  it("should accept null timeLimit (unlimited)", () => {
    const r = validatePaperInput({ title: "Test", timeLimit: null, questionIds: ["q1"] });
    expect(r.valid).toBe(true);
  });

  it("should accept positive integer timeLimit", () => {
    const r = validatePaperInput({ title: "Test", timeLimit: 30, questionIds: ["q1"] });
    expect(r.valid).toBe(true);
  });

  it("should reject empty questionIds array", () => {
    const r = validatePaperInput({ title: "Test", questionIds: [] });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("题目"))).toBe(true);
  });

  it("should reject missing questionIds", () => {
    const r = validatePaperInput({ title: "Test" });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("题目"))).toBe(true);
  });

  it("should accept valid input with all fields", () => {
    const r = validatePaperInput({
      title: "前端摸底卷",
      timeLimit: 30,
      questionIds: ["q1", "q2"],
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
});

describe("validatePaperItems", () => {
  it("should reject ids not owned by user", () => {
    const r = validatePaperItems(["q1", "q2"], new Set(["q1"]));
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("q2"))).toBe(true);
  });

  it("should accept all owned ids", () => {
    const r = validatePaperItems(["q1", "q2"], new Set(["q1", "q2", "q3"]));
    expect(r.valid).toBe(true);
  });

  it("should accept empty set with empty ids", () => {
    const r = validatePaperItems([], new Set());
    expect(r.valid).toBe(true);
  });
});

describe("formatPaperResponse", () => {
  it("should format correctly", () => {
    const d = new Date("2026-06-15T10:00:00Z");
    const updated = new Date("2026-06-16T10:00:00Z");
    const r = formatPaperResponse(
      {
        id: "p1",
        title: "Test Paper",
        description: "Desc",
        timeLimit: 30,
        isPublic: false,
        createdAt: d,
        updatedAt: updated,
      },
      5
    );
    expect(r).toEqual({
      id: "p1",
      title: "Test Paper",
      description: "Desc",
      timeLimit: 30,
      isPublic: false,
      itemCount: 5,
      createdAt: d.toISOString(),
      updatedAt: updated.toISOString(),
    });
  });

  it("should handle null timeLimit", () => {
    const r = formatPaperResponse(
      {
        id: "p2",
        title: "No Limit",
        description: "",
        timeLimit: null,
        isPublic: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
      0
    );
    expect(r.timeLimit).toBeNull();
    expect(r.isPublic).toBe(true);
    expect(r.itemCount).toBe(0);
  });
});

describe("parseIsPublic", () => {
  it("should parse string 'true'", () => {
    expect(parseIsPublic("true")).toBe(true);
  });

  it("should parse string 'false'", () => {
    expect(parseIsPublic("false")).toBe(false);
  });

  it("should return boolean as-is", () => {
    expect(parseIsPublic(true)).toBe(true);
    expect(parseIsPublic(false)).toBe(false);
  });

  it("should return false for unknown values", () => {
    expect(parseIsPublic("yes")).toBe(false);
    expect(parseIsPublic(undefined)).toBe(false);
    expect(parseIsPublic(null)).toBe(false);
    expect(parseIsPublic(1)).toBe(false);
  });
});
