import type { NextRequest } from "next/server";

// 从请求头提取客户端 IP：优先 x-forwarded-for（腾讯云 SLB 会带），兜底 x-real-ip
export function getClientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return undefined;
}
