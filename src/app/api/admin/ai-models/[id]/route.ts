import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  parseSortOrder,
  sanitizeAiModelConfig,
  validateBaseUrl,
} from "@/lib/ai-model-config";

function authError(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  const status = msg === "FORBIDDEN" ? 403 : 401;
  return NextResponse.json({ error: status === 403 ? "无权限" : "未登录" }, { status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (e) {
    return authError(e);
  }

  const { id } = await params;
  const existing = await prisma.aiModelConfig.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "模型配置不存在" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
    data.name = name;
  }
  if (body.baseUrl !== undefined) {
    const baseUrl = typeof body.baseUrl === "string" ? validateBaseUrl(body.baseUrl) : null;
    if (!baseUrl) return NextResponse.json({ error: "Base URL 无效" }, { status: 400 });
    data.baseUrl = baseUrl;
  }
  if (body.model !== undefined) {
    const model = typeof body.model === "string" ? body.model.trim() : "";
    if (!model) return NextResponse.json({ error: "模型名不能为空" }, { status: 400 });
    data.model = model;
  }
  if (body.apiKey !== undefined) {
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (apiKey) data.apiKey = apiKey;
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled 必须是布尔值" }, { status: 400 });
    }
    data.enabled = body.enabled;
  }
  if (body.sortOrder !== undefined) {
    const sortOrder = parseSortOrder(body.sortOrder);
    if (sortOrder === null) return NextResponse.json({ error: "排序必须是数字" }, { status: 400 });
    data.sortOrder = sortOrder;
  }

  const setDefault = body.isDefault === true;
  if (body.isDefault !== undefined && typeof body.isDefault !== "boolean") {
    return NextResponse.json({ error: "isDefault 必须是布尔值" }, { status: 400 });
  }
  if (body.isDefault === false && existing.isDefault) {
    return NextResponse.json({ error: "请改设同组其他模型为默认，而不是直接取消默认" }, { status: 400 });
  }
  if (!setDefault && Object.keys(data).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (setDefault) {
      await tx.aiModelConfig.updateMany({
        where: { role: existing.role },
        data: { isDefault: false },
      });
      data.isDefault = true;
    }
    return tx.aiModelConfig.update({ where: { id }, data });
  });

  return NextResponse.json({ ok: true, item: sanitizeAiModelConfig(updated) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (e) {
    return authError(e);
  }

  const { id } = await params;
  const existing = await prisma.aiModelConfig.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "模型配置不存在" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.aiModelConfig.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.aiModelConfig.findFirst({
        where: { role: existing.role, enabled: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      if (next) {
        await tx.aiModelConfig.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
