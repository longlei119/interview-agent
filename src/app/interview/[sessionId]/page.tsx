import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { InterviewChat } from "@/components/InterviewChat";

export default async function InterviewSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { sessionId } = await params;
  const interview = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!interview || interview.userId !== session.userId) notFound();

  const initialMessages = interview.messages.map((m) => ({
    role: m.role as "interviewer" | "candidate",
    content: m.content,
  }));

  return (
    <InterviewChat
      sessionId={interview.id}
      role={interview.role}
      level={interview.level}
      initialMessages={initialMessages}
      initialStatus={interview.status}
      initialSummary={interview.summary}
      initialScore={interview.score}
    />
  );
}
