import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PracticePanel } from "@/components/PracticePanel";

const difficultyColor: Record<string, string> = {
  简单: "bg-green-100 text-green-700",
  中等: "bg-amber-100 text-amber-700",
  困难: "bg-red-100 text-red-700",
};

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) notFound();

  return (
    <div>
      <Link
        href="/practice"
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-brand-600"
      >
        ← 返回题库
      </Link>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
            {question.category}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
              difficultyColor[question.difficulty] || "bg-gray-100 text-gray-600"
            }`}
          >
            {question.difficulty}
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{question.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
          {question.body}
        </p>
      </div>

      <PracticePanel questionId={question.id} referenceAnswer={question.referenceAnswer} />
    </div>
  );
}
