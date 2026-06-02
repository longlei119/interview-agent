import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { QuestionForm } from "@/components/QuestionForm";

export default async function NewQuestionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/practice/new");

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
            你的加题权限已被管理员关闭，暂时无法新建题目。
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
      <h1 className="mb-1 text-2xl font-bold text-gray-900">新建题目</h1>
      <p className="mb-6 text-sm text-gray-500">
        题目默认私有，只有你自己能看到。创建后可在详情页设为公开，分享到题库广场。
      </p>
      <QuestionForm />
    </div>
  );
}
