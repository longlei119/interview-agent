import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();
  const primaryHref = session ? "/practice" : "/register";

  const features = [
    {
      icon: "📝",
      title: "智能刷题",
      desc: "覆盖前端、后端、算法、行为面试。写下你的答案，对照参考答案，AI 当场点评打分。",
    },
    {
      icon: "🎙️",
      title: "模拟面试",
      desc: "AI 扮演面试官，逐轮提问、顺着你的回答追问，支持语音对话，真实还原面试节奏。",
    },
    {
      icon: "📊",
      title: "记录回看",
      desc: "练习与面试记录自动保存，随时回看 AI 反馈与评分，看到自己的进步。",
    },
  ];

  return (
    <div className="py-6">
      <section className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          像真实面试一样准备面试
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 sm:text-lg">
          AI 面试助手把刷题、模拟面试和 AI 面试官结合在一起，
          让你在真正坐进面试间之前，先练熟、练透。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={primaryHref}
            className="w-full rounded-xl bg-brand-500 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-brand-600 sm:w-auto"
          >
            {session ? "开始刷题" : "免费开始"}
          </Link>
          <Link
            href={session ? "/interview" : "/login"}
            className="w-full rounded-xl border border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
          >
            {session ? "进入模拟面试" : "已有账号，登录"}
          </Link>
        </div>
      </section>

      <section className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="text-3xl">{f.icon}</div>
            <h3 className="mt-3 text-lg font-bold text-gray-900">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
