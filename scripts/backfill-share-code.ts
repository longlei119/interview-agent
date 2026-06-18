// 一次性脚本：为已有用户回填 shareCode
// 用法：npx tsx scripts/backfill-share-code.ts

import { PrismaClient } from "@prisma/client";

const SHARECODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateShareCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += SHARECODE_CHARS[Math.floor(Math.random() * SHARECODE_CHARS.length)];
  }
  return code;
}

async function main() {
  const prisma = new PrismaClient();

  const users = await prisma.user.findMany({ where: { shareCode: null } });
  if (users.length === 0) {
    console.log("所有用户已有 shareCode，无需回填");
    await prisma.$disconnect();
    return;
  }

  console.log(`找到 ${users.length} 个用户需要回填 shareCode`);

  for (const user of users) {
    let code: string;
    let retries = 0;
    do {
      code = generateShareCode();
      retries++;
      const dup = await prisma.user.findUnique({ where: { shareCode: code } });
      if (!dup) break;
    } while (retries < 5);

    await prisma.user.update({
      where: { id: user.id },
      data: { shareCode: code, shareCodeSetAt: new Date() },
    });
    console.log(`  ${user.email} → ${code}`);
  }

  console.log("回填完成");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("回填失败:", e);
  process.exit(1);
});
