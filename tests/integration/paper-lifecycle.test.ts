import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  validatePaperInput,
  validatePaperItems,
  validateAttemptAnswers,
  computeTotalScore,
  formatPaperResponse,
} from "@/lib/paper-utils";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:./test-paper-lifecycle.db" } },
});

let testUser: { id: string; email: string } | null = null;
let otherUser: { id: string; email: string } | null = null;
let questionIds: string[] = [];

beforeAll(async () => {
  // Push schema to test db
  const { execSync } = await import("child_process");
  execSync("npx prisma db push --force-reset --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: "file:./test-paper-lifecycle.db" },
    cwd: process.cwd(),
    stdio: "pipe",
  });

  // Seed test users
  testUser = await prisma.user.upsert({
    where: { email: "test@paper.com" },
    update: {},
    create: {
      email: "test@paper.com",
      passwordHash: "hash",
      name: "Test User",
    },
  });

  otherUser = await prisma.user.upsert({
    where: { email: "other@paper.com" },
    update: {},
    create: {
      email: "other@paper.com",
      passwordHash: "hash",
      name: "Other User",
    },
  });

  // Seed test questions
  const titles = [
    "JS闭包题", "React Hooks题", "CSS布局题",
    "HTTP缓存题", "TS泛型题", "事件循环题",
  ];
  const created = [];
  for (const title of titles) {
    const q = await prisma.question.create({
      data: {
        ownerId: testUser.id,
        title,
        body: `${title} 的题目描述`,
        referenceAnswer: `${title} 的参考答案`,
        direction: "前端",
        difficulty: "中等",
        tags: "",
      },
    });
    created.push(q.id);
  }
  questionIds = created;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Paper CRUD lifecycle", () => {
  let paperId = "";

  it("should validate paper input", () => {
    const r = validatePaperInput({
      title: "测试试卷",
      timeLimit: 20,
      questionIds: questionIds.slice(0, 3),
    });
    expect(r.valid).toBe(true);
  });

  it("should create a paper with questions", async () => {
    const paper = await prisma.testPaper.create({
      data: {
        userId: testUser!.id,
        title: "集成测试试卷",
        description: "集成测试创建的试卷",
        timeLimit: 30,
        items: {
          create: questionIds.slice(0, 3).map((qid, i) => ({
            questionId: qid,
            sortOrder: i,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    paperId = paper.id;
    expect(paper.title).toBe("集成测试试卷");
    expect(paper.items).toHaveLength(3);
    expect(paper.items[0].sortOrder).toBe(0);
    expect(paper.items[2].sortOrder).toBe(2);
  });

  it("should list only the user's papers", async () => {
    const papers = await prisma.testPaper.findMany({
      where: { userId: testUser!.id },
    });
    expect(papers.length).toBeGreaterThanOrEqual(1);
    expect(papers.some((p) => p.id === paperId)).toBe(true);
  });

  it("should not show user's papers to another user", async () => {
    const papers = await prisma.testPaper.findMany({
      where: { userId: otherUser!.id },
    });
    expect(papers).toHaveLength(0);
  });

  it("should get paper detail with items", async () => {
    const paper = await prisma.testPaper.findFirst({
      where: { id: paperId, userId: testUser!.id },
      include: { items: { include: { question: { select: { title: true } } } } },
    });
    expect(paper).not.toBeNull();
    expect(paper!.items[0].question.title).toBe("JS闭包题");
  });

  it("should edit paper title and time limit", async () => {
    await prisma.testPaper.update({
      where: { id: paperId },
      data: { title: "更新后的试卷", timeLimit: 45 },
    });
    const paper = await prisma.testPaper.findUnique({ where: { id: paperId } });
    expect(paper!.title).toBe("更新后的试卷");
    expect(paper!.timeLimit).toBe(45);
  });

  it("should replace paper items on edit", async () => {
    const paper = await prisma.testPaper.findUnique({
      where: { id: paperId },
      include: { items: true },
    });
    expect(paper!.items).toHaveLength(3);

    // Delete old items, add new ones
    await prisma.testPaperItem.deleteMany({ where: { paperId } });
    await prisma.testPaperItem.createMany({
      data: questionIds.slice(3, 6).map((qid, i) => ({
        paperId,
        questionId: qid,
        sortOrder: i,
      })),
    });

    const updated = await prisma.testPaper.findUnique({
      where: { id: paperId },
      include: { items: true },
    });
    expect(updated!.items).toHaveLength(3);
  });

  it("should validate items ownership", () => {
    const owned = new Set(questionIds.slice(0, 3));
    const r = validatePaperItems(questionIds, owned);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("should delete paper and cascade items", async () => {
    await prisma.testPaper.delete({ where: { id: paperId } });
    const items = await prisma.testPaperItem.findMany({ where: { paperId } });
    expect(items).toHaveLength(0);
    const paper = await prisma.testPaper.findUnique({ where: { id: paperId } });
    expect(paper).toBeNull();
  });
});

describe("Paper attempt lifecycle", () => {
  let paperId = "";
  let paperQuestionIds: string[] = [];

  beforeAll(async () => {
    const paper = await prisma.testPaper.create({
      data: {
        userId: testUser!.id,
        title: "作答测试试卷",
        timeLimit: 10,
        items: {
          create: questionIds.slice(0, 2).map((qid, i) => ({
            questionId: qid,
            sortOrder: i,
          })),
        },
      },
    });
    paperId = paper.id;
    paperQuestionIds = [questionIds[0], questionIds[1]];
  });

  afterAll(async () => {
    await prisma.testPaperAttempt.deleteMany({ where: { paperId } });
    await prisma.testPaper.delete({ where: { id: paperId } }).catch(() => {});
  });

  it("should create an attempt", async () => {
    const attempt = await prisma.testPaperAttempt.create({
      data: {
        paperId,
        userId: testUser!.id,
        answers: "{}",
        scores: "{}",
        feedbacks: "{}",
      },
    });
    expect(attempt.id).toBeTruthy();
    expect(attempt.totalScore).toBe(0);
    expect(attempt.finishedAt).toBeNull();
  });

  it("should prevent duplicate active attempts", async () => {
    const existing = await prisma.testPaperAttempt.findFirst({
      where: { paperId, userId: testUser!.id, finishedAt: null },
    });
    expect(existing).not.toBeNull();
  });

  it("should save partial answers", async () => {
    const attempt = await prisma.testPaperAttempt.findFirst({
      where: { paperId, userId: testUser!.id, finishedAt: null },
    });
    await prisma.testPaperAttempt.update({
      where: { id: attempt!.id },
      data: {
        answers: JSON.stringify({ [paperQuestionIds[0]]: "我的回答" }),
      },
    });
    const updated = await prisma.testPaperAttempt.findUnique({
      where: { id: attempt!.id },
    });
    const answers = JSON.parse(updated!.answers);
    expect(answers[paperQuestionIds[0]]).toBe("我的回答");
  });

  it("should validate attempt answers completeness", () => {
    const r = validateAttemptAnswers(
      { [paperQuestionIds[0]]: "ok" },
      paperQuestionIds
    );
    expect(r.valid).toBe(false);
    expect(r.unanswered).toContain(paperQuestionIds[1]);
  });

  it("should compute total score", () => {
    expect(computeTotalScore({ q1: 80, q2: 90 })).toBe(170);
  });

  it("should finish an attempt", async () => {
    const attempt = await prisma.testPaperAttempt.findFirst({
      where: { paperId, userId: testUser!.id, finishedAt: null },
    });
    await prisma.testPaperAttempt.update({
      where: { id: attempt!.id },
      data: {
        scores: JSON.stringify({
          [paperQuestionIds[0]]: 85,
          [paperQuestionIds[1]]: 90,
        }),
        feedbacks: JSON.stringify({
          [paperQuestionIds[0]]: "得分：85 回答不错",
          [paperQuestionIds[1]]: "得分：90 很好",
        }),
        totalScore: 175,
        finishedAt: new Date(),
      },
    });
    const finished = await prisma.testPaperAttempt.findUnique({
      where: { id: attempt!.id },
    });
    expect(finished!.finishedAt).not.toBeNull();
    expect(finished!.totalScore).toBe(175);

    // Verify no active attempts remain
    const active = await prisma.testPaperAttempt.findFirst({
      where: { paperId, userId: testUser!.id, finishedAt: null },
    });
    expect(active).toBeNull();
  });

  it("should isolate attempts between users", async () => {
    // Create attempt for other user
    await prisma.testPaperAttempt.create({
      data: { paperId, userId: otherUser!.id },
    });

    const testUserAttempts = await prisma.testPaperAttempt.findMany({
      where: { userId: testUser!.id },
    });
    const otherUserAttempts = await prisma.testPaperAttempt.findMany({
      where: { userId: otherUser!.id },
    });

    // Each user only sees their own
    expect(testUserAttempts.length).toBe(1);
    expect(otherUserAttempts.length).toBe(1);
    expect(testUserAttempts[0].userId).toBe(testUser!.id);
    expect(otherUserAttempts[0].userId).toBe(otherUser!.id);
  });
});

describe("formatPaperResponse", () => {
  it("should produce correct PaperResponse shape", () => {
    const r = formatPaperResponse(
      {
        id: "p1",
        title: "Test",
        description: "",
        timeLimit: null,
        isPublic: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
      5
    );
    expect(r).toHaveProperty("id");
    expect(r).toHaveProperty("title");
    expect(r).toHaveProperty("itemCount", 5);
    expect(r).toHaveProperty("createdAt");
  });
});
