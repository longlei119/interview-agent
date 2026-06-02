import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "请填写邮箱、密码和昵称" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    }

    // 用 ADMIN_EMAIL 注册的账号自动成为管理员
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const isAdmin = Boolean(adminEmail) && email.trim().toLowerCase() === adminEmail;

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
        role: isAdmin ? "admin" : "user",
      },
    });

    const token = await signToken({ userId: user.id, email: user.email, name: user.name });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
