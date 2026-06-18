import { describe, it, expect } from "vitest";
import { validateAttemptAnswers, computeTotalScore } from "@/lib/paper-utils";

describe("validateAttemptAnswers", () => {
  const paperQuestionIds = ["q1", "q2", "q3"];

  it("should return valid when all questions answered", () => {
    const answers = { q1: "answer 1", q2: "answer 2", q3: "answer 3" };
    const r = validateAttemptAnswers(answers, paperQuestionIds);
    expect(r.valid).toBe(true);
    expect(r.unanswered).toHaveLength(0);
  });

  it("should return invalid with unanswered question ids", () => {
    const answers = { q1: "answer 1" };
    const r = validateAttemptAnswers(answers, paperQuestionIds);
    expect(r.valid).toBe(false);
    expect(r.unanswered).toContain("q2");
    expect(r.unanswered).toContain("q3");
  });

  it("should treat empty string as unanswered", () => {
    const answers = { q1: "ok", q2: "   ", q3: "ok" };
    const r = validateAttemptAnswers(answers, paperQuestionIds);
    expect(r.valid).toBe(false);
    expect(r.unanswered).toContain("q2");
  });

  it("should treat whitespace-only as unanswered", () => {
    const answers = { q1: "\n\t", q2: "ok", q3: "ok" };
    const r = validateAttemptAnswers(answers, paperQuestionIds);
    expect(r.valid).toBe(false);
    expect(r.unanswered).toContain("q1");
  });

  it("should handle empty answers object", () => {
    const r = validateAttemptAnswers({}, paperQuestionIds);
    expect(r.valid).toBe(false);
    expect(r.unanswered).toEqual(paperQuestionIds);
  });

  it("should ignore extra answer keys not in paper", () => {
    const answers = { q1: "ok", q2: "ok", q3: "ok", q99: "extra" };
    const r = validateAttemptAnswers(answers, paperQuestionIds);
    expect(r.valid).toBe(true);
    expect(r.unanswered).toHaveLength(0);
  });
});

describe("computeTotalScore", () => {
  it("should sum scores correctly", () => {
    expect(computeTotalScore({ q1: 85, q2: 90, q3: 75 })).toBe(250);
  });

  it("should return 0 for empty scores", () => {
    expect(computeTotalScore({})).toBe(0);
  });

  it("should handle single question", () => {
    expect(computeTotalScore({ q1: 100 })).toBe(100);
  });

  it("should handle zero scores", () => {
    expect(computeTotalScore({ q1: 0, q2: 0 })).toBe(0);
  });
});
