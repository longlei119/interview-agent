import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 用法：npm run set-admin <email>
// 把指定邮箱的已注册用户提升为管理员。
async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("用法：npm run set-admin <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`找不到邮箱为 ${email} 的用户，请先注册该账号。`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { role: "admin", canCreate: true },
  });
  console.log(`已将 ${email} 设为管理员。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
