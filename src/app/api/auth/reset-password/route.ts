import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { verifyCode } from "@/lib/email-code";

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "请填写邮箱、验证码和新密码" }, { status: 400 });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      // 不暴露邮箱是否注册，统一返回验证码错误
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    const ok = await verifyCode({ email, purpose: "reset", code: String(code) });
    if (!ok) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "重置失败，请稍后重试" }, { status: 500 });
  }
}
