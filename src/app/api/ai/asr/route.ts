import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { transcribeAudio } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!user.canCreate) {
    return NextResponse.json({ error: "你的权限已被关闭" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "未收到音频文件" }, { status: 400 });
    }

    const text = await transcribeAudio(file);
    if (!text) {
      return NextResponse.json({ error: "未识别到内容" }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "语音识别调用失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
