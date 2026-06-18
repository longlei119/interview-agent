// SQLite → MySQL 数据迁移（一次性脚本）
// 用法：npx tsx scripts/migrate-sqlite-to-mysql.ts

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH = "prisma/dev.db";

function toDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const n = Number(v);
  if (Number.isNaN(n) || n === 0) return null;
  return new Date(n);
}

function bool(v: unknown): boolean {
  return v === 1 || v === true || v === "true";
}

function str(v: unknown): string {
  if (typeof v === "string") return v;
  return v == null ? "" : String(v);
}

type Row = Record<string, unknown>;

function fixDates(row: Row, fields: string[]): Row {
  const r = { ...row };
  for (const f of fields) {
    if (f in r) (r as any)[f] = toDate(r[f]);
  }
  return r;
}

async function upsertAll(
  mysql: PrismaClient,
  table: string,
  rows: Row[],
  dateFields: string[],
  boolFields: string[] = [],
) {
  const model = (mysql as any)[table];
  for (const r of rows) {
    const row = fixDates(r, dateFields);
    for (const f of boolFields) row[f] = bool(row[f]);
    await model.upsert({
      where: { id: row.id as string },
      update: row,
      create: row,
    });
  }
}

async function main() {
  const mysql = new PrismaClient();
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  const tables = [
    ["user", ["createdAt"], ["canCreate"]],
    ["topic", ["createdAt"]],
    ["question", ["createdAt", "deletedAt"], ["answerGeneratedByAi", "importedByAi", "isDelisted"]],
    ["testPaper", ["createdAt", "updatedAt"], ["isPublic"]],
    ["testPaperItem", []],
    ["aiModelConfig", ["createdAt", "updatedAt", "lastErrorAt"], ["enabled", "isDefault"]],
    ["aiPromptConfig", ["createdAt", "updatedAt"], ["enabled"]],
    ["questionLike", ["createdAt"]],
    ["questionView", ["createdAt"]],
    ["practiceRecord", ["createdAt"]],
    ["interviewSession", ["createdAt"]],
    ["interviewMessage", ["createdAt"]],
    ["testPaperAttempt", ["startedAt", "finishedAt"]],
  ] as const;

  for (const [table, dateFields, boolFields] of tables) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Row[];
    if (rows.length === 0) { console.log(`${table}: 0 条`); continue; }
    await upsertAll(mysql, table, rows, [...dateFields], boolFields ? [...boolFields] : []);
    console.log(`${table}: ${rows.length} 条`);
  }

  console.log("\n✅ 迁移完成！");
  sqlite.close();
  await mysql.$disconnect();
}

main().catch((e) => {
  console.error("❌ 迁移失败:", e);
  process.exit(1);
});
