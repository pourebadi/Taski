# PE-OS — سامانه مدیریت اجرای محصول، پروژه و تسک

MVP لوکال‌محور: یک رانتایم NestJS که هم API و هم build فرانت را سرو می‌کند، با SQLite روی دیسک همان ماشین.

## راه‌اندازی

```bash
cp .env.example .env      # مقادیر ADMIN_* و JWT_* را عوض کنید
npm install
npm run db:migrate
npm run db:seed
npm run dev               # api روی 3000، وب روی 5173
```

برای اجرای تولیدی:

```bash
npm run build && npm start
```

## ساختار

```
apps/api    NestJS + Prisma + SQLite
apps/web    React + Vite + Ant Design (RTL، fa_IR، تقویم جلالی)
docs/       سندهای محصول، نقد، قفل دامنه، بک‌لاگ
data/       دیتابیس، فایل‌ها، بکاپ — هرگز commit نمی‌شود
CLAUDE.md   قرارداد اجرایی، منبع حقیقت تصمیم‌ها
```

## نکات مهم

- روزهای کاری: شنبه تا پنجشنبه. تنها تعطیلی هفتگی جمعه. همه محاسبات از `src/calendar/working-days.ts`.
- تغییر ETA فقط از `PATCH /work-items/:id/commitment` و فقط با علت. مسیر overwrite وجود ندارد.
- بکاپ روزانه خودکار است؛ دستی: `npm run backup:now`، بازیابی: `npm run backup:restore`.
  راهنمای کامل عملیات در `docs/04-runbook.md`.
- بازنشانی رمز ادمین: `npm run admin:reset-password -- --email=x` فقط از ترمینال سرور.
- فونت وزیرمتن را در `apps/web/public/fonts/` بگذارید.
