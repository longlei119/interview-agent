import { QuestionAdminControls } from "./QuestionAdminControls";
import { Badge, EmptyState, Icon } from "@/components/ui";

interface AdminQuestion {
  id: string;
  title: string;
  direction: string;
  difficulty: string;
  isDelisted: boolean;
  manualHeat: number;
  cloneCount: number;
  likeCount: number;
  viewCount: number;
  heat: number;
  owner: { name: string };
}

interface Props {
  questions: AdminQuestion[];
}

export function QuestionManagementPanel({ questions }: Props) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-base font-semibold text-ink">题库管理</h3>
        <p className="mt-1 text-sm text-muted">
          管理题库广场里的公开题目、下架状态和人工热度。
        </p>
      </div>
      {questions.length === 0 ? (
        <EmptyState icon="compass" title="暂无公开题目" desc="用户公开题目后会显示在这里" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="divide-y divide-line">
            {questions.map((q) => (
              <div key={q.id} className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="brand">{q.direction}</Badge>
                  <Badge difficulty={q.difficulty as "简单" | "中等" | "困难"} />
                  {q.isDelisted && <Badge variant="gray">已下架</Badge>}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
                    <Icon name="flame" size={12} className="text-amber-500" />
                    热度 {q.heat}
                  </span>
                </div>
                <div className="font-medium text-ink">{q.title}</div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="user" size={11} />
                    {q.owner.name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="eye" size={11} />
                    {q.viewCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="heart" size={11} />
                    {q.likeCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="download" size={11} />
                    {q.cloneCount}
                  </span>
                </div>
                <QuestionAdminControls
                  questionId={q.id}
                  isDelisted={q.isDelisted}
                  manualHeat={q.manualHeat}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
