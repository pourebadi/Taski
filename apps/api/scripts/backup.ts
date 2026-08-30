/** بکاپ اتمیک SQLite با VACUUM INTO سپس آرشیو uploads. نگهداشت ۱۴ نسخه. (D-006) */
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { readdirSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const KEEP = 14;

async function main() {
  const dir = join(process.cwd(), 'data', 'backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbTarget = join(dir, `app-${stamp}.db`);

  await prisma.$executeRawUnsafe(`VACUUM INTO '${dbTarget}'`);
  console.log(`دیتابیس: ${dbTarget}`);

  const uploads = join(process.cwd(), 'data', 'uploads');
  if (existsSync(uploads)) {
    const tar = join(dir, `uploads-${stamp}.tar.gz`);
    execSync(`tar -czf "${tar}" -C "${join(process.cwd(), 'data')}" uploads`);
    console.log(`فایل‌ها: ${tar}`);
  }

  for (const prefix of ['app-', 'uploads-']) {
    const files = readdirSync(dir).filter((f) => f.startsWith(prefix)).sort().reverse();
    files.slice(KEEP).forEach((f) => unlinkSync(join(dir, f)));
  }
}

main().finally(() => prisma.$disconnect());
