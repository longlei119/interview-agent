import { NextResponse } from "next/server";
import { isAsrConfigured } from "@/lib/deepseek";

export async function GET() {
  try {
    return NextResponse.json({ configured: await isAsrConfigured() });
  } catch {
    return NextResponse.json({ configured: false });
  }
}
