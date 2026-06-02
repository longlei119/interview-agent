import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isVisionConfigured } from "@/lib/deepseek";
import { ImportForm } from "@/components/ImportForm";

export default async function ImportQuestionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/practice/import");

  if (!user.canCreate) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/practice"
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-brand-600"
        >
          ← 返回我的题库
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-700">
            你的加题权限已被管理员关闭，暂时无法导入题目。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/practice"
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-brand-600"
      >
        ← 返回我的题库
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">导入题目</h1>
      <p className="mb-6 text-sm text-gray-500">
        粘贴文本或上传图片，AI 会自动识别出面试题、归类，并为没有答案的题补上参考答案。
        识别结果会直接进入你的题库（默认私有），AI 补的答案会标注「🤖 AI 生成答案」方便你核对。
      </p>
      <ImportForm visionConfigured={isVisionConfigured()} />
    </div>
  );
}
