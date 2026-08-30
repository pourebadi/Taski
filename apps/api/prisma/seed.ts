/**
 * Seed idempotent. اجرای مجدد نباید داده تکراری بسازد. (PM-A2)
 * هیچ ایمیل جعلی برای اعضای واقعی ساخته نمی‌شود؛ فقط تیم‌ها seed می‌شوند.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const ORG_ID = 'org-default';

const TEAMS = ['Backend', 'Frontend', 'Marketing & Growth', 'Design & Content'];

async function main() {
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: 'سازمان پیش‌فرض',
      timezone: 'Asia/Tehran',
      weekStart: 'SATURDAY',
      workingDays: 'SAT,SUN,MON,TUE,WED,THU',
    },
  });

  for (const name of TEAMS) {
    const exists = await prisma.team.findFirst({ where: { organizationId: ORG_ID, name } });
    if (!exists) {
      await prisma.team.create({ data: { id: randomUUID(), organizationId: ORG_ID, name } });
    }
  }

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const username = (process.env.ADMIN_USERNAME ?? 'admin').toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!username || !password) {
      throw new Error('ADMIN_USERNAME و ADMIN_PASSWORD تنظیم نشده‌اند. ساخت ادمین اولیه ممکن نیست.');
    }
    await prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId: ORG_ID,
        fullName: process.env.ADMIN_NAME ?? 'مدیر سیستم',
        username,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'ORG_OWNER',
        status: 'ACTIVE',
        mustChangePassword: process.env.NODE_ENV === 'production',
      },
    });
    console.log(`ادمین اولیه ساخته شد: @${username}`);
  } else {
    console.log('کاربر از قبل وجود دارد؛ رمز بازنویسی نشد.');
  }
}

main().finally(() => prisma.$disconnect());
