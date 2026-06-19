import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendCode, type CodePurpose } from "@/lib/email-code";
import { getClientIp } from "@/lib/client-ip";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email, purpose } = await req.json();

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }
    if (purpose !== "register" && purpose !== "reset") {
      return NextResponse.json({ error: "用途参数无效" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const ip = getClientIp(req);
    const result = await sendCode({
      email,
      purpose: purpose as CodePurpose,
      ip,
      existingUser,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "发送验证码失败，请稍后重试" }, { status: 500 });
  }
}
