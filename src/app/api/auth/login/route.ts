import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "请填写邮箱和密码" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    const token = await signToken({ userId: user.id, email: user.email, name: user.name });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 500 });
  }
}
