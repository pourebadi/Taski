/** بازنشانی رمز فقط از ترمینال سرور. هیچ مسیر HTTP معادلی وجود ندارد. (D-003, PM-B4) */
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv.find((a) => a.startsWith('--email='));
  if (!arg) throw new Error('استفاده: npm run admin:reset-password -- --email=someone@example.com');
  const email = arg.split('=')[1].toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`کاربری با ایمیل ${email} پیدا نشد.`);

  const temp = randomBytes(8).toString('base64url') + 'A1';
  await prisma.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(temp, 10), mustChangePassword: true },
  });
  await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });

  console.log(`رمز موقت برای ${email}: ${temp}`);
  console.log('کاربر در ورود بعدی مجبور به تغییر رمز خواهد بود.');
}

main().finally(() => prisma.$disconnect());
