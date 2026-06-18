import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isVisionConfigured } from "@/lib/deepseek";
import { ImportForm } from "@/components/ImportForm";
import { Card, HintBanner, Icon } from "@/components/ui";

export default async function ImportQuestionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/practice/import");

  if (!user.canCreate) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <Link
          href="/practice"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
        >
          <Icon name="arrow-left" size={16} />
          返回我的题库
        </Link>
        <Card padded>
          <HintBanner variant="warn">
            你的加题权限已被管理员关闭，暂时无法导入题目。
          </HintBanner>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <Link
        href="/practice"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand-600"
      >
        <Icon name="arrow-left" size={16} />
        返回我的题库
      </Link>
      <h1 className="font-serif text-2xl font-bold text-ink">导入题目</h1>
      <p className="mb-6 mt-1 text-sm leading-relaxed text-muted">
        粘贴文本或上传图片，AI 会自动识别出面试题、归类，并为没有答案的题补上参考答案。
        识别结果会直接进入你的题库（默认私有），AI 补的答案会标注「AI 生成答案」方便你核对。
      </p>
      <Card padded>
        <ImportForm visionConfigured={await isVisionConfigured()} />
      </Card>
    </div>
  );
}
