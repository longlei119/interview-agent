import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Card } from "@/components/ui";
import { Icon, IconName } from "@/components/ui";

export default async function HomePage() {
  const session = await getSession();
  const primaryHref = session ? "/practice" : "/register";

  const features: {
    icon: IconName;
    title: string;
    desc: string;
  }[] = [
    {
      icon: "edit",
      title: "智能刷题",
      desc: "覆盖前端、后端、算法、行为面试。写下你的答案，对照参考答案，AI 当场点评打分。",
    },
    {
      icon: "mic",
      title: "模拟面试",
      desc: "AI 扮演面试官，逐轮提问、顺着你的回答追问，支持语音对话，真实还原面试节奏。",
    },
    {
      icon: "history",
      title: "记录回看",
      desc: "练习与面试记录自动保存，随时回看 AI 反馈与评分，看到自己的进步。",
    },
  ];

  return (
    <div className="animate-fade-in">
      <section className="text-center">
        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-soft">
          <Icon name="sparkles" size={14} className="text-brand-500" />
          AI 驱动 · 真实面试节奏
        </div>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          像真实面试一样
          <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
            准备面试
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          AI 面试助手把刷题、模拟面试和 AI 面试官结合在一起，
          让你在真正坐进面试间之前，先练熟、练透。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={primaryHref}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 text-base font-semibold text-white shadow-soft transition-all duration-150 ease-out-soft hover:bg-brand-600 hover:shadow-hover active:scale-[0.98] sm:w-auto"
          >
            <Icon name="play" size={18} />
            {session ? "开始刷题" : "免费开始"}
          </Link>
          <Link
            href={session ? "/interview" : "/login"}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-line bg-surface px-6 text-base font-semibold text-ink transition-all duration-150 ease-out-soft hover:bg-canvas active:scale-[0.98] sm:w-auto"
          >
            {session ? "进入模拟面试" : "已有账号，登录"}
          </Link>
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} hover padded>
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name={f.icon} size={22} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
          </Card>
        ))}
      </section>

      <section className="mt-16 rounded-2xl border border-line bg-surface p-8 shadow-card">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">准备好开始了吗？</h2>
            <p className="mt-1 text-sm text-muted">
              注册即用，无需信用卡。题库由社区共建，持续扩张中。
            </p>
          </div>
          <Link
            href={session ? "/explore" : "/register"}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            {session ? "逛题库广场" : "立即注册"}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
