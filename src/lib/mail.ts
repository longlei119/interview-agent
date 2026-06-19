import nodemailer from "nodemailer";

// SMTP 配置全部从环境变量读，运行时不改。配置在 .env.local（不进 git）。
const HOST = process.env.SMTP_HOST?.trim();
const PORT_RAW = process.env.SMTP_PORT?.trim();
const USER = process.env.SMTP_USER?.trim();
const PASS = process.env.SMTP_PASS?.trim();
const FROM = process.env.SMTP_FROM?.trim() || USER;
// 465 用 SSL（secure=true），587/STARTTLS 用 secure=false
const SECURE = (process.env.SMTP_SECURE?.trim() ?? "true") === "true";

let transporter: nodemailer.Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(HOST && USER && PASS && PORT_RAW);
}

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  if (!isMailConfigured()) {
    throw new Error("SMTP 未配置，请在 .env.local 设置 SMTP_HOST/PORT/USER/PASS");
  }
  const port = Number(PORT_RAW);
  transporter = nodemailer.createTransport({
    host: HOST,
    port,
    secure: SECURE || port === 465,
    auth: { user: USER, pass: PASS },
  });
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail({ to, subject, text, html }: SendMailInput): Promise<void> {
  const t = getTransporter();
  await t.sendMail({
    from: FROM,
    to,
    subject,
    text,
    html: html || text,
  });
}

// 6 位数字验证码邮件
export async function sendVerificationCode(opts: {
  to: string;
  code: string;
  purpose: "register" | "reset";
  expireMinutes: number;
}): Promise<void> {
  const { to, code, purpose, expireMinutes } = opts;
  const action = purpose === "register" ? "注册账号" : "重置密码";
  const subject = `【面试助手】您的${action}验证码 ${code}`;
  const text = `您正在${action}，验证码：${code}，${expireMinutes} 分钟内有效。如非本人操作请忽略本邮件。`;
  const html = `
    <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#1a1a1a;margin:0 0 16px;">面试助手 · ${action}</h2>
      <p style="color:#4a4a4a;font-size:14px;line-height:1.6;">您正在${action}，请使用以下验证码完成操作：</p>
      <div style="margin:24px 0;text-align:center;">
        <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;color:#2563eb;background:#eff6ff;padding:16px 32px;border-radius:8px;">${code}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;">验证码 ${expireMinutes} 分钟内有效。如非本人操作，请忽略本邮件，他人可能误填了您的邮箱。</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="color:#9ca3af;font-size:12px;">此邮件由系统自动发送，请勿回复。</p>
    </div>
  `.trim();
  await sendMail({ to, subject, text, html });
}
