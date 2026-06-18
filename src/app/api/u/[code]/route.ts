import { NextRequest, NextResponse } from "next/server";
import { getPublicProfileData } from "@/lib/visibility";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const data = await getPublicProfileData(code);
    if (!data) {
      return NextResponse.json({ error: "分享码无效" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
