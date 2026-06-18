const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function t() {
  const u = await p.user.findUnique({where:{email:'longlei@qq.com'}});
  console.log('user:', u?.email);
  console.log('hash:', u?.passwordHash?.substring(0,60));
  const ok = await bcrypt.compare('123456', u.passwordHash);
  console.log('bcrypt ok:', ok);
  await p.$disconnect();
}
t().catch(e => { console.error(e); });
