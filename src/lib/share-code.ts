const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 32 chars，去 0/O/1/I/L
const LENGTH = 8;
const MAX_RETRIES = 3;

function generate(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

export async function generateShareCode(prisma: { user: { findUnique: Function; update: Function } }): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generate();
    const existing = await prisma.user.findUnique({ where: { shareCode: code } });
    if (!existing) return code;
  }
  throw new Error("生成分享码失败，请重试");
}

const RESET_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 一天

export function canResetShareCode(shareCodeSetAt: Date): boolean {
  return Date.now() - shareCodeSetAt.getTime() >= RESET_COOLDOWN_MS;
}

export function timeUntilReset(shareCodeSetAt: Date): number {
  const elapsed = Date.now() - shareCodeSetAt.getTime();
  return Math.max(0, RESET_COOLDOWN_MS - elapsed);
}
