import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  buildEnvFallbacks,
  isModelRole,
  parseSortOrder,
  sanitizeAiModelConfig,
  validateBaseUrl,
} from "@/lib/ai-model-config";

function authError(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  const status = msg === "FORBIDDEN" ? 403 : 401;
  return NextResponse.json({ error: status === 403 ? "无权限" : "未登录" }, { status });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return authError(e);
  }

  const rows = await prisma.aiModelConfig.findMany({
    orderBy: [{ role: "asc" }, { isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    items: rows.map(sanitizeAiModelConfig),
    envFallbacks: await buildEnvFallbacks(),
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return authError(e);
  }

  const body = await req.json();
  if (!isModelRole(body.role)) {
    return NextResponse.json({ error: "无效的模型分组" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const baseUrl = typeof body.baseUrl === "string" ? validateBaseUrl(body.baseUrl) : null;
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const sortOrder = parseSortOrder(body.sortOrder);

  if (!name) return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  if (!baseUrl) return NextResponse.json({ error: "Base URL 无效" }, { status: 400 });
  if (!model) return NextResponse.json({ error: "模型名不能为空" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "API Key 不能为空" }, { status: 400 });
  if (sortOrder === null) return NextResponse.json({ error: "排序必须是数字" }, { status: 400 });

  const shouldDefault = Boolean(body.isDefault) ||
    (await prisma.aiModelConfig.count({ where: { role: body.role } })) === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (shouldDefault) {
      await tx.aiModelConfig.updateMany({
        where: { role: body.role },
        data: { isDefault: false },
      });
    }
    return tx.aiModelConfig.create({
      data: {
        role: body.role,
        name,
        baseUrl,
        model,
        apiKey,
        enabled: typeof body.enabled === "boolean" ? body.enabled : true,
        isDefault: shouldDefault,
        sortOrder,
      },
    });
  });

  return NextResponse.json({ ok: true, item: sanitizeAiModelConfig(created) });
}
