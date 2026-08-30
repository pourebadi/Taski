/** بازنشانی رمز فقط از ترمینال سرور. هیچ مسیر HTTP معادلی وجود ندارد. (D-003, PM-B4) */
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv.find((a) => a.startsWith('--username='));
  if (!arg) throw new Error('استفاده: npm run admin:reset-password -- --username=admin');
  const username = arg.split('=')[1].toLowerCase();

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error(`کاربری با نام‌کاربری ${username} پیدا نشد.`);

  const temp = randomBytes(8).toString('base64url') + 'A1';
  await prisma.user.update({
    where: { username },
    data: { passwordHash: await bcrypt.hash(temp, 10), mustChangePassword: true },
  });
  await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });

  console.log(`رمز موقت برای ${username}: ${temp}`);
  console.log('کاربر در ورود بعدی مجبور به تغییر رمز خواهد بود.');
}

main().finally(() => prisma.$disconnect());
