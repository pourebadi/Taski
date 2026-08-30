/**
 * بازیابی از بکاپ. قبل از پایلوت حتماً یک بار واقعاً اجرا شود. (D-006، PM-E1)
 * استفاده: npm run backup:restore -- --file=app-2026-08-29T....db
 */
import { copyFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const dir = join(process.cwd(), 'data', 'backups');
const dbPath = join(process.cwd(), 'data', 'app.db');

function main() {
  const arg = process.argv.find((a) => a.startsWith('--file='));
  if (!arg) {
    console.log('نسخه‌های موجود:');
    readdirSync(dir).filter((f) => f.startsWith('app-')).sort().reverse().forEach((f) => console.log('  ' + f));
    throw new Error('استفاده: npm run backup:restore -- --file=<نام فایل>');
  }

  const source = join(dir, arg.split('=')[1]);
  if (!existsSync(source)) throw new Error(`فایل بکاپ پیدا نشد: ${source}`);

  // نسخه فعلی قبل از بازنویسی کنار گذاشته می‌شود
  if (existsSync(dbPath)) {
    const safety = join(dir, `pre-restore-${Date.now()}.db`);
    copyFileSync(dbPath, safety);
    console.log(`نسخه فعلی نگه داشته شد: ${safety}`);
  }

  copyFileSync(source, dbPath);
  console.log(`بازیابی انجام شد از: ${source}`);

  // آرشیو فایل‌های هم‌زمان، اگر وجود دارد
  const stamp = arg.split('=')[1].replace('app-', '').replace('.db', '');
  const uploads = join(dir, `uploads-${stamp}.tar.gz`);
  if (existsSync(uploads)) {
    execSync(`tar -xzf "${uploads}" -C "${join(process.cwd(), 'data')}"`);
    console.log('فایل‌های ضمیمه بازیابی شدند.');
  } else {
    console.log('آرشیو فایل هم‌زمانی پیدا نشد؛ فقط دیتابیس بازیابی شد.');
  }

  console.log('اپ را دوباره راه‌اندازی کنید.');
}

main();
