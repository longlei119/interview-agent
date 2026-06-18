import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProfileData } from "@/lib/visibility";
import { Badge, EmptyState, Icon } from "@/components/ui";
import { SyncButtons } from "@/components/SyncButtons";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getPublicProfileData(code);
  if (!data) notFound();

  const topicsByParent = new Map<string | null, typeof data.topics>();
  for (const t of data.topics) {
    const key = t.parentId ?? null;
    if (!topicsByParent.has(key)) topicsByParent.set(key, []);
    topicsByParent.get(key)!.push(t);
  }

  function renderTopics(parentId: string | null, depth: number = 0) {
    const children = topicsByParent.get(parentId) ?? [];
    return children.map((t) => (
      <div key={t.id} style={{ marginLeft: depth * 16 }}>
        <div className="flex items-center gap-2 py-1.5">
          <Icon name="file" size={14} className="text-muted" />
          <span className="text-sm">{t.name}</span>
          <span className="text-xs text-muted">({t.questionCount} 题)</span>
        </div>
        {renderTopics(t.id, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-ink">{data.user.name} 的题库</h1>
        <p className="mt-1 text-sm text-muted">
          公开 {data.stats.topicCount} 个目录 · {data.stats.questionCount} 道题 · {data.stats.paperCount} 张试卷
        </p>
      </div>

      <SyncButtons code={code} />

      {data.stats.topicCount === 0 && data.stats.paperCount === 0 ? (
        <EmptyState
          icon="book"
          title="这里还没有公开内容"
          desc="该用户暂未公开任何题库或试卷。"
        />
      ) : (
        <div className="space-y-8">
          {data.stats.topicCount > 0 && (
            <section>
              <h2 className="font-semibold text-ink mb-3 flex items-center gap-2">
                <Icon name="list" size={16} />
                目录结构
              </h2>
              <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
                {renderTopics(null)}
              </div>
            </section>
          )}

          {data.stats.questionCount > 0 && (
            <section>
              <h2 className="font-semibold text-ink mb-3 flex items-center gap-2">
                <Icon name="book" size={16} />
                公开题目
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.questions.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-line bg-surface p-4 shadow-card"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <Badge difficulty={q.difficulty as "简单" | "中等" | "困难"} />
                      <Badge variant="gray">{q.direction}</Badge>
                    </div>
                    <h3 className="font-semibold text-ink">{q.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.tags.split(",").filter(Boolean).map((t) => (
                        <span key={t} className="text-xs text-muted">#{t.trim()}</span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-0.5">
                        <Icon name="eye" size={12} /> {q.viewCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Icon name="heart" size={12} /> {q.likeCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Icon name="download" size={12} /> {q.cloneCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.stats.paperCount > 0 && (
            <section>
              <h2 className="font-semibold text-ink mb-3 flex items-center gap-2">
                <Icon name="file" size={16} />
                公开试卷
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.papers.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-line bg-surface p-4 shadow-card"
                  >
                    <h3 className="font-semibold text-ink">{p.title}</h3>
                    {p.description && (
                      <p className="mt-1 text-sm text-muted line-clamp-2">{p.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-0.5">
                        <Icon name="list" size={12} /> {p.questionCount} 题
                      </span>
                      {p.timeLimit && (
                        <span className="flex items-center gap-0.5">
                          <Icon name="clock" size={12} /> {p.timeLimit} 分钟
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
