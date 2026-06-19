import { prisma } from "@/lib/db";
import { isMailConfigured, sendVerificationCode } from "@/lib/mail";

export type CodePurpose = "register" | "reset";

const CODE_TTL_MINUTES = 10;
const CODE_LENGTH = 6;

// 限流阈值
const LIMIT_SAME_EMAIL_PURPOSE_SECONDS = 60; // 同 email+purpose 60s 内 1 次
const LIMIT_EMAIL_PER_10MIN = 5; // 同 email 10min 内 5 次
const LIMIT_IP_PER_10MIN = 10; // 同 IP 10min 内 10 次

export function generateCode(): string {
  // 6 位数字，首位不为 0 更像真实验证码（非必须，但视觉自然）
  const max = 1_000_000;
  const n = Math.floor(Math.random() * max);
  return n.toString().padStart(CODE_LENGTH, "0");
}

export type SendCodeResult =
  | { ok: true }
  | { ok: false; status: 400 | 409 | 429 | 503 | 500; error: string };

interface SendCodeOptions {
  email: string;
  purpose: CodePurpose;
  ip?: string;
  // 用于 register 时查重（已注册则拒绝）；reset 时传入则未注册仍返回 ok 但不发
  existingUser?: { id: string } | null;
}

export async function sendCode(opts: SendCodeOptions): Promise<SendCodeResult> {
  const { email, purpose, ip, existingUser } = opts;

  if (!isMailConfigured()) {
    return { ok: false, status: 503, error: "邮件服务未配置，请联系管理员" };
  }

  const now = new Date();
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);

  // 限流1：同 email+purpose 60s 内只能发 1 次
  const recent = await prisma.emailCode.findFirst({
    where: { email, purpose, createdAt: { gt: new Date(now.getTime() - LIMIT_SAME_EMAIL_PURPOSE_SECONDS * 1000) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const wait = Math.ceil((LIMIT_SAME_EMAIL_PURPOSE_SECONDS * 1000 - (now.getTime() - recent.createdAt.getTime())) / 1000);
    return { ok: false, status: 429, error: `请求过于频繁，请 ${wait} 秒后再试` };
  }

  // 限流2：同 email 10min 内最多 5 次（不限 purpose）
  const emailCount = await prisma.emailCode.count({
    where: { email, createdAt: { gt: tenMinAgo } },
  });
  if (emailCount >= LIMIT_EMAIL_PER_10MIN) {
    return { ok: false, status: 429, error: "该邮箱请求验证码过于频繁，请稍后再试" };
  }

  // 限流3：同 IP 10min 内最多 10 次
  if (ip) {
    const ipCount = await prisma.emailCode.count({
      where: { ip, createdAt: { gt: tenMinAgo } },
    });
    if (ipCount >= LIMIT_IP_PER_10MIN) {
      return { ok: false, status: 429, error: "请求过于频繁，请稍后再试" };
    }
  }

  // register 用途：邮箱已注册则不发
  if (purpose === "register" && existingUser) {
    return { ok: false, status: 409, error: "该邮箱已注册，请直接登录" };
  }

  // reset 用途：邮箱未注册则静默返回 ok（防枚举），但不发邮件、不写表
  if (purpose === "reset" && !existingUser) {
    return { ok: true };
  }

  const code = generateCode();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000);

  try {
    await sendVerificationCode({ to: email, code, purpose, expireMinutes: CODE_TTL_MINUTES });
  } catch (e) {
    console.error("[mail] 发送验证码失败", email, purpose, e instanceof Error ? e.message : e);
    return { ok: false, status: 500, error: "验证码发送失败，请稍后重试" };
  }

  // 发送成功才写表，便于审计 + 校验
  await prisma.emailCode.create({
    data: { email, code, purpose, expiresAt, ip: ip ?? null },
  });

  return { ok: true };
}

export async function verifyCode(opts: {
  email: string;
  purpose: CodePurpose;
  code: string;
}): Promise<boolean> {
  const { email, purpose, code } = opts;
  if (!code) return false;
  const now = new Date();

  // 查最近一条未消费、未过期的记录
  const record = await prisma.emailCode.findFirst({
    where: {
      email,
      purpose,
      consumed: false,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return false;
  if (record.code !== code.trim()) return false;

  // 匹配，标记消费（一次性）
  await prisma.emailCode.update({
    where: { id: record.id },
    data: { consumed: true },
  });

  return true;
}

// 清理已过期记录（可选，由 cron 或定期调用；本次不强制）
export async function cleanupExpiredCodes(): Promise<number> {
  const r = await prisma.emailCode.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return r.count;
}
