import { NextResponse } from "next/server";
import { isMailConfigured } from "@/lib/mail";

// 前端注册页判断是否显示验证码入口（无需登录）
export async function GET() {
  return NextResponse.json({ configured: isMailConfigured() });
}
