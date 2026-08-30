# CLAUDE.md — قرارداد اجرای پروژه

این فایل منبع حقیقت اجرایی است. PRD اصلی (`docs/99-prd-original-v3.4.md`) فقط مرجع تاریخی است و در تعارض، **این فایل و سندهای `docs/00` تا `docs/03` مقدم‌اند**.

## محصول

سامانه مدیریت اجرای محصول، پروژه و تسک برای یک تیم پنج‌نفره. رابط کاربری کاملاً فارسی و RTL. کد و نام‌های فنی انگلیسی.

## معماری قفل‌شده

```
Browser → یک URL → یک Runtime NestJS
                    ├── /api/v1/*  REST
                    ├── /*         React build
                    ├── SQLite     data/app.db
                    └── Files      data/uploads/
```

**ممنوع در MVP:** PostgreSQL، Redis، Queue، S3، SMTP، OAuth/SSO، Docker Compose، Kubernetes، میکروسرویس، دو دیپلوی جدا، Scale افقی.

## استک

- Backend: NestJS + TypeScript + Prisma (provider: sqlite) + Zod
- Frontend: React + Vite + TypeScript + **Ant Design v5** + Tailwind (فقط چیدمان)
- تاریخ: dayjs + jalaliday + antd-jalali-plus + antd/locale/fa_IR + فونت وزیرمتن محلی
- بورد: @dnd-kit/core
- Test: Vitest + Supertest
- یک `package.json` در ریشه با workspace، یک دستور build

## قوانین غیرقابل مذاکره

1. **هیچ مجوزی فقط در فرانت اعمال نمی‌شود.** هر بررسی دسترسی در سرور و از ماژول متمرکز `authorization`.
2. **هیچ تغییر ETA بدون رکورد تاریخچه و علت.** مسیر overwrite نباید وجود داشته باشد.
3. **هیچ محاسبه‌ی تاریخی خارج از ماژول `working-calendar`.**
4. **هیچ متن فارسی هاردکد در کامپوننت.** همه از `locales/fa.json`.
5. **`data/` هرگز commit نمی‌شود.** در `.gitignore` باشد: `data/`, `.env`, `*.db`, `*.db-*`.
6. **سمت سازمانی هیچ مجوزی نمی‌دهد.** فقط نقش نرم‌افزاری.
7. **enum بومی در SQLite نداریم.** همه `String` + اعتبارسنجی Zod + ثابت مشترک.
8. **هیچ migration بدون فکر rollback.**
9. **ذخیره‌سازی همیشه UTC.** نمایش همیشه شمسی جلالی.
9b. **کامپوننت پایه از صفر نوشته نمی‌شود.** اگر antd دارد، از antd استفاده کن.
9c. **روزهای کاری: شنبه تا پنجشنبه. فقط جمعه تعطیل.**
10. **هیچ Stack Trace به کلاینت.**

## چرخه‌ی هر استوری

خواندن استوری از `docs/03` ← نوشتن تست معیار پذیرش ← پیاده‌سازی ← اجرای تست و lint ← به‌روزرسانی `docs/CHANGELOG.md` ← commit با شناسه‌ی استوری در پیام.

قالب پیام commit: `PM-C6: add commitment history with mandatory reason`

## دامنه‌ی فعلی

فقط `PILOT-MIN` طبق `docs/02`. هیچ آیتم `PILOT-FULL` قبل از تکمیل `PILOT-MIN` شروع نمی‌شود.

## دستورهای اصلی

```
npm run dev            # اجرای همزمان فرانت و بک
npm run build          # build واحد
npm run test           # تست‌ها
npm run db:migrate     # اعمال migration
npm run db:seed        # seed idempotent
npm run backup:now
npm run admin:reset-password -- --email=<x>
```

## متغیرهای محیطی

```
NODE_ENV=
PORT=3000
DATABASE_URL="file:./data/app.db"
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ADMIN_NAME=
ADMIN_EMAIL=
ADMIN_PASSWORD=
UPLOAD_MAX_MB=10
STORAGE_QUOTA_GB=2
TZ=Asia/Tehran
```

## چیزهایی که هرگز انجام نمی‌دهی

- `git push --force` روی `main`
- حذف یا بازنویسی `data/`
- commit کردن `.env` یا هر credential
- اضافه کردن وابستگی خارج از استک بالا بدون ثبت در Decision Log
- ساختن قابلیتی که در `docs/02` قفل نشده است
