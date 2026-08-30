# PRD و Blueprint جامع سامانه مدیریت اجرای محصول، پروژه و تسک

> نسخه: 3.4 — **Local-first / Self-contained MVP**  
> زبان محصول: **کاملاً فارسی و RTL**؛ کدها و نام‌های فنی فقط در لایه توسعه/دیتابیس انگلیسی می‌مانند  
> مبنا: سند «Executive Organizational Diagnosis - Revised»  
> هدف: یک MVP ساده، قابل حذف و قابل انتقال که تیم بتواند با URL عمومی از آن استفاده کند، ولی داده و فایل‌هایش به سرویس خارجی وابسته نباشند.

## تصمیم اصلی نسخه 3.4

این نسخه برای سناریوی فعلی قفل می‌شود:

```text
Claude/Developer builds MVP
        ↓
Push to personal GitHub repository
        ↓
Run ONE app instance on any machine/runtime with persistent disk
        ↓
One public URL for company users
        ↓
Login + Project/Task/Kanban/ETA History
        ↓
All app data stays on that same machine
        ├── data/app.db
        └── data/uploads/
        ↓
If accepted → copy repo/build + data/ to company server
If rejected → backup if needed, then delete runtime/repo
```

### «لوکال» در این PRD یعنی چه؟

لوکال یعنی **لوکال نسبت به Runtime برنامه**، نه داخل GitHub و نه لزوماً روی لپ‌تاپ صاحب پروژه.

- Database: `SQLite` در `data/app.db`
- Attachments: `data/uploads/`
- Sessions: داخل همان SQLite
- In-app Notifications: داخل همان SQLite
- Backups: `data/backups/`
- GitHub: فقط Source Code؛ داده واقعی داخل Git Commit نمی‌رود.

اگر تیم با Browser و URL عمومی استفاده می‌کند، طبیعتاً App باید روی یک ماشین قابل دسترس از اینترنت اجرا شود؛ اما **Database/Storage/Auth Service جداگانه‌ای لازم نیست**. تنها شرط Runtime این است که `data/` را بعد از Restart/Deploy نگه دارد.

### معماری ساده MVP

```text
Browser
  ↓
One public URL
  ↓
Single NestJS Runtime
  ├── /api/*  → REST API
  ├── /*      → React/Vite build
  ├── SQLite  → data/app.db
  └── Files   → data/uploads/
```

یعنی در MVP نداریم:

- Managed PostgreSQL
- Redis
- Queue
- S3/Object Storage
- SMTP
- OAuth/SSO
- Kubernetes
- Microservice
- دو Deploy جدا برای Front و Back

### Admin پیش‌فرض

برای Local Development حساب آماده وجود دارد:

```text
Email: admin@local.test
Password: Admin12345!
```

برای Pilot آنلاین، همان Bootstrap استفاده می‌شود ولی مقادیر از `.env` خوانده می‌شوند:

```text
ADMIN_NAME=مدیر سیستم
ADMIN_EMAIL=<email chosen by owner>
ADMIN_PASSWORD=<password chosen by owner>
```

قواعد:

- اگر هیچ User وجود نداشت، Admin ساخته شود.
- اگر وجود داشت، Password overwrite نشود.
- در `NODE_ENV=production/pilot` اگر Password هنوز `Admin12345!` بود، برنامه Start نشود.
- Public Sign-up وجود ندارد.
- Admin از داخل UI کاربر می‌سازد و Temporary Password می‌دهد.
- SMTP/Email Invite لازم نیست.

### Definition of Done برای Pilot

MVP برای استفاده شرکت آماده است اگر:

1. Repo روی GitHub شخصی Push شده باشد.
2. `.env`, `data/`, `*.db` و Uploadها Commit نشده باشند.
3. Build/Test Pass باشد.
4. App روی یک Runtime با Persistent Disk اجرا شود.
5. Admin با URL عمومی Login کند.
6. Admin بتواند پنج کاربر فعلی را بسازد.
7. کاربران بدون Clone فقط با Browser وارد شوند.
8. Project/Task/Kanban/My Work کار کند.
9. ETA Change History کار کند.
10. App Restart شود و Task/Attachment همچنان باقی بماند.
11. Backup از `app.db` + `uploads/` قابل ساخت و Restore باشد.

### Override اجرایی

اگر هر بخش قدیمی‌تر سند با این تصمیم تعارض داشت، **این بخش و بخش‌های 20، 22، 30، 40، 46 و 48 نسخه 3.4 مقدم‌اند**.

---

## تغییرات کلیدی نسخه 3.0

این نسخه علاوه بر نیازهای سند مبنا و نسخه 2.0، با هدف **ساخت راحت توسط Claude/AI Coding Agent، همکاری تیم روی GitHub و Deploy ساده روی یک سرور و دامنه** بهبود یافته است. اصل این نسخه این است که MVP از ابتدا Deployable باشد، اما زیرساخت آن بی‌دلیل پیچیده نشود.

قابلیت‌ها و تصمیم‌های جدید نسخه 3.0:

- رویکرد **GitHub-first**: Repository شخصی و خصوصی، همکاری ساده با Collaborator، و CI پایه
- اضافه شدن قرارداد اجرای پروژه برای Claude/AI Coding Agent و فایل پیشنهادی `CLAUDE.md`
- اجرای Local و Server با Docker Compose و فایل‌های استاندارد Repository
- آمادگی برای Deploy آینده روی یک VPS/Server ساده؛ Deploy سرور در MVP فعلی اجباری نیست
- حذف Redis، Queue و S3 از نیاز اجباری MVP؛ این سرویس‌ها فقط در صورت نیاز واقعی بعداً اضافه می‌شوند
- SQLite تنها دیتابیس اصلی MVP؛ Migration و Seed داخل Repository و قابل اجرای خودکار
- در صورت Deploy آینده، دامنه و HTTPS با Reverse Proxy ساده قابل اضافه شدن است
- نمای **Kanban سراسری، پروژه، تیم و کارهای من**
- نمای **Gantt سراسری و پروژه‌ای** با Milestone، Dependency و مقایسه Baseline با برنامه فعلی
- ثبت تاریخچه واقعی Estimate/ETA و جلوگیری از overwrite بدون Trace
- محاسبه تعداد جابه‌جایی ETA، آخرین جابه‌جایی، Drift از برآورد اولیه و مجموع حرکت‌های زمانی
- نمایش علت هر تغییر ETA مانند Scope Change، Blocker، Dependency، Priority Change، Support Interrupt یا Re-estimation
- افزودن معیارهای Schedule Stability به داشبورد مدیریت بدون تبدیل آن به امتیازدهی عملکرد افراد

تمام قابلیت‌های مدیریت کاربران، تیم، Review/QA، Handoff و فارسی‌سازی نسخه 2.0 نیز حفظ می‌شوند.


- مدیریت کامل چرخه کاربر: دعوت، فعال‌سازی، نقش، تیم، ظرفیت، جابه‌جایی نقش/تیم و غیرفعال‌سازی امن
- جداسازی **سمت سازمانی** از **سطح دسترسی نرم‌افزار**
- تعریف Seed اولیه برای اعضای فعلی بدون ساختن ایمیل یا اطلاعاتی که ارائه نشده است
- داشبورد «کارهای من» و داشبورد «تیم من»
- Workflow دقیق‌تر: Backlog، اجرا، بازبینی، QA و Done
- Reviewer و QA Owner مستقل از Assignee
- کنترل WIP، Overload، کارهای بدون Owner، کارهای Overdue و Review Queue
- Handoff بین Backend، Frontend، Design/Content و Marketing
- قالب‌های تسک بر اساس نوع کار
- کنترل تغییر Scope / Target Date / Priority در پروژه‌های مهم
- فارسی‌سازی واقعی محصول: تقویم شمسی، RTL، اعداد/تاریخ فارسی، جست‌وجوی نرمال‌شده فارسی و پیام‌های خطای فارسی
- قواعد ویژه برای تیم کوچک: Review اجباری هرجا عملی است و Exception ثبت‌شده هرجا Reviewer هم‌تخصص موجود نیست
- جلوگیری از تبدیل Metrics افراد به «امتیاز عملکرد»؛ داده‌ها برای برنامه‌ریزی کار و ظرفیت استفاده می‌شوند، نه رتبه‌بندی افراد

---

## فهرست مطالب

1. خلاصه مدیریتی
2. برداشت مستقیم از سند و اصول غیرقابل مذاکره
3. چشم‌انداز محصول و مسئله
4. اهداف، معیارهای موفقیت و موارد خارج از محدوده
5. فرضیات طراحی
6. کاربران، افراد، تیم‌ها، نقش‌ها و سطح دسترسی
7. مدل مفهومی محصول
8. ماژول‌های محصول
9. جریان‌های کاری End-to-End
10. وضعیت‌ها، دسته‌بندی‌ها و قواعد کسب‌وکار
11. مدل اولویت‌گذاری
12. مدیریت ظرفیت و Workload
13. مدیریت پروژه، تسک، Review/QA و Handoff
14. Intake و Support/Ops
15. Risk، Blocker، Dependency و Decision Log
16. Weekly Delivery Review و گزارش مدیریتی
17. داشبوردها و KPIها
18. PRD تفصیلی و Functional Requirements
19. User Storyها و Acceptance Criteria
20. مدل داده و دیتابیس
21. API و قراردادهای Backend
22. معماری فنی پیشنهادی
23. Frontend، UX/UI و فارسی‌سازی کامل
24. امنیت، احراز هویت و Audit
25. Logging، Monitoring و Observability
26. استراتژی تست
27. فرآیند توسعه: از Requirement تا Production
28. Code Review و Quality Gates
29. QA، UAT و Release Management
30. CI/CD و محیط‌ها
31. Migration و ورود داده اولیه
32. نقشه راه ساخت نرم‌افزار
33. برنامه Rollout عملیاتی ۳۰ روزه مطابق سند
34. Backlog اولویت‌بندی‌شده MVP
35. Definition of Ready / Definition of Done
36. ریسک‌های پروژه ساخت نرم‌افزار
37. موارد توسعه آینده
38. چک‌لیست نهایی تحویل
39. GitHub-first و قرارداد همکاری تیم توسعه
40. Pilot آنلاین متصل به GitHub و Deploy آینده
41. Kanban و Gantt سراسری/پروژه‌ای
42. رهگیری Estimate/ETA، Baseline و میزان جابه‌جایی تاریخ‌ها
43. قرارداد اجرای مرحله‌ای با Claude / AI Coding Agent
44. راهنمای GitHub برای اولین پروژه و Vibe Coding
45. Safety Guardrails برای Git / Database / Docker / Claude
46. Runbook ساده Deploy، Backup، Rollback و Recovery
47. MVP Scope Lock و تحویل مرحله‌ای به تیم فنی
48. چک‌لیست Pilot آنلاین برای صاحب پروژه

---


> **قفل معماری MVP نسخه 3.4 — Local-first / Self-contained:** برای MVP هیچ سرویس داده‌ای خارجی لازم نیست. دیتابیس `SQLite` در فایل محلی `data/app.db`، فایل‌های آپلودی در `data/uploads/`، Sessionها و Notificationها داخل همان دیتابیس، و Backup داخل `data/backups/` نگه‌داری می‌شوند. GitHub فقط محل کد است. برای URL عمومی فقط یک Runtime با دیسک پایدار لازم است؛ محصول به Render، PostgreSQL Managed، S3، SMTP، Redis یا سرویس دیگری وابسته نیست.

# 1) خلاصه مدیریتی

این محصول یک **Project & Product Execution OS** است؛ یعنی هدفش صرفاً ساختن یک Task Manager شبیه ابزارهای عمومی نیست. نرم‌افزار باید به مدیریت پاسخ دهد:

- چه کارهایی واقعاً در جریان است؟
- هر کار از چه نوعی است؟ Product، Tech Debt، Support یا Infrastructure؟
- چه کسی Owner آن است؟
- کار در چه مرحله اجرایی قرار دارد؟
- وضعیت سلامت تحویل آن چیست؟ On Track، At Risk، Blocked یا Unknown؟
- ETA چیست و بر اساس چه فرض‌هایی اعلام شده؟
- چه Risk، Blocker یا Dependency دارد؟
- ظرفیت تیم در چه نوع کاری مصرف شده است؟
- اگر کار جدید وارد شود، کدام کار قبلی عقب می‌رود؟
- چه تصمیمی گرفته شده، چرا گرفته شده و اثرش روی زمان/کیفیت/ریسک چیست؟
- در مرور هفتگی چه چیزی جلو رفته، چه چیزی نرفته و چه تصمیمی لازم است؟

نرم‌افزار باید **شفافیت، اولویت‌گذاری و حلقه اجرای تصمیم** را ایجاد کند؛ نه اینکه در فاز اول فرآیند سنگین Scrum یا سیستم ارزیابی عملکرد افراد بسازد.

از نظر فنی محصول باید **GitHub-first و Local-data-first** باشد: کد روی GitHub شخصی صاحب پروژه قرار می‌گیرد؛ کاربران شرکت از URL عمومی همان Runtime وارد می‌شوند؛ اما تمام داده‌های عملیاتی، Sessionها و فایل‌ها روی Disk همان Runtime نگه‌داری می‌شوند. هیچ Clone یا Setup محلی برای کاربران لازم نیست. اگر Pilot موفق بود، Repository به همراه Backup پوشه `data/` به سرور شرکت منتقل می‌شود.

---

# 2) برداشت مستقیم از سند و اصول غیرقابل مذاکره

## 2.1 مسئله اصلی

مسئله اصلی کمبود داده قابل اتکا درباره وضعیت واقعی کارها، مصرف ظرفیت، موانع و علت تأخیرهاست. بنابراین محصول باید «روایت شفاهی» را به «داده ثبت‌شده و قابل پیگیری» تبدیل کند.

## 2.2 چهار جریان اصلی کار

هر Work Item باید حداقل یکی از این چهار Work Stream را داشته باشد:

1. `PRODUCT` — Product Development / توسعه محصول
2. `TECH_DEBT` — Tech Debt / بدهی فنی
3. `SUPPORT` — Support / Ops / پشتیبانی و عملیات
4. `INFRASTRUCTURE` — Infrastructure / زیرساخت

## 2.3 چهار ستون Minimum Operating System

محصول باید حداقل این چهار ستون را پوشش دهد:

1. **Backlog / Board** — همه کارهای مهم در یک نمای مشترک
2. **Intake** — هیچ کار جدیدی بدون ثبت و دسته‌بندی وارد اجرا نشود
3. **Prioritization** — Impact، Effort، Risk/Urgency و ظرفیت کنار هم دیده شوند
4. **Weekly Review** — مرور کوتاه، تصمیم‌محور و مبتنی بر داده

## 2.4 اطلاعات اجباری هر کار مهم

حداقل:

- Title / Work Item
- Type / Work Stream
- Owner
- Workflow State
- Delivery Health
- ETA
- ETA Confidence
- ETA Assumptions
- Risk / Blocker
- Priority
- Project / Product Area
- Created By / Source
- Change Reason در تغییرات مهم

## 2.5 وضعیت سلامت تحویل

چهار وضعیت مدیریتی سند باید دقیقاً حفظ شوند:

- `ON_TRACK` — در مسیر
- `AT_RISK` — در معرض تأخیر
- `BLOCKED` — متوقف
- `UNKNOWN` — نامشخص

### تصمیم طراحی مهم

برای جلوگیری از ابهام، **Workflow State** از **Delivery Health** جدا می‌شود.

مثال:

- Workflow State: `IN_PROGRESS`
- Delivery Health: `AT_RISK`

این تفکیک باعث می‌شود مدیر بداند کار «در حال انجام» است، اما احتمال تأخیر دارد.

## 2.6 قواعد اصلی Intake

- هر ورودی جدید ابتدا ثبت می‌شود.
- منبع ورودی مشخص است: CEO، Tech، Support، Sales، Infrastructure و ...
- نوع کار مشخص می‌شود.
- فقط درخواست Critical می‌تواند مسیر سریع ورود به اجرا داشته باشد.
- حتی کار Critical نیز باید ثبت شود تا مصرف ظرفیت قابل مشاهده بماند.

## 2.7 قواعد Commitment و ETA

Deadline قطعی نباید قبل از روشن شدن این موارد ساخته شود:

- Scope
- Capacity
- Risk
- Dependency
- Concurrent Work

پیش از آن، زمان فقط **ETA همراه با Confidence و Assumption** است.

## 2.8 Feature Brief یک‌صفحه‌ای

برای Featureهای مهم باید حداقل ثبت شود:

- Problem
- Value
- Scope In
- Scope Out
- Acceptance Criteria / Definition of Done
- Risk
- ETA
- ETA Confidence
- Assumptions

## 2.9 Decision Log

هر تصمیم مهم باید کوتاه ولی قابل پیگیری باشد:

- Decision
- Reason
- Impact
- Owner
- Date
- Related Work Item / Project

## 2.10 Weekly Delivery Review

جلسه باید به این پنج سؤال پاسخ دهد:

1. چه چیزی قرار بود جلو برود؟
2. چه چیزی واقعاً جلو رفت؟
3. چه چیزی At Risk یا Blocked است؟
4. چه تصمیمی لازم است؟
5. اگر کار جدید وارد شود، چه چیزی عقب می‌رود؟

---

# 3) چشم‌انداز محصول و مسئله

## 3.1 Product Vision

ساخت یک نرم‌افزار تحت وب که مدیرعامل، لید فنی، تیم توسعه، پشتیبانی و فروش بتوانند در یک سیستم مشترک:

- کارها را ثبت کنند؛
- آن‌ها را دسته‌بندی کنند؛
- پروژه و تسک بسازند؛
- اولویت را شفاف کنند؛
- ظرفیت را ببینند؛
- موانع و وابستگی‌ها را ثبت کنند؛
- تصمیم‌ها را نگه دارند؛
- ETA قابل دفاع بدهند؛
- و در پایان هر هفته گزارش واقعی از وضعیت اجرا داشته باشند.

## 3.2 Problem Statement

سیستم فعلی مدیریت کار، تصویر قابل اتکایی از این موارد نمی‌دهد:

- Work Inventory واقعی
- ظرفیت اشغال‌شده
- علت تغییر ETA
- اولویت و هزینه فرصت
- Blockerها و Riskها
- تصمیم‌های مدیریتی/فنی
- ورودی‌های ناگهانی Support/Ops
- رابطه بین کار جدید و عقب افتادن کار قبلی

## 3.3 Job To Be Done

> وقتی چند درخواست همزمان از مدیریت، فنی، پشتیبانی و فروش وارد می‌شود، می‌خواهم بتوانم آن‌ها را در یک سیستم ثبت، ارزیابی، اولویت‌بندی و اجرا کنم تا بدانم تیم دقیقاً روی چه چیزی کار می‌کند، چرا چیزی دیر شده و برای ادامه چه تصمیمی لازم است.

---

# 4) اهداف، معیارهای موفقیت و موارد خارج از محدوده

## 4.1 اهداف محصول

### G1 — Visibility
ایجاد یک منبع حقیقت واحد برای کارهای فعال، وضعیت، مالک، ETA، مانع و ریسک.

### G2 — Controlled Intake
جلوگیری از ورود بی‌صدای کار جدید به ظرفیت تیم.

### G3 — Defensible Prioritization
اولویت‌گذاری بر اساس Impact، Effort، Risk/Urgency و Opportunity Cost.

### G4 — Predictable Delivery
بهبود کیفیت ETA با Scope، ظرفیت، وابستگی و Confidence.

### G5 — Decision Traceability
ثبت تصمیم و علت تغییرات مهم.

### G6 — Management Reporting
ساخت گزارش هفتگی و ماهانه بدون جمع‌آوری دستی اطلاعات از افراد.

### G7 — Practical Project/Task Management
پشتیبانی از Project، Milestone، Epic/Feature، Task و Subtask بدون پیچیدگی غیرضروری.

## 4.2 KPIهای موفقیت محصول

در ۳۰ تا ۶۰ روز پس از Rollout:

- حداقل 95٪ Work Itemهای فعال دارای Work Stream باشند.
- حداقل 95٪ Work Itemهای مهم Owner داشته باشند.
- حداقل 90٪ Work Itemهای فعال Delivery Health مشخص داشته باشند.
- حداقل 90٪ تغییرات Priority مهم دارای Change Reason باشند.
- حداقل 90٪ کارهای اضطراری Support ثبت شده باشند.
- حداقل 90٪ کارهای Blocked دارای Blocker Owner یا Next Action باشند.
- حداقل 80٪ Featureهای P0/P1 دارای Feature Brief کامل باشند.
- گزارش Weekly Review بدون Spreadsheet جانبی قابل تولید باشد.
- سهم مصرف ظرفیت چهار جریان اصلی قابل مشاهده باشد.

## 4.3 Non-Goals در MVP

در نسخه اول **نباید** وارد این موارد شویم:

- سیستم کامل HR حقوقی/منابع انسانی (حقوق، قرارداد، حضور و غیاب رسمی، ارزیابی عملکرد و پرونده پرسنلی)؛ اما **مدیریت عملیاتی اعضا، تیم‌ها، ظرفیت، دسترسی و Onboarding/Offboarding داخل Scope است**
- Payroll / مالی و حسابداری
- Scrum Enterprise، SAFe یا Workflowهای بسیار سفارشی
- جایگزینی کامل Slack/Telegram/Email
- Source Code Hosting یا CI Server
- سیستم کامل CRM
- محاسبه حقوق بر اساس Time Tracking
- AI Autopilot برای تصمیم‌گیری مدیریتی
- Dynamic Workflow Builder پیچیده

---

# 5) فرضیات طراحی

1. سیستم در ابتدا برای یک سازمان استفاده می‌شود، اما دیتامدل `organization_id` دارد تا Multi-Tenant-ready باشد.
2. ثبت‌نام عمومی وجود ندارد؛ Admin کاربر را مستقیم می‌سازد و Temporary Password می‌دهد.
3. UI برای MVP **فقط فارسی و RTL** است؛ تمام Labelها، خطاها، Help Textها و Notificationها فارسی‌اند.
4. تاریخ در UI به‌صورت پیش‌فرض **شمسی (جلالی)** نمایش داده می‌شود؛ در دیتابیس همه timestampها UTC و تاریخ‌های business به‌صورت ISO/Gregorian ذخیره می‌شوند.
5. Timezone پیش‌فرض Pilot `Asia/Tehran` است و توسط Admin قابل تنظیم است.
6. Email/Password برای MVP کافی است؛ SSO در فاز بعد.
7. نرم‌افزار Self-host-friendly طراحی می‌شود.
8. سیستم باید روی Desktop عالی و روی Tablet قابل استفاده باشد؛ Mobile در MVP Responsive است نه Native App.
9. تغییرات حساس باید Audit شوند.
10. هر کار فقط یک Owner اصلی دارد، ولی می‌تواند چند Assignee/Watcher داشته باشد.
11. Priority، ETA، Delivery Health، Role، Team و Permission تاریخچه دارند و overwrite بدون Trace انجام نمی‌شود.
12. سمت شغلی (Job Title) از نقش دسترسی نرم‌افزار (Application Role) جداست.
13. هیچ ایمیل، شماره تماس یا Credential برای اعضای اولیه حدس زده نمی‌شود؛ Admin هنگام ساخت User آن را وارد می‌کند.
14. داده ظرفیت/Workload برای برنامه‌ریزی استفاده می‌شود و «امتیاز عملکرد فردی» تولید نمی‌کند.

---

# 6) کاربران، افراد، تیم‌ها، نقش‌ها و سطح دسترسی

## 6.1 اصل طراحی هویت و دسترسی

در نسخه 2.0، سه مفهوم مستقل هستند:

1. **سمت سازمانی (Job Title):** عنوان واقعی فرد در سازمان؛ مثل «هد بک‌اند».
2. **نقش نرم‌افزاری (Application Role):** تعیین می‌کند در کل سازمان چه مجوزهایی دارد.
3. **نقش پروژه‌ای (Project Role):** تعیین می‌کند در یک پروژه خاص Owner، Editor، Reviewer، Member یا Viewer است.

این جداسازی حیاتی است. برای مثال، «هد بک‌اند» یک سمت سازمانی است، نه Permission. خانم ترابی می‌تواند در سازمان `TEAM_LEAD` باشد و همزمان در پروژه A نقش `OWNER` و در پروژه B نقش `REVIEWER` داشته باشد.

## 6.2 اعضای فعلی برای Pilot

> این جدول فقط Seed سازمانی است. چون ایمیل افراد ارائه نشده، سیستم نباید ایمیل یا Credential جعلی بسازد. Admin بعداً User واقعی را با Email/Username و Temporary Password ایجاد می‌کند.

| فرد | سمت سازمانی | تیم اصلی پیشنهادی | نقش نرم‌افزاری اولیه | مسئولیت پیش‌فرض در سیستم |
|---|---|---|---|---|
| خانم ترابی | هد بک‌اند | Backend | `TEAM_LEAD` | مدیریت Backlog بک‌اند، تخصیص کار، Review فنی، ثبت Risk/Dependency |
| آقای گلی | کارشناس بک‌اند | Backend | `CONTRIBUTOR` | اجرای تسک‌های بک‌اند، Update، Estimate، Test Evidence و رفع Review |
| آقای دلیری | هد فرانت | Frontend | `TEAM_LEAD` | مدیریت کارهای فرانت، Review فنی فرانت، هماهنگی Handoff با Backend/Design |
| آقای میلاد نیکروان | ارشد بازاریابی | Marketing & Growth | `CONTRIBUTOR` + قابلیت `REQUEST_INTAKE` | ثبت ورودی بازار، مدیریت تسک/پروژه‌های بازاریابی، Review محتوای مرتبط با کمپین |
| خانم مقدم | دیزاینر و تولید محتوا | Design & Content | `CONTRIBUTOR` | طراحی، تولید محتوا، پیوست Deliverable، همکاری با فرانت و بازاریابی |

### Admin پیش‌فرض برای MVP / Pilot آنلاین

برای اینکه صاحب پروژه بلافاصله از URL عمومی وارد شود، Startup/Seed باید در اولین Deploy یک Admin اولیه از Environment بسازد:

```text
ADMIN_NAME=مدیر سیستم
ADMIN_EMAIL=<email chosen by owner>
ADMIN_PASSWORD=<password chosen by owner>
```

قواعد ساده:

- اگر هیچ User وجود نداشت، Admin با Role `ORG_OWNER / ADMIN` ساخته شود.
- Seed/Bootstrap **idempotent** باشد و اجرای دوباره User تکراری نسازد.
- اگر Admin از قبل وجود دارد، Deploy جدید Password او را overwrite نکند.
- Credential واقعی Hosted Pilot هرگز داخل Git/README/PRD Commit نشود.
- Local Development می‌تواند fallback تستی زیر را فقط در `APP_ENV=local` داشته باشد:

```text
Email:    admin@local.test
Password: Admin12345!
```

- در Hosted Pilot، اگر `ADMIN_EMAIL` یا `ADMIN_PASSWORD` ست نشده باشد و هنوز هیچ User وجود نداشته باشد، Startup با خطای واضح Fail شود؛ Default Password عمومی روی اینترنت مجاز نیست.
- برای MVP نیازی به SMTP و Invite Email نیست.
- Admin از UI کاربر می‌سازد: نام، ایمیل/Username، Role، Team و Temporary Password.
- کاربر در Login اول مجبور به تغییر Temporary Password شود.
- Public Registration غیرفعال است.

> هدف این تصمیم تجربه ساده است: Deploy → Admin Login → Create Users → Team Login.

## 6.3 تیم‌های اولیه

```text
Backend
├── Lead: خانم ترابی
└── Member: آقای گلی

Frontend
└── Lead: آقای دلیری

Marketing & Growth
└── Senior Member: آقای میلاد نیکروان

Design & Content
└── Member: خانم مقدم
```

### Defaultهای اولیه قابل تغییر

- خانم ترابی: Team Lead تیم Backend و Reviewer پیش‌فرض کارهای Backend آقای گلی
- آقای گلی: Contributor تیم Backend
- آقای دلیری: Team Lead تیم Frontend
- آقای میلاد نیکروان: Contributor تیم Marketing & Growth و مجاز به ثبت Intake
- خانم مقدم: Contributor تیم Design & Content
- هیچ‌کدام از این Assignmentها در کد Hard-code نمی‌شوند و Admin می‌تواند آن‌ها را تغییر دهد.

در آینده:
- هر تیم چند عضو و چند Reviewer می‌تواند داشته باشد.
- هر فرد می‌تواند عضو چند Team باشد.
- یک `Primary Team` برای گزارش ظرفیت دارد.
- Allocation فرد بین چند Team قابل ثبت است.
- Team Lead قابل تغییر است و تغییر آن Audit می‌شود.

## 6.4 نقش‌های نرم‌افزاری پایه

### 1. `ORG_OWNER` — مالک سازمان
- همه مجوزهای Admin
- تعیین Admin
- تنظیمات امنیتی کلیدی
- بازیابی دسترسی سازمان
- مشاهده Audit کامل

### 2. `ADMIN` — مدیر سیستم
- دعوت و مدیریت کاربران
- مدیریت Team و Membership
- نقش‌ها و Permissionها
- تنظیمات سازمان
- Project Access
- Audit Log
- غیرفعال‌سازی و Offboarding

### 3. `PROJECT_MANAGER` — مدیر پروژه
- ساخت و مدیریت Project/Milestone
- Backlog و Intake
- برنامه‌ریزی و Prioritization
- Weekly Review
- گزارش
- مدیریت Project Membership

### 4. `TEAM_LEAD` — سرپرست تیم
- مدیریت Backlog تیم
- Assign/Reassign
- Estimate و Capacity Review
- Review/QA assignment
- Risk/Dependency
- مشاهده Workload اعضای همان تیم
- تغییر Delivery Health در محدوده مجاز

### 5. `CONTRIBUTOR` — عضو اجرایی
- مشاهده پروژه‌های مجاز
- ایجاد/ویرایش Task در محدوده مجاز
- Update State
- Comment/Mention
- Estimate
- ثبت Blocker
- Submit for Review
- ثبت Evidence

### 6. `REQUESTER` — درخواست‌دهنده
- ایجاد Intake
- مشاهده درخواست‌های مجاز خود
- پاسخ به Needs Info
- مشاهده Decision نهایی
- بدون دسترسی پیش‌فرض به جزئیات فنی محرمانه

### 7. `VIEWER` — مشاهده‌گر
- فقط Read-only در محدوده‌ای که به او داده شده است.

> یک Role می‌تواند چند Capability داشته باشد. در آینده Roleهای Custom قابل اضافه شدن هستند، ولی MVP با همین Roleهای پایه شروع می‌شود.

## 6.5 نقش‌های پروژه‌ای

| Project Role | کاربرد |
|---|---|
| `OWNER` | مسئول نهایی پروژه و سلامت آن |
| `EDITOR` | مدیریت Scope، Milestone، Task و برنامه |
| `REVIEWER` | بازبینی Deliverableها |
| `MEMBER` | اجرای کارهای پروژه |
| `VIEWER` | مشاهده پروژه |

Role پروژه‌ای نمی‌تواند Permission سازمانی بالاتری از سقف Role نرم‌افزاری ایجاد کند.

## 6.6 ماتریس RBAC پیشنهادی

| قابلیت | Owner/Admin | Project Manager | Team Lead | Contributor | Requester | Viewer |
|---|---:|---:|---:|---:|---:|---:|
| ایجاد/غیرفعال‌سازی کاربر | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| مدیریت Team/Role | ✅ | محدود به Project Membership | محدود به تیم | ❌ | ❌ | ❌ |
| ایجاد پروژه | ✅ | ✅ | با مجوز | ❌ | ❌ | ❌ |
| مدیریت اعضای پروژه | ✅ | ✅ | با مجوز | ❌ | ❌ | ❌ |
| ایجاد Task | ✅ | ✅ | ✅ | ✅ | محدود به Intake/Project Policy | ❌ |
| Assign Task | ✅ | ✅ | در تیم/پروژه | خود-Assign در صورت Policy | ❌ | ❌ |
| ثبت Intake | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Triage Intake | ✅ | ✅ | ✅ با مجوز | ❌ | ❌ | ❌ |
| تغییر P0/P1 | ✅ | با Policy | با Policy | ❌ | ❌ | ❌ |
| ثبت/تأیید Decision | ✅ | ✅ | فنی/تیمی | پیشنهاد | پیشنهاد | ❌ |
| مشاهده Capacity | ✅ | پروژه/تیم | تیم | شخصی + خلاصه تیم در صورت مجوز | ❌ | خلاصه مجاز |
| Review/QA | ✅ | با نقش Reviewer | ✅ | در صورت Reviewer شدن | ❌ | ❌ |
| Weekly Review | ✅ | ✅ | ✅ | مشاهده/Actionهای خود | مرتبط | مشاهده |
| Audit امنیتی | ✅ | محدود | محدود | ❌ | ❌ | ❌ |

## 6.7 چرخه کامل افزودن کاربر — ساده برای Pilot

در Pilot فعلی SMTP/Invite Email حذف می‌شود تا راه‌اندازی ساده بماند.

```text
Admin
  ↓
«افزودن عضو»
  ↓
نام و نام خانوادگی
  ↓
ایمیل یا Username
  ↓
سمت سازمانی
  ↓
Primary Team + Team Memberships
  ↓
Application Role
  ↓
Manager/Lead اختیاری
  ↓
Temporary Password
  ↓
Account = ACTIVE
  + must_change_password = true
  ↓
کاربر URL Pilot را باز می‌کند
  ↓
Login با Temporary Password
  ↓
تغییر اجباری Password
  ↓
My Work / Projects
```

### قواعد
- ثبت‌نام عمومی وجود ندارد.
- Temporary Password فقط هنگام ایجاد/Reset نمایش داده شود و در DB فقط Hash ذخیره شود.
- کاربر در اولین Login مجبور به تغییر Password است.
- Admin بتواند در صورت فراموشی Password، Temporary Password جدید صادر کند.
- Account کاربر برای استفاده از Pilot نیاز به GitHub Account ندارد.
- SMTP و Invite Link در MVP **Future/Optional** هستند.
- تمام Role/Team/Project Accessها Audit شوند.

## 6.8 وضعیت عضو

برای Pilot:

- `ACTIVE` — فعال و مجاز به Login
- `SUSPENDED` — موقتاً بدون امکان Login
- `DISABLED` — دسترسی بسته/Offboard شده

فیلد مستقل:

- `must_change_password = true/false`

`INVITED` و Invitation Token در MVP وجود ندارند؛ فقط اگر بعداً Email Invite واقعاً لازم شد به‌عنوان Future Feature اضافه می‌شوند.

حذف فیزیکی کاربر از سیستم ممنوع است اگر Activity تاریخی دارد.

## 6.9 Onboarding

پس از فعال شدن عضو:
- تکمیل نام نمایشی/Avatar اختیاری
- مشاهده Team و Lead
- مشاهده پروژه‌های Assigned
- مطالعه راهنمای «Workflow / Health / Priority»
- مشاهده My Work
- تکمیل Onboarding Taskهای Role-specific
- تأیید Notification preference
- تکمیل Capacity پیش‌فرض

Onboarding Template برای Role/Team قابل تنظیم است.

## 6.10 تغییر نقش، تیم یا مسئول مستقیم

هر تغییر باید:
- Effective Date داشته باشد؛
- توسط فرد مجاز انجام شود؛
- در Audit ثبت شود؛
- Project Access مجدداً محاسبه شود؛
- Workload و Taskهای فعلی را نمایش دهد؛
- در صورت جابه‌جایی، Reassignment پیشنهادی نشان دهد.

## 6.11 عدم حضور و ظرفیت

برای برنامه‌ریزی فقط اطلاعات عملیاتی لازم است:
- Available Hours
- Working Days
- Unavailable Date Range
- توضیح اختیاری عمومی مثل «مرخصی/عدم دسترسی»

سیستم نباید دلیل پزشکی یا اطلاعات حساس را برای Capacity اجباری کند.

## 6.12 Offboarding امن

```text
Admin starts Offboarding
  ↓
Revoke Login Sessions
  ↓
Membership = DISABLED
  ↓
List owned Tasks / Projects / Risks / Decisions / Reviews
  ↓
Reassign ownership
  ↓
Remove future project access
  ↓
Preserve comments/history/audit
  ↓
Close checklist
```

Offboarding تا وقتی Ownerهای حیاتی بدون جانشین هستند باید Warning بدهد.

## 6.13 مدیریت افراد بدون «رتبه‌بندی عملکرد»

داشبورد سرپرست می‌تواند این موارد را نشان دهد:
- ظرفیت برنامه‌ریزی‌شده
- Workload فعال
- کارهای Overdue
- Blocked Aging
- Review Queue
- Unplanned Work
- Allocation بین Work Streamها

اما نباید از آن یک **Performance Score**، رتبه‌بندی افراد یا تصمیم خودکار درباره ارتقا/تنبیه ساخته شود. هدف این داده‌ها برنامه‌ریزی و رفع مانع است.

---
# 7) مدل مفهومی محصول

## 7.1 ساختار سلسله‌مراتبی

```text
Organization
├── People / Members
│   ├── Job Title
│   ├── Application Role
│   ├── Team Memberships
│   ├── Manager / Lead
│   ├── Capacity / Availability
│   └── Onboarding / Offboarding
├── Teams
│   ├── Backend
│   ├── Frontend
│   ├── Marketing & Growth
│   └── Design & Content
├── Projects
│   ├── Project Brief / Objectives
│   ├── Members & Roles
│   ├── Milestones
│   ├── Epics / Features
│   │   ├── Tasks
│   │   │   └── Subtasks
│   ├── Risks
│   ├── Decisions
│   ├── Change Requests
│   └── Weekly Reviews
├── Intake Queue
├── Support / Ops Queue
├── Capacity Plans
├── Review / QA Queue
├── Handoffs
└── Reports
```

## 7.2 دو محور مستقل برای هر Work Item

### محور 1: مرحله اجرا (Workflow State)

- `INBOX` — تازه ثبت شده و نیازمند مرتب‌سازی
- `BACKLOG` — پذیرفته شده ولی هنوز آماده/متعهد نشده
- `READY` — آماده شروع
- `IN_PROGRESS` — در حال انجام
- `IN_REVIEW` — خروجی آماده بازبینی
- `IN_QA` — در حال کنترل کیفیت/پذیرش
- `DONE` — تمام شده
- `CANCELLED` — لغو شده

### محور 2: سلامت تحویل (Delivery Health)

- `ON_TRACK` — در مسیر
- `AT_RISK` — در معرض تأخیر/افت کیفیت
- `BLOCKED` — بدون رفع مانع جلو نمی‌رود
- `UNKNOWN` — داده کافی نداریم

این دو محور هرگز با هم ادغام نمی‌شوند.

مثال:
- مرحله اجرا: `IN_REVIEW`
- سلامت تحویل: `AT_RISK`

یعنی خروجی آماده Review است، ولی ریسک زمانی یا کیفی وجود دارد.

## 7.3 سه سطح مسئولیت Work Item

- **Owner:** مسئول نتیجه و پاسخ‌گویی
- **Assignee:** فرد/افرادی که کار را اجرا می‌کنند
- **Reviewer / QA Owner:** فردی که خروجی را بازبینی یا اعتبارسنجی می‌کند

Owner می‌تواند Assignee هم باشد، ولی برای کارهای مهم بهتر است Reviewer مستقل باشد؛ در تیم‌های تک‌نفره Exception باید قابل ثبت باشد.

## 7.4 تفاوت Due Date و ETA

- `Due Date`: موعد مورد تعهد/نیاز کسب‌وکار؛ تغییر آن کنترل‌شده است.
- `ETA`: پیش‌بینی فعلی تیم از زمان اتمام؛ با Confidence و Assumption تغییر می‌کند.

این دو نباید یک فیلد واحد باشند.

---
# 8) ماژول‌های محصول

## M01 — Authentication & Organization

- Login / Logout
- Forgot / Reset Password
- Create User with Temporary Password
- Admin Reset Password
- Suspend / Disable User
- Session Management و Revoke All Sessions
- Application Role Assignment
- Organization Settings
- Team Management
- Project Membership
- Audit تغییرات دسترسی

## M01B — People & Team Management

- فهرست اعضا با جست‌وجو و فیلتر
- پروفایل عملیاتی عضو
- Job Title مستقل از Permission
- Primary Team و Multi-team Membership
- Team Lead / Manager
- Weekly Capacity و Availability
- Onboarding Checklist
- Offboarding + Reassignment
- Team workload view
- Review Queue هر Team
- اعضای Active / Suspended / Disabled
- گزارش کارهای بدون Owner هنگام خروج/جابجایی عضو

## M02 — Executive Dashboard

- تعداد Work Itemهای فعال
- تفکیک بر اساس 4 Work Stream
- On Track / At Risk / Blocked / Unknown
- Top 5 Priorities
- Blocked Aging
- ETA Changes
- Capacity Distribution
- Priority Changes
- Open Decisions
- Support Critical Count

## M03 — Projects

- Create/Edit/Archive Project
- Project Owner
- Product Area
- Project Health
- Start/Target Date
- Project Members
- Milestones
- Project Summary
- Project Activity

## M04 — Work Items / Task Management

- Epic
- Feature
- Task
- Subtask
- Bug
- Tech Debt Item
- Infrastructure Item
- Support-linked Work Item
- Parent/Child hierarchy
- Owner
- Primary Assignee + Collaborators
- Reviewer
- QA Owner
- Watchers
- Labels
- Start Date
- Due Date
- ETA + Confidence + Assumptions
- Estimate
- Acceptance Criteria
- Definition of Done
- Checklist
- Comments + Mentions
- Attachments / Evidence
- Dependencies
- Blockers
- Handoff
- Change Reason
- Activity / History
- Duplicate / Clone
- Task Templates
- Bulk actions با Permission
- Stale / Overdue / Due Soon flags
- Recurring Task در P2

### Workflow استاندارد

```text
INBOX
  ↓
BACKLOG
  ↓
READY
  ↓
IN_PROGRESS
  ↓
IN_REVIEW
  ├── Changes Requested → IN_PROGRESS
  └── Approved
        ↓
   IN_QA  (اگر qa_required=true)
        ├── Failed → IN_PROGRESS
        └── Passed → DONE
```

اگر QA برای نوع کار لازم نباشد، `IN_REVIEW → DONE` با Rule مجاز است.

## M05 — Board / Backlog / Timeline

### Kanban
- **Global Kanban** برای مشاهده همه Work Itemهای مجاز در همه پروژه‌ها
- **Project Kanban** برای یک پروژه
- **Team Kanban** برای Backend / Frontend / Marketing / Design & Content
- **My Work Kanban** برای کارهای خود فرد
- Backlog List
- Group/Swimlane by Project / Team / Work Stream / Owner / Health / Priority
- Filter by Priority, Status, Type, Team, Owner, Assignee, Milestone و Date Range
- Saved Views
- Drag & Drop با کنترل Permission و Transition Rule
- WIP warning اختیاری
- کارت باید Project، Priority، Assignee، Health، ETA و میزان Drift زمانی را به‌شکل خلاصه نشان دهد

### Gantt / Timeline
- **Global Gantt** برای مشاهده پروژه‌ها، Milestoneها و Work Itemهای دارای تاریخ
- **Project Gantt** برای برنامه یک پروژه
- Zoom روز / هفته / ماه
- نمایش Dependency بین Work Itemها
- نمایش Milestone
- نمایش Baseline ETA در کنار Current ETA برای دیدن جابه‌جایی برنامه
- فیلتر Project / Team / Owner / Priority / Health / Work Stream
- آیتم بدون تاریخ در بخش «بدون برنامه زمانی» باقی بماند و از Gantt حذف منطقی نشود
- Drag تاریخ روی Gantt فقط در صورت Permission مجاز است و باید همان Rule تغییر ETA، Reason و History را اجرا کند؛ تغییر خاموش تاریخ ممنوع است
- Auto resource leveling و Critical Path پیشرفته در MVP لازم نیست

## M06 — Intake Queue

- ثبت درخواست
- Source
- Request Type
- Business Problem
- Customer/Business Value
- Urgency
- Triage Status
- Convert to Work Item / Reject / Defer / Merge
- Decision Reason

## M07 — Prioritization

- Impact
- Effort
- Risk/Urgency
- Opportunity Cost
- Strategic Alignment
- Score پیشنهادی
- Manual Override با Reason
- Priority History
- Displaced Work Item هنگام بالا آوردن اولویت

## M08 — Feature Brief

- Problem
- Value
- Scope In
- Scope Out
- Acceptance Criteria
- Risks
- Dependencies
- ETA
- Confidence
- Assumptions
- Approval State

## M09 — Risk / Blocker / Dependency

- Risk Register
- Probability
- Impact
- Severity
- Mitigation
- Owner
- Due Date
- Blocker Reason
- Next Action
- Dependency relationship
- Aging

## M10 — Decision Log

- Decision
- Context
- Reason
- Alternatives اختیاری
- Impact on Time / Quality / Cost / Risk
- Owner
- Decided By
- Date
- Related Project/Work Item
- Revisit Date اختیاری

## M11 — Support / Ops

- Critical / Operational / Product Input
- Incident/Request fields
- Customer
- Transaction/Reference ID اختیاری
- Severity
- Start/Resolve Date
- Time Consumed
- Root Cause
- Convert to Product Input
- Link to Tech Debt

## M12 — Capacity & Workload

- Team Capacity per week
- Member Availability
- Planned Allocation
- Actual Allocation
- Time Spent اختیاری
- Work Stream split
- Over-allocation warning
- Focus Load / concurrent active tasks

## M13 — Weekly Delivery Review

- Auto-generated agenda
- Planned vs Actual
- At Risk / Blocked items
- Decisions Needed
- Priority Changes
- New Critical Work
- Deferred Work
- Meeting Notes
- Action Items
- Snapshot after closing review

## M14 — Reports

- Weekly Executive Report
- Monthly Management Report
- Capacity Report
- Delivery Health Trend
- Support Consumption
- Tech Debt Impact
- ETA Accuracy
- Blocker Aging
- Priority Change Report
- Work Stream Distribution

## M15 — Notifications

- In-app notifications
- Email optional
- Assignment
- Mention
- Blocked
- Due soon
- ETA changed
- Priority changed
- Decision assigned
- Weekly Review reminder

## M16 — Search & Filters

- Global Search
- Work Item Search
- Project Search
- Decision Search
- Filters
- Saved Views

## M17 — Audit & Activity

- Change log per entity
- Security audit
- Actor
- Before/After for sensitive fields
- Timestamp
- IP/User Agent برای Login events

## M18 — My Work / Team Work

### My Work
- کارهای Assigned به من
- کارهای Owned توسط من
- Today / Due Soon / Overdue
- Waiting for My Review
- Waiting for My QA
- Blocked / At Risk
- Mentions
- My Intake
- My Weekly Commitments

### Team Work برای Lead
- Active items by member
- Unassigned work
- Overdue
- Blocked Aging
- Review Queue
- QA Queue
- Capacity / Over-allocation
- WIP per member
- Unplanned Work

## M19 — Handoff & Approval

- تحویل Backend → Frontend
- تحویل Design → Frontend
- تحویل Design/Content → Marketing
- تحویل Feature → Review/QA
- Sender / Receiver
- Acceptance criteria for handoff
- Pending / Accepted / Returned / Completed
- Handoff aging
- Comment/Evidence
- Notification به Receiver

Handoff نباید جای Dependency را بگیرد؛ Dependency رابطه فنی/برنامه‌ای است و Handoff یک «تحویل مسئولیت/خروجی» قابل پیگیری.

---

# 9) جریان‌های کاری End-to-End

## WF01 — ورود یک درخواست جدید

```text
Requester
  ↓
Create Intake
  ↓
Classify Source + Work Stream + Urgency
  ↓
Triage
  ├── Reject → Reason ثبت شود
  ├── Defer → Review Date
  ├── Merge → لینک به درخواست موجود
  └── Accept
        ↓
   Prioritization
        ↓
   Scope / Feature Brief اگر لازم است
        ↓
   Capacity Check
        ↓
   Convert to Work Item
        ↓
   Ready / Scheduled
```

### Rule
هیچ Intake پذیرفته‌شده‌ای نباید بدون Priority و Owner وارد `READY` شود.

## WF02 — Critical Support Fast Track

```text
Support Request
  ↓
Severity = Critical
  ↓
Auto-create / Link Work Item
  ↓
Notify Tech Lead + PM
  ↓
Set Delivery Health = Blocked/At Risk برای کارهای متاثر در صورت نیاز
  ↓
Record capacity consumed
  ↓
Resolve
  ↓
Root Cause + Follow-up Tech Debt/Product Input
```

حتی Fast Track باید Log کامل داشته باشد.

## WF03 — ایجاد Feature مهم

```text
Feature Created
  ↓
Feature Brief Required
  ↓
Problem + Value + Scope + AC
  ↓
Tech Review: Effort + Risks + Dependencies
  ↓
Capacity Check
  ↓
ETA + Confidence + Assumptions
  ↓
Priority Approval
  ↓
Ready
```

## WF04 — تغییر Priority

```text
Priority Change Requested
  ↓
Reason Required
  ↓
If P0/P1 or major change:
  Displaced Work Item Required
  ↓
Approve based on policy
  ↓
Update queue
  ↓
Notify owners
  ↓
Write Priority History
```

## WF05 — Blocker

```text
User marks Blocked
  ↓
Blocker Reason Required
  ↓
Blocker Owner / External dependency
  ↓
Next Action + Expected Resolution
  ↓
Notification
  ↓
Weekly Review automatically includes item
  ↓
Resolve Blocker
  ↓
Resolution Note + Health recalculation
```

## WF06 — Estimate / ETA Change

اولین ETA که به‌عنوان تعهد کاری ثبت می‌شود، **First Committed ETA / Baseline اولیه** است و هیچ‌گاه overwrite نمی‌شود. مقدار جاری ETA در Work Item نگه‌داری می‌شود و هر تغییر یک نسخه جدید در History می‌سازد.

اگر ETA کار P0/P1، Feature مهم یا هر Task دارای ETA تغییر کند:

- Old ETA حفظ شود.
- New ETA ثبت شود.
- `change_reason_type` انتخاب شود.
- Reason for Change برای تغییر مهم اجباری باشد.
- Risk/Blocker/Dependency مرتبط در صورت وجود Link شود.
- Confidence دوباره ثبت شود.
- Assumptionهای تغییرکرده مشخص شوند.
- Watchers مطلع شوند.
- تغییر در گزارش هفتگی دیده شود.
- سیستم Delta را به روز تقویمی محاسبه کند.
- تعداد تغییرات و Drift از Baseline محاسبه شود.

Reason Typeهای استاندارد:

- `REESTIMATE` — برآورد مجدد پس از شناخت بیشتر
- `SCOPE_CHANGE` — تغییر Scope
- `BLOCKER` — مانع
- `DEPENDENCY` — وابستگی
- `PRIORITY_CHANGE` — تغییر اولویت
- `CAPACITY_CHANGE` — تغییر ظرفیت/مرخصی/جابجایی نفر
- `SUPPORT_INTERRUPT` — ورود کار پشتیبانی یا Incident
- `TECHNICAL_DISCOVERY` — کشف فنی جدید
- `EXTERNAL` — عامل بیرونی
- `OTHER` — سایر، همراه Reason

نکته: این داده برای فهم کیفیت برنامه‌ریزی و علت جابه‌جایی‌هاست، نه امتیازدهی ساده به افراد.

## WF07 — Weekly Review

```text
Create Review Snapshot
  ↓
System loads:
- last commitments
- actual completed
- at risk / blocked
- new critical work
- ETA changes
- priority changes
- decisions needed
  ↓
Review meeting
  ↓
Decisions + Actions
  ↓
Next week commitments
  ↓
Close Review
  ↓
Immutable snapshot + report
```


## WF08 — چرخه افزودن و Onboarding عضو

```text
Admin creates user
  ↓
Name + Email/Username + Temporary Password
  ↓
Job Title + Team + App Role + Capacity
  ↓
Project access assigned
  ↓
User logs in
  ↓
Forced password change
  ↓
Onboarding checklist created
  ↓
User completes product workflow guide
  ↓
Lead confirms operational readiness
```

## WF09 — اجرای یک تسک تا Review و QA

```text
READY
  ↓
Assignee starts
  ↓
IN_PROGRESS
  ↓
Implementation / Deliverable + Evidence
  ↓
Submit for Review
  ↓
IN_REVIEW
  ├── Changes Requested → IN_PROGRESS
  └── Approved
       ↓
  QA Required?
  ├── No → DONE
  └── Yes → IN_QA
              ├── Failed → IN_PROGRESS
              └── Passed → DONE
```

### Review Policy برای تیم فعلی
- Backend: برای کار آقای گلی، Reviewer پیش‌فرض می‌تواند خانم ترابی باشد.
- Backend Lead work: Reviewer مستقل در صورت وجود فرد واجد شرایط؛ در غیر این صورت `Review Exception` + Test Evidence + QA/UAT لازم است.
- Frontend: آقای دلیری Reviewer پیش‌فرض کارهای اعضای آینده Frontend است. تا زمانی که Frontend تک‌نفره است، Exception قابل ثبت است و QA/UAT باید تقویت شود.
- Design/Content: Reviewer بر اساس پروژه؛ برای محتوای کمپین می‌تواند عضو مسئول Marketing باشد.
- Marketing: Approval مسیر پروژه/کمپین را دنبال می‌کند.
- هیچ Rule نام‌محور Hard-code نمی‌شود؛ این‌ها فقط Seed/Default قابل تغییر هستند.

## WF10 — Handoff بین تیم‌ها

```text
Source Task / Deliverable
  ↓
Create Handoff
  ↓
Receiver Team/User
  ↓
Acceptance Criteria + Required Evidence
  ↓
Receiver Accepts
  ├── Return with reason
  └── Start dependent work
  ↓
Handoff Completed
```

نمونه:
- API Backend آماده می‌شود → Handoff به Frontend
- Design نهایی می‌شود → Handoff به Frontend
- Content آماده می‌شود → Handoff به Marketing

## WF11 — تغییر/خروج عضو

```text
Role/Team Change or Offboarding
  ↓
System finds:
- owned projects
- owned tasks
- assigned tasks
- review/QA queue
- open risks
- open decisions
  ↓
Reassignment plan
  ↓
Access change
  ↓
Sessions revoked if needed
  ↓
Audit + effective date
```

---

# 10) وضعیت‌ها، دسته‌بندی‌ها و قواعد کسب‌وکار

## 10.1 Work Item Kind

- `EPIC`
- `FEATURE`
- `TASK`
- `SUBTASK`
- `BUG`
- `SUPPORT_ITEM`
- `TECH_DEBT_ITEM`
- `INFRA_ITEM`

## 10.2 Work Stream

- `PRODUCT`
- `TECH_DEBT`
- `SUPPORT`
- `INFRASTRUCTURE`

## 10.3 Priority

- `P0_CRITICAL`
- `P1_HIGH`
- `P2_MEDIUM`
- `P3_LOW`
- `P4_PARKED`

## 10.4 Workflow State

| State | عنوان فارسی UI | معنی | قانون ورود |
|---|---|---|---|
| `INBOX` | ورودی | تازه ثبت شده/نیازمند مرتب‌سازی | حداقل Title + Reporter |
| `BACKLOG` | بک‌لاگ | پذیرفته شده ولی هنوز آماده شروع نیست | Work Stream + Priority اولیه |
| `READY` | آماده شروع | Scope حداقلی و مسئولیت روشن است | Owner + Assignee/Team + Priority + DoR |
| `IN_PROGRESS` | در حال انجام | اجرای واقعی شروع شده | Assignee + Start timestamp |
| `IN_REVIEW` | در بازبینی | خروجی برای Reviewer ارسال شده | Reviewer یا Review Exception |
| `IN_QA` | کنترل کیفیت | Acceptance/QA در حال انجام است | QA Required + QA Owner/Policy |
| `DONE` | انجام‌شده | Acceptance Criteria/DoD پاس شده | Review/QA gates + no open blocker |
| `CANCELLED` | لغوشده | کار متوقف دائمی | Cancellation reason |

### قانون
`BLOCKED` یک Workflow State نیست؛ یک `Delivery Health` است. بنابراین Task می‌تواند `IN_PROGRESS + BLOCKED` باشد و بعد از رفع مانع همان مرحله اجرا را ادامه دهد.


## 10.5 Delivery Health

| Health | تعریف |
|---|---|
| ON_TRACK | طبق فرض‌های فعلی جلو می‌رود |
| AT_RISK | بدون اقدام/تصمیم احتمال اثر روی زمان/کیفیت وجود دارد |
| BLOCKED | بدون رفع مانع جلو نمی‌رود |
| UNKNOWN | اطلاعات برای قضاوت کافی نیست |

## 10.6 ETA Confidence

- `LOW` — داده کم یا وابستگی زیاد
- `MEDIUM` — Scope نسبتاً روشن، چند ریسک باز
- `HIGH` — Scope روشن، ظرفیت مشخص، وابستگی‌ها کنترل شده

## 10.7 Support Classification

### Critical
نمونه: قطعی سرویس، اختلال جدی تراکنش، اثر گسترده مشتری.

قانون:
- Fast Track مجاز
- ثبت زمان مصرف‌شده اجباری
- Incident Review بعد از رفع برای Severity بالا

### Operational
نمونه: مغایرت، پیگیری تراکنش، تغییر درگاه.

قانون:
- وارد Queue روزانه/هفتگی می‌شود
- Priority مشخص می‌شود

### Product Input
نمونه: درخواست تکرارشونده مشتری یا فروش.

قانون:
- مستقیم Task فنی نمی‌شود
- وارد Intake محصول می‌شود

---

# 11) مدل اولویت‌گذاری

## 11.1 ورودی‌های Priority

هر Intake/Feature مهم می‌تواند این امتیازها را داشته باشد:

- `Impact`: 1..5
- `Urgency`: 1..5
- `Risk if not done`: 1..5
- `Strategic Alignment`: 1..5
- `Effort`: 1..5

## 11.2 امتیاز پیشنهادی

```text
Priority Score =
((Impact * 3) + (Urgency * 2) + (RiskIfNotDone * 2) + StrategicAlignment)
/ max(Effort, 1)
```

این Score فقط **پیشنهاد تصمیم** است؛ جایگزین تصمیم مدیریتی نیست.

## 11.3 Manual Override

اگر Priority نهایی با Score تفاوت معنی‌دار دارد:

- Override Reason اجباری
- Decided By ذخیره شود
- تاریخچه حفظ شود

## 11.4 Opportunity Cost Rule

برای بالا آوردن یک کار به P0/P1 در شرایط ظرفیت پر:

- حداقل یک `Displaced Work Item` باید مشخص شود؛ یا
- افزایش ظرفیت/کاهش Scope ثبت شود.

سیستم نباید اجازه دهد Priority فقط «اضافه» شود بدون اینکه اثر روی ظرفیت دیده شود.

---

# 12) مدیریت ظرفیت و Workload

## 12.1 مدل ساده MVP

برای هر Member در هر هفته:

- Available Hours
- Leave / Unavailable Hours
- Planned Hours یا Capacity Units
- Allocated Hours/Points
- Actual Time اختیاری

## 12.2 Capacity View

نمای تیم باید نشان دهد:

- ظرفیت کل هفته
- تخصیص به Product
- Tech Debt
- Support
- Infrastructure
- Unplanned Work
- Remaining Capacity

## 12.3 Focus Load

تعداد Work Itemهای `IN_PROGRESS` هر نفر نمایش داده شود.

قانون پیشنهادی:
- بیشتر از 3 کار همزمان → Warning
- مقدار قابل تنظیم توسط Admin

## 12.4 Unplanned Work

هر کاری که بعد از Weekly Commitment وارد `IN_PROGRESS` می‌شود به صورت `Unplanned` علامت می‌خورد، مگر اینکه از قبل برنامه‌ریزی شده باشد.

این داده برای فهم علت به‌هم خوردن برنامه بسیار مهم است.


## 12.5 Review Load

فقط تعداد Taskهای در حال اجرا کافی نیست. برای هر عضو نمایش داده شود:
- Active Work
- Waiting for Review by this member
- Waiting for QA by this member
- Blocked owned items
- Due this week

Lead هنگام Assign کردن کار جدید باید هم Focus Load و هم Review Load را ببیند.

## 12.6 Team Lead Workload View

برای هر Team:
- Available Capacity
- Planned Capacity
- Remaining Capacity
- WIP
- Overdue
- Unassigned
- Review Queue
- QA Queue
- Unplanned Work

## 12.7 قواعد Overload

Default پیشنهادی، قابل تنظیم:
- Allocation > 100% → Warning
- بیش از 3 Work Item فعال → Focus Warning
- بیش از 5 Review باز → Review Queue Warning
- Task بدون Update بیش از N روز → Stale Warning

Warning مانع سخت ایجاد نمی‌کند مگر Admin/Project Policy آن را Hard Gate کند.

## 12.8 Availability و عدم حضور

- عدم حضور ظرفیت را کم می‌کند.
- Taskهای Due در بازه عدم حضور به Lead هشدار می‌دهند.
- دلیل خصوصی/پزشکی اجباری نیست.
- Capacity change در گزارش Weekly Plan دیده می‌شود.

---

# 13) مدیریت پروژه، تسک، Review/QA و Handoff

## 13.1 Project

فیلدهای اصلی:

- Name
- Code
- Description
- Objective / Outcome
- Owner
- Team(s)
- Project Members + Project Roles
- Product/Business Area
- Start Date
- Target Date
- Health
- Status
- Strategic Priority
- Success Metrics
- Scope In / Scope Out
- Tags

### وضعیت Project

- `DRAFT`
- `PLANNING`
- `ACTIVE`
- `ON_HOLD`
- `COMPLETED`
- `ARCHIVED`

## 13.2 Project Brief

برای پروژه‌های مهم:
- مسئله/فرصت
- Outcome مورد انتظار
- Success Metric
- Scope In
- Scope Out
- Owner
- Stakeholders
- Target Date
- Dependencies
- Top Risks
- Milestones

هدف، سند سنگین نیست؛ یک نمای مشترک برای جلوگیری از Scope Drift است.

## 13.3 Milestone

- Name
- Project
- Target Date
- Status
- Success Criteria
- Owner
- Related Work Items
- Health
- Progress summary

## 13.4 Work Item

فیلدهای مشترک:

- Key
- Kind
- Title
- Description
- Project
- Parent
- Milestone
- Work Stream
- Owner
- Assignee(s)
- Reviewer
- QA Owner
- Workflow State
- Delivery Health
- Priority
- Start Date
- Due Date
- ETA Range
- ETA Confidence
- ETA Assumptions
- Estimate
- Acceptance Criteria
- Definition of Done
- Labels
- Checklist
- Attachments/Evidence
- Dependencies
- Blockers
- Watchers
- Source / Intake
- Change Reason when required

## 13.5 Task Template

### Backend Task
- Requirement/API behavior
- Data/DB impact
- Security/Permission impact
- Acceptance Criteria
- Unit/Integration test expectation
- Reviewer
- Migration impact

### Frontend Task
- User flow
- UI state/loading/error/empty states
- Responsive requirement
- RTL/Persian requirement
- API dependency
- Acceptance Criteria
- Visual/Functional QA

### Design / Content Task
- Brief
- Audience
- Deliverable format
- References/constraints
- Reviewer/Approver
- Acceptance Criteria
- Final asset attachment/link

### Marketing Task
- Goal
- Audience/Channel
- Deliverable
- Due Date
- Dependency on Design/Content
- Success metric where applicable
- Approval

### Bug
- Steps to reproduce
- Expected
- Actual
- Environment
- Severity
- Evidence
- Regression test/evidence
- Root cause for critical bugs

## 13.6 تعریف مسئولیت‌ها

### Owner
مسئول Outcome و شفافیت وضعیت است.

### Assignee
مسئول اجرای کار است.

### Reviewer
درستی/کیفیت Deliverable را قبل از QA بررسی می‌کند.

### QA Owner
Acceptance Criteria را اعتبارسنجی می‌کند.

### Watcher
فقط Updateها را دنبال می‌کند.

## 13.7 My Work

هر کاربر صفحه «کارهای من» دارد:

1. امروز
2. سررسید نزدیک
3. عقب‌افتاده
4. در حال انجام
5. منتظر بازبینی من
6. منتظر QA من
7. Blocked / At Risk
8. Mentionها
9. Intakeهای من
10. تعهدهای هفته من

Quick Update از همین صفحه:
- State
- Health
- ETA
- Blocker
- Comment
- Submit Review

## 13.8 Team Work

Lead یک نمای عملیاتی دارد:
- Work by member
- Work by State
- WIP
- Unassigned
- Overdue
- Blocked
- Review Queue
- QA Queue
- Capacity
- Unplanned
- Work Stream Split

## 13.9 Review و QA

### Review
- Reviewer مشخص یا Review Exception
- Review Result: `APPROVED / CHANGES_REQUESTED`
- Comment/Evidence
- Timestamp
- Reviewer history

### QA
- `qa_required` بر اساس نوع/پروژه
- QA Result: `PASSED / FAILED`
- Failed QA باید دلیل و Evidence داشته باشد.
- Failed → بازگشت به `IN_PROGRESS`
- Passed → اجازه `DONE`

برای Featureهای مهم، UAT می‌تواند به‌عنوان یک QA Step جدا یا Approval اضافه شود.

## 13.10 Handoff

Handoff برای تحویل خروجی بین تیم‌ها:
- From User/Team
- To User/Team
- Related Work Item
- Deliverable
- Acceptance Criteria
- Evidence/Attachment
- Due/Expected Handoff Date
- Status
- Return Reason

Status:
- `PENDING`
- `ACCEPTED`
- `RETURNED`
- `COMPLETED`
- `CANCELLED`

## 13.11 WIP Limit

WIP Limit در سطح:
- Organization default
- Team
- Member optional

هدف:
- جلوگیری از شروع همزمان کارهای زیاد
- کاهش Context Switching
- نمایان کردن Review Bottleneck

در MVP Warning کافی است؛ Hard limit اختیاری است.

## 13.12 Overdue و Stale

### Overdue
`due_date < today` و `state != DONE/CANCELLED`

### Stale
Active Task که طی N روز Activity معتبر نداشته باشد.

هر دو در:
- My Work
- Team Work
- Weekly Review
- Executive Report

نمایش داده می‌شوند.

## 13.13 Change Request پروژه

برای تغییرات معنی‌دار:
- Scope Change
- Target Date Change
- Strategic Priority Change
- Major Resource/Capacity Change

باید `Change Request` ثبت شود:
- What changed
- Why
- Impact on date/capacity/risk
- Requested by
- Decided by
- Decision
- Related displaced work

این قابلیت برای پروژه‌های کوچک می‌تواند اختیاری و برای پروژه‌های P0/P1 اجباری باشد.

---
# 14) Intake و Support/Ops

## 14.1 Intake Form عمومی

فیلدها:

- Title
- Description / Problem
- Source
- Requested By
- Work Stream پیشنهادی
- Requested Priority
- Business Impact
- Urgency
- Risk if not done
- Customer / Account اختیاری
- Opportunity Value اختیاری
- Evidence / Attachment
- Desired Date اختیاری

## 14.2 Triage State

- `NEW`
- `NEEDS_INFO`
- `UNDER_REVIEW`
- `ACCEPTED`
- `DEFERRED`
- `REJECTED`
- `MERGED`
- `CONVERTED`

## 14.3 Triage Decision

در `ACCEPTED / REJECTED / DEFERRED / MERGED` ثبت این موارد الزامی است:

- Decision
- Reason
- Decided By
- Date

## 14.4 Support/Ops Intake

فیلدهای اضافه:

- Classification: Critical / Operational / Product Input
- Severity
- Affected Customer Count
- Customer
- Transaction/Reference ID
- Service
- First Seen At
- Current Impact
- Workaround
- Time Consumed

## 14.5 تبدیل Support به Tech Debt

بعد از Resolve، Support Item می‌تواند Follow-up بسازد:

- Tech Debt
- Infrastructure Improvement
- Product Feature
- Monitoring Task
- No Follow-up

این رابطه باید Traceable باشد.

---

# 15) Risk، Blocker، Dependency و Decision Log

## 15.1 Risk

فیلدها:

- Title
- Description
- Probability: 1..5
- Impact: 1..5
- Risk Score = Probability × Impact
- Category
- Owner
- Mitigation
- Trigger
- Due Date
- Status: Open / Monitoring / Mitigated / Accepted / Closed
- Related Project/Work Item

## 15.2 Blocker

فیلدهای اجباری:

- Reason
- Blocked Since
- Owner of Resolution
- Next Action
- Expected Resolution Date اختیاری
- External/Internal

### Aging

سیستم باید Blocker Aging را محاسبه کند:

```text
Blocked Aging = Now - Blocked Since
```

## 15.3 Dependency

انواع:

- `BLOCKS`
- `IS_BLOCKED_BY`
- `DEPENDS_ON`
- `RELATES_TO`

قانون:
- Circular dependency برای `BLOCKS/DEPENDS_ON` نباید مجاز باشد.

## 15.4 Decision Log

فیلدها:

- Decision Title
- Context
- Decision
- Reason
- Alternatives Considered اختیاری
- Impact on Speed
- Impact on Quality
- Impact on Cost
- Impact on Risk
- Owner
- Decided By
- Decision Date
- Revisit Date اختیاری
- Related Project
- Related Work Items

## 15.5 Decision Needed

یک Work Item می‌تواند Flag `DECISION_NEEDED` داشته باشد. این آیتم خودکار وارد Agenda مرور هفتگی می‌شود.

---

# 16) Weekly Delivery Review و گزارش مدیریتی

## 16.1 ایجاد Review

سیستم برای هر هفته یک Review ایجاد می‌کند یا PM آن را دستی می‌سازد.

فیلدها:

- Period Start
- Period End
- Facilitator
- Participants
- Status: Draft / In Progress / Closed
- Notes

## 16.2 Agenda خودکار

### بخش 1 — Commitment هفته قبل
- Work Itemهای متعهدشده
- Done / Not Done

### بخش 2 — Delivery Health
- At Risk
- Blocked
- Unknownهای مهم

### بخش 3 — تغییرات
- ETA Changes
- Priority Changes
- Scope Changes

### بخش 4 — Unplanned Work
- Support Critical
- Infra Interruptions
- سایر کارهای واردشده بعد از برنامه

### بخش 5 — Decisions Needed
- Decision Needed Items
- Open Riskهای بحرانی

### بخش 6 — Next Week Commitments
- 3 تا 5 خروجی اصلی
- Tech Debt allocation
- Support buffer

## 16.3 Closing Review

بعد از `Close`:

- Snapshot تغییرناپذیر از داده‌های اصلی جلسه ذخیره شود.
- Action Itemها Task شوند.
- Decisionها وارد Decision Log شوند.
- Commitment هفته بعد ذخیره شود.

## 16.4 گزارش هفتگی مدیرعامل

خروجی باید کوتاه و اجرایی باشد:

1. Top Outcomes
2. What shipped / completed
3. At Risk / Blocked
4. Why delayed
5. Capacity distribution
6. New unplanned work
7. Decisions made
8. Decisions needed
9. Priority changes
10. Next week focus

## 16.5 گزارش ماهانه

مطابق سند باید پاسخ دهد:

- ظرفیت کجا مصرف شد؟
- چه چیزی جلو رفت؟
- چه چیزی عقب افتاد و چرا؟
- کدام Tech Debt حیاتی است؟
- تصمیم ماه بعد چیست؟

---

# 17) داشبوردها و KPIها

## 17.1 Executive Dashboard

Widgets:

- Active Work Items
- Work Stream Distribution
- Project Health
- Delivery Health Distribution
- P0/P1 Items
- Top Blockers
- Blocker Aging
- ETA Changes this week
- Critical Support this week
- Capacity by Work Stream
- Unplanned Work %
- Open Decisions Needed
- Due / Overdue Milestones

## 17.2 Tech Lead Dashboard

- Assigned team workload
- Active blockers
- Dependencies
- Tech Debt by impact
- Infrastructure risks
- Items awaiting technical estimate
- PR/QA state در صورت Integration آینده

## 17.3 PM Dashboard

- Intake aging
- Triage queue
- Ready backlog
- Current commitments
- Priority changes
- Milestone progress
- At Risk items
- Weekly Review readiness

## 17.4 Member Dashboard

- My Tasks
- Due soon
- Blocked by me
- Waiting on others
- Mentions
- Today/This week focus

## 17.5 Support Dashboard

- Open Critical
- Open Operational
- Aging
- Resolution time
- Time consumed by Support
- Product Inputs awaiting triage

## 17.6 KPI Formulaها

### Unplanned Work Ratio

```text
Unplanned Work Ratio = Unplanned effort / Total actual effort * 100
```

### ETA Accuracy

برای کارهای دارای ETA:

```text
ETA Deviation Days = Actual Completion Date - Last Committed ETA
```

### Schedule Drift from Baseline

```text
Baseline Drift Days = Current ETA End - First Committed ETA End
```

مثبت یعنی برنامه نسبت به تعهد اولیه عقب رفته و منفی یعنی جلوتر آمده است.

### Last ETA Shift

```text
Last ETA Shift Days = Current ETA End - Previous ETA End
```

### ETA Shift Count

```text
ETA Shift Count = Number of committed ETA changes after initial baseline
```

### Cumulative Schedule Movement

برای دیدن بی‌ثباتی برنامه حتی وقتی تاریخ چند بار جلو و عقب می‌شود:

```text
Cumulative Schedule Movement Days = SUM(ABS(New ETA End - Old ETA End))
```

### Final Baseline Delay

بعد از Done شدن:

```text
Final Baseline Delay Days = Actual Completion Date - First Committed ETA End
```

### Final Last-ETA Error

```text
Final Last-ETA Error Days = Actual Completion Date - Last ETA Before Completion
```

### Blocked Ratio

```text
Blocked Ratio = Blocked active items / Total active items * 100
```

### Work Stream Capacity Share

```text
Stream Share = Actual effort in stream / Total actual effort * 100
```

### Intake Aging

```text
Intake Aging = Decision Date - Created Date
```

---

# 18) PRD تفصیلی و Functional Requirements

## FR-AUTH — Authentication

### FR-AUTH-01 Login
کاربر باید با Email و Password بتواند Login کند.

**Acceptance:**
- Credential صحیح → ورود موفق
- Credential غلط → پیام عمومی بدون افشای وجود کاربر
- Membership suspended/disabled یا Account locked → عدم ورود
- Rate limit روی تلاش‌های Login

### FR-AUTH-02 Session
- Access token کوتاه‌عمر
- Refresh token چرخشی
- Logout باید Refresh session را invalidate کند.

### FR-AUTH-03 Create User
Admin باید بتواند کاربر را با Role و Team دعوت کند.

### FR-AUTH-04 Password Reset
Token یک‌بارمصرف و Expiring.

### FR-AUTH-05 Permission Enforcement
Permission فقط در UI کنترل نشود؛ Backend نیز باید enforce کند.

---

## FR-PEOPLE — مدیریت اعضا و تیم

### FR-PEOPLE-01 Member Directory
Admin/Lead مجاز بتواند فهرست اعضا را بر اساس Team، Role، Status و Job Title فیلتر کند.

### FR-PEOPLE-02 Create Member
Admin باید بتواند نام، Email، Job Title، Team، Application Role، Capacity و Project Access اولیه را تعیین کند.

**Acceptance:**
- حداقل یکی از Email یا Username اجباری است.
- Temporary Password اجباری است و hashشده ذخیره می‌شود.
- `must_change_password=true` در ساخت اولیه.
- Admin می‌تواند Password را Reset کند.
- Invitation token و SMTP در MVP وجود ندارند.

### FR-PEOPLE-03 Separate Job Title and Permission
تغییر Job Title نباید به‌صورت خودکار Permission را تغییر دهد.

### FR-PEOPLE-04 Team Membership
کاربر می‌تواند عضو چند Team باشد ولی یک Primary Team دارد.

### FR-PEOPLE-05 Lead/Manager
Team Lead و Manager/Lead relation باید قابل ثبت و تغییر Audit‌شده باشد.

### FR-PEOPLE-06 Availability
Admin/Lead یا خود کاربر طبق Policy بتواند Availability هفتگی/بازه عدم حضور را ثبت کند.

### FR-PEOPLE-07 Onboarding
Activation می‌تواند Onboarding Checklist مبتنی بر Role/Team بسازد.

### FR-PEOPLE-08 Suspend/Disable
Admin بتواند Login را Suspend/Disable کند و Sessionها بلافاصله revoke شوند.

### FR-PEOPLE-09 Offboarding Reassignment
قبل از Offboarding، سیستم باید Owned/Assigned/Review/QA/Decision/Risk items را لیست کند و Reassignment Plan بخواهد.

### FR-PEOPLE-10 No Performance Score
سیستم در MVP نباید از Task Count/Hours یک امتیاز عملکرد یا Ranking فردی بسازد.


## FR-PROJECT — Project Management

### FR-PROJECT-01 Create Project
فیلدهای Required:
- Name
- Owner
- Team یا Member Set

### FR-PROJECT-02 Archive
Archive نباید داده را حذف کند.

### FR-PROJECT-03 Project Summary
باید شمارش Work Item، Health، Milestone و Risks را نشان دهد.

### FR-PROJECT-04 Membership
دسترسی پروژه باید بر اساس عضویت و Role قابل محدودسازی باشد.

---

## FR-WORK — Work Item Management

### FR-WORK-01 Create Work Item
کاربر مجاز بتواند Work Item ایجاد کند.

### FR-WORK-02 Hierarchy
- Epic → Feature/Task
- Feature → Task
- Task → Subtask

عمق سلسله‌مراتب در MVP حداکثر 4 سطح.

### FR-WORK-03 Owner
Work Item مهم در `READY` و بالاتر باید Owner داشته باشد.

### FR-WORK-04 Work Stream
تمام Work Itemهای Active باید Work Stream داشته باشند.

### FR-WORK-05 Workflow State
Transitionها باید Rule داشته باشند.

### FR-WORK-06 Health
Health مستقل از Workflow State ذخیره شود.

### FR-WORK-07 ETA History
هر تغییر ETA باید در history ذخیره شود.

### FR-WORK-08 Priority History
هر تغییر Priority باید ذخیره شود.

### FR-WORK-09 Comment
Comment با Mention و timestamp.

### FR-WORK-10 Attachment
Attachment با size/type policy.

### FR-WORK-11 Checklist
Checklist item قابل complete شدن.

### FR-WORK-12 Activity Timeline
تمام تغییرات مهم در Timeline قابل مشاهده باشد.


### FR-WORK-13 Reviewer
Work Item می‌تواند Reviewer داشته باشد؛ Submit to Review بدون Reviewer فقط با Review Exception مجاز است اگر Policy اجازه دهد.

### FR-WORK-14 QA
- `qa_required`
- `qa_owner`
- QA Result
- Evidence/Note
- Failed QA → Return to In Progress
- Passed QA → Done allowed

### FR-WORK-15 Acceptance Criteria
Task/Featureهای مشمول Policy قبل از Review باید Acceptance Criteria داشته باشند.

### FR-WORK-16 Template
کاربر مجاز بتواند Task را از Template بسازد.

### FR-WORK-17 My Work
هر کاربر باید نمای واحدی از Assigned/Owned/Review/QA/Due/Blocked work داشته باشد.

### FR-WORK-18 Handoff
کاربر بتواند Deliverable را با Receiver و Acceptance Criteria به فرد/تیم دیگر Handoff کند.

### FR-WORK-19 WIP Warning
سیستم هنگام عبور از WIP Limit هشدار دهد.

### FR-WORK-20 Stale / Overdue
Stale و Overdue به‌صورت محاسبه‌شده و قابل فیلتر باشند.

---

## FR-BOARD — Board

### FR-BOARD-01 Kanban
ستون‌ها بر اساس Workflow State.

### FR-BOARD-02 Health Indicator
کارت باید Delivery Health را جداگانه نمایش دهد.

### FR-BOARD-03 Filters
حداقل:
- Project
- Team
- Owner
- Assignee
- Work Stream
- Priority
- Health
- Label

### FR-BOARD-04 Drag Drop
جابجایی باید Permission و Transition rules را رعایت کند.

### FR-BOARD-05 Saved View
کاربر بتواند Filter خود را ذخیره کند.

### FR-BOARD-06 Global Kanban
کاربر مجاز بتواند همه Work Itemهای قابل مشاهده از چند پروژه را در یک Kanban ببیند.

### FR-BOARD-07 Team / Project / My Views
Kanban باید حداقل Scopeهای Global، Project، Team و My Work را پشتیبانی کند.

### FR-BOARD-08 Gantt
سیستم باید Gantt/Timeline برای Scope سراسری و پروژه‌ای ارائه کند.

### FR-BOARD-09 Baseline vs Current
در Gantt، First Committed ETA و Current ETA برای آیتم‌های جابه‌جا شده قابل مقایسه باشد.

### FR-BOARD-10 Gantt Change Safety
تغییر تاریخ از طریق Drag/Resize در Gantt باید همان Permission، Reason و History مربوط به تغییر ETA را اجرا کند.

---

## FR-INTAKE — Intake

### FR-INTAKE-01 Create Request
هر Role عملیاتی مجاز بتواند درخواست ثبت کند.

### FR-INTAKE-02 Triage
PM/Tech Lead/Authorized Role بتواند تصمیم بگیرد.

### FR-INTAKE-03 Convert
Accepted Intake به Work Item تبدیل شود و Link حفظ شود.

### FR-INTAKE-04 Reject/Defer/Merge
Reason اجباری.

### FR-INTAKE-05 Critical Fast Track
Critical Support سریع وارد اجرا شود ولی ثبت و Audit حذف نشود.

---

## FR-PRIORITY — Prioritization

### FR-PRIORITY-01 Score
سیستم Score پیشنهادی محاسبه کند.

### FR-PRIORITY-02 Manual Priority
تصمیم‌گیر بتواند Priority نهایی بدهد.

### FR-PRIORITY-03 Override Reason
در Override مهم Reason اجباری.

### FR-PRIORITY-04 Displaced Work
در ارتقای P0/P1 و ظرفیت پر، کار عقب‌افتاده یا تصمیم ظرفیت باید ثبت شود.

---

## FR-ETA — ETA & Commitment

### FR-ETA-01 ETA
Date یا Date Range.

### FR-ETA-02 Confidence
Low / Medium / High.

### FR-ETA-03 Assumptions
برای Feature P0/P1 اجباری.

### FR-ETA-04 Change Reason
در تغییر ETA مهم اجباری.

### FR-ETA-05 First Committed Baseline
اولین ETA committed باید به‌عنوان Baseline اولیه immutable حفظ شود.

### FR-ETA-06 ETA History
تمام تغییرات ETA باید نسخه‌بندی شوند و شامل Old/New، فرد تغییر‌دهنده، زمان، Confidence و Reason باشند.

### FR-ETA-07 Shift Metrics
سیستم باید حداقل Last Shift Days، Baseline Drift Days، Shift Count و Cumulative Movement Days را محاسبه کند.

### FR-ETA-08 Estimate History
اگر Effort Estimate تغییر کند، Old/New Estimate و Reason نیز باید قابل مشاهده باشد.

### FR-ETA-09 Completion Variance
بعد از Done شدن، اختلاف تاریخ واقعی با Baseline و آخرین ETA محاسبه شود.

### FR-ETA-10 No Silent Date Edit
هیچ API/UI نباید ETA را بدون ساخت History تغییر دهد.

---

## FR-RISK — Risk/Blocker

### FR-RISK-01 Risk Register
Risk قابل ایجاد و اتصال به Project/Work Item.

### FR-RISK-02 Block
Mark Blocked نیازمند Reason + Next Action.

### FR-RISK-03 Aging
Blocked duration محاسبه شود.

### FR-RISK-04 Dependency
روابط dependency با جلوگیری از cycle.

---

## FR-DECISION — Decision Log

### FR-DECISION-01 Create Decision
حداقل Decision + Reason + Owner + Impact.

### FR-DECISION-02 Link
Decision به Project/Work Item لینک شود.

### FR-DECISION-03 Search
متن Decision قابل جست‌وجو باشد.

---

## FR-CAPACITY — Capacity

### FR-CAPACITY-01 Availability
ظرفیت هر Member در هفته.

### FR-CAPACITY-02 Allocation
تخصیص Planned به Work Stream.

### FR-CAPACITY-03 Actual
Actual از Time Entry یا completion estimate قابل جمع‌آوری باشد.

### FR-CAPACITY-04 Overload
Over-allocation Warning.

---

## FR-REVIEW — Weekly Review

### FR-REVIEW-01 Agenda
Agenda خودکار از داده‌های سیستم.

### FR-REVIEW-02 Decisions Needed
Blocked/At Risk/Decision Needed وارد Agenda شوند.

### FR-REVIEW-03 Commitments
خروجی‌های هفته بعد ثبت شوند.

### FR-REVIEW-04 Close Snapshot
بعد از Close یک Snapshot immutable ساخته شود.

---

## FR-REPORT — Reports

### FR-REPORT-01 Weekly
Weekly Executive Report.

### FR-REPORT-02 Monthly
Monthly Management Report.

### FR-REPORT-03 Export
MVP: CSV و Print-friendly HTML/PDF در فاز بعدی یا همان Release در صورت نیاز.

---

## FR-AUDIT — Audit

### FR-AUDIT-01 Sensitive Changes
حداقل این تغییرات audit شوند:
- Role
- Permission
- Priority
- ETA
- Delivery Health
- Project membership
- Decision
- Delete/Archive

### FR-AUDIT-02 Immutable Audit
کاربر عادی نباید Audit را حذف/ویرایش کند.

---

# 19) User Storyها و Acceptance Criteria

## Epic A — Authentication & Access

### US-A01 — Login
**As a** user  
**I want** to login securely  
**So that** I can access my workspace.

**Acceptance Criteria:**
- Given active user + correct password, login succeeds.
- Wrong credentials do not reveal whether email exists.
- Disabled user cannot login.
- Successful login creates auditable session event.

### US-A02 — Create User
**As an** Admin  
**I want** to invite a user with role/team  
**So that** access is controlled from the beginning.

**AC:**
- User is created with a temporary password.
- First successful login requires password change.
- Role and organization are bound to invite.
- Reused/expired invite is rejected.

### US-A03 — Reset Password
**As a** user  
**I want** to reset a forgotten password.

**AC:**
- Reset token expires.
- Token can be used once.
- Previous active refresh sessions can be revoked.

### US-A04 — Permission
**As an** Admin  
**I want** role-based access  
**So that** users only see/change authorized data.

**AC:**
- Backend returns 403 for forbidden operations.
- Hidden UI alone is not considered security.

---


## Epic A2 — People & Team Management

### US-A05 — Add Current/Future Member
**As an** Admin  
**I want** to add a new member with job title, team and role  
**So that** the system grows without code changes.

**AC:**
- Name + real email + application role required for invite.
- Job title is independent from permission.
- Primary team can be selected.
- Member starts as `ACTIVE` with `must_change_password=true`.
- Action is audited.

### US-A06 — Manage Team Membership
**As an** Admin/authorized Lead  
**I want** to move/add a member between teams.

**AC:**
- User may belong to multiple teams.
- One primary team exists.
- Effective date and actor are recorded.
- Existing task ownership is not silently changed.

### US-A07 — Manage Availability
**As a** member/Lead  
**I want** weekly availability reflected in planning.

**AC:**
- Capacity can be reduced for unavailable periods.
- Tasks due during absence trigger planning warning.
- Sensitive reason is not required.

### US-A08 — Offboard Member Safely
**As an** Admin  
**I want** to disable a member without losing history.

**AC:**
- Sessions revoked.
- Login blocked.
- Owned work/review/QA/decisions/risks shown for reassignment.
- Historical comments/activity remain intact.
- No hard delete.

### US-A09 — Team Lead Dashboard
**As a** Team Lead  
**I want** a team workload view.

**AC:**
- Shows WIP, overdue, blocked, review queue, QA queue and capacity.
- Does not show a productivity ranking.

### US-A10 — Onboard New Member
**As an** Admin/Lead  
**I want** onboarding tasks generated after activation.

**AC:**
- Template may depend on role/team.
- Checklist completion is visible.
- Missing onboarding does not grant extra permissions.


## Epic B — Project & Task

### US-B01 — Create Project
**As a** PM  
**I want** to create a project with owner and target date.

**AC:**
- Name and Owner required.
- Project gets unique code/ID.
- Activity records creation.

### US-B02 — Create Task
**As a** team member  
**I want** to create a task under an authorized project.

**AC:**
- Title required.
- Work Stream required before Active states.
- Reporter is captured automatically.

### US-B03 — Assign Owner
**As a** PM/Lead  
**I want** to assign a primary Owner.

**AC:**
- Only active org member can be Owner.
- Owner change appears in activity timeline.

### US-B04 — Task Hierarchy
**As a** PM  
**I want** Epic/Feature/Task/Subtask hierarchy.

**AC:**
- Parent-child relation is visible.
- Invalid hierarchy is rejected.
- Cycle is impossible.

### US-B05 — Workflow State
**As a** member  
**I want** to move work through states.

**AC:**
- Transition follows rules.
- Moving to In Progress requires assignee.
- Moving to Done validates required completion criteria.

### US-B06 — Delivery Health
**As a** Owner  
**I want** to mark work On Track/At Risk/Blocked/Unknown independently of workflow.

**AC:**
- Health is separate from workflow state.
- Blocked requires blocker data.
- Health change is timestamped.

### US-B07 — ETA
**As an** Owner  
**I want** to set ETA with confidence and assumptions.

**AC:**
- P0/P1 Feature requires confidence.
- Previous ETA remains in history.

### US-B08 — ETA Change
**As an** Owner  
**I want** to update ETA when assumptions change.

**AC:**
- Old/new ETA captured.
- Change reason mandatory for important work.
- Watchers notified.

### US-B09 — Checklist
**As a** member  
**I want** completion checklist inside task.

**AC:**
- Item can be added/reordered/completed.
- Completion timestamp/user recorded.

### US-B10 — Comments & Mentions
**As a** collaborator  
**I want** to comment and mention teammates.

**AC:**
- Mention creates notification.
- Edited comment shows edited marker.
- Deleted comment follows retention policy.

### US-B11 — Attachments
**As a** collaborator  
**I want** to attach evidence/spec files.

**AC:**
- Allowed size/type enforced.
- Unauthorized user cannot download private attachment.

### US-B12 — Saved Filters
**As a** user  
**I want** to save a filtered board view.

**AC:**
- Filter persists per user.
- User can rename/delete own view.

### US-B13 — Submit for Review
**As a** contributor  
**I want** to submit completed work for review.

**AC:**
- Reviewer or Review Exception is required according to policy.
- State changes to `IN_REVIEW`.
- Reviewer is notified.
- Submission may include evidence.

### US-B14 — Request Changes
**As a** reviewer  
**I want** to return work with actionable feedback.

**AC:**
- Reason/comment required.
- State returns to `IN_PROGRESS`.
- Assignee notified.
- Review event remains in history.

### US-B15 — QA Pass/Fail
**As a** QA Owner/authorized reviewer  
**I want** to validate acceptance criteria.

**AC:**
- Pass/Fail is recorded.
- Failure reason/evidence required.
- Failed returns to `IN_PROGRESS`.
- Passed allows `DONE`.

### US-B16 — My Work
**As a** user  
**I want** one page for all work requiring my attention.

**AC:**
- Assigned, owned, review, QA, overdue and blocked sections exist.
- Filters respect permission.
- Quick state/comment/blocker update supported.

### US-B17 — Team Handoff
**As a** contributor  
**I want** to hand a deliverable to another person/team.

**AC:**
- Receiver and acceptance criteria are required.
- Receiver can accept or return with reason.
- Aging is measurable.
- Handoff is linked to source work.

### US-B18 — Task Template
**As a** Lead/PM  
**I want** templates for backend/frontend/design/content/marketing/bug work.

**AC:**
- Template pre-fills fields/checklists.
- User can modify non-locked fields.
- Template version is traceable.


---

## Epic C — Intake

### US-C01 — Register Intake
**As a** CEO/Support/Sales/Tech user  
**I want** to submit a new request before it enters execution.

**AC:**
- Source is recorded.
- Requester is recorded.
- Request starts in NEW.

### US-C02 — Triage Intake
**As a** PM/Lead  
**I want** to classify and evaluate intake.

**AC:**
- Can set Work Stream, impact, urgency, effort estimate.
- Triage decision is auditable.

### US-C03 — Need More Info
**As a** triager  
**I want** to return request for more information.

**AC:**
- Required info/question recorded.
- Requester notified.

### US-C04 — Accept & Convert
**As a** PM  
**I want** accepted intake converted to a work item.

**AC:**
- Original intake remains linked.
- Core fields transfer.
- No duplicate conversion.

### US-C05 — Reject / Defer
**As a** decision maker  
**I want** to reject/defer with reason.

**AC:**
- Reason mandatory.
- Deferred item may have review date.

### US-C06 — Merge Duplicate
**As a** PM  
**I want** duplicate requests merged.

**AC:**
- Original references remain accessible.
- Request count may contribute to Product Input signal.

---

## Epic D — Prioritization

### US-D01 — Score Request
**As a** PM/CEO  
**I want** a suggested priority score.

**AC:**
- Score uses configured formula.
- Inputs visible and editable by authorized roles.

### US-D02 — Set Final Priority
**As a** decision maker  
**I want** to set P0..P4.

**AC:**
- Priority history is preserved.
- Final priority may differ from score.

### US-D03 — Override Reason
**As an** executive  
**I want** to override score with reason.

**AC:**
- Reason required for policy-defined cases.
- Decision author/date recorded.

### US-D04 — Opportunity Cost
**As a** CEO/PM  
**I want** to see what must move when new urgent work enters.

**AC:**
- P0/P1 insertion can require displaced work.
- Displaced Owner is notified.

### US-D05 — Priority History
**As an** executive  
**I want** to see when and why priorities changed.

**AC:**
- Timeline shows before/after/reason/actor/date.

---

## Epic E — Support/Ops

### US-E01 — Critical Incident
**As a** Support user  
**I want** to register a critical incident quickly.

**AC:**
- Minimal critical form can be submitted fast.
- Tech Lead/PM notified.
- Record remains mandatory.

### US-E02 — Operational Queue
**As a** Support user  
**I want** non-critical issues to enter a queue.

**AC:**
- No automatic In Progress unless authorized.
- Priority and age visible.

### US-E03 — Product Input
**As a** Support/Sales user  
**I want** recurring customer requests treated as Product Input, not immediate dev tasks.

**AC:**
- Item enters product intake.
- Number/source of similar requests can be tracked.

### US-E04 — Time Consumed
**As a** Lead  
**I want** support effort recorded.

**AC:**
- Time/effort can be logged.
- Report aggregates support consumption.

### US-E05 — Follow-up
**As a** Lead  
**I want** resolved support issues to create tech debt/infra/product follow-ups.

**AC:**
- Follow-up link is traceable.
- Support item can close while follow-up stays open.

---

## Epic F — Risk / Blocker / Dependency / Decision

### US-F01 — Register Risk
**As a** Lead/PM  
**I want** to register delivery risks.

**AC:**
- Probability, impact, owner and mitigation supported.
- Risk score calculated.

### US-F02 — Mark Blocked
**As a** member  
**I want** to mark work blocked with reason and next action.

**AC:**
- Reason required.
- Blocked Since auto-recorded.
- Item appears in Blocked views.

### US-F03 — Resolve Blocker
**As a** blocker owner  
**I want** to resolve a blocker.

**AC:**
- Resolution note captured.
- Aging stops.
- Health can be reassessed.

### US-F04 — Dependency
**As a** Lead  
**I want** dependencies between work items.

**AC:**
- Dependency type visible.
- Circular blocking dependency rejected.

### US-F05 — Decision Log
**As a** CEO/Lead/PM  
**I want** to record key decisions and rationale.

**AC:**
- Decision, reason, impact, owner required.
- Can link multiple work items.

### US-F06 — Decision Needed
**As a** member  
**I want** to flag work requiring management decision.

**AC:**
- Flagged item appears in weekly agenda.
- Decision can close the flag.

---

## Epic G — Capacity

### US-G01 — Member Capacity
**As a** Lead  
**I want** to set weekly member availability.

**AC:**
- Capacity supports partial availability/leave.
- Team total recalculates.

### US-G02 — Planned Allocation
**As a** Lead/PM  
**I want** to allocate capacity among the four work streams.

**AC:**
- Sum can be compared to total capacity.
- Over-allocation warns.

### US-G03 — Actual Allocation
**As an** executive  
**I want** to see where capacity was actually spent.

**AC:**
- Can aggregate from logged effort or completed work estimate.
- Report separates planned vs actual.

### US-G04 — Focus Load
**As a** Lead  
**I want** to see too many simultaneous tasks per person.

**AC:**
- Active item count shown.
- Configurable warning threshold.

---

## Epic H — Weekly Review & Reports

### US-H01 — Auto Agenda
**As a** PM  
**I want** a weekly review agenda generated automatically.

**AC:**
- Includes last commitments.
- Includes At Risk/Blocked.
- Includes decisions needed.
- Includes ETA/Priority changes.

### US-H02 — Planned vs Actual
**As an** executive  
**I want** to compare planned outputs with actual outputs.

**AC:**
- Each commitment has status.
- Unfinished item has reason/change context.

### US-H03 — Record Meeting Decision
**As a** facilitator  
**I want** meeting decisions stored directly in Decision Log.

**AC:**
- Decision links to review.
- Decision owner can be assigned.

### US-H04 — Next Commitments
**As a** CEO/Lead/PM  
**I want** to select next week’s 3–5 main outcomes.

**AC:**
- Commitments are snapshotted.
- Later additions are identified as unplanned.

### US-H05 — Close Review
**As a** facilitator  
**I want** to close the review with an immutable snapshot.

**AC:**
- Closed review data cannot silently change.
- Corrections require amendment log.

### US-H06 — Weekly Executive Report
**As a** CEO  
**I want** a concise weekly report.

**AC:**
- Can view without opening every project.
- Shows blockers, decisions and capacity split.

### US-H07 — Monthly Report
**As a** CEO  
**I want** a monthly report matching the management questions in the source document.

**AC:**
- Work stream capacity share shown.
- Delays have categorized reasons.
- Critical tech debt shown.
- Next-month decisions listed.

---

## Epic I — Admin, Audit & Notifications

### US-I01 — Manage Roles
**As an** Admin  
**I want** to manage user roles.

**AC:**
- Role changes audited.
- User cannot grant permissions beyond own authority.

### US-I02 — Disable User
**As an** Admin  
**I want** to disable a departing user safely.

**AC:**
- New login denied.
- Existing sessions revoked.
- Owned work remains and can be reassigned.

### US-I03 — Audit Sensitive Changes
**As an** Admin/Executive  
**I want** to inspect sensitive changes.

**AC:**
- Before/after values for configured fields.
- Actor/date/entity shown.

### US-I04 — Notifications
**As a** user  
**I want** useful notifications without noise.

**AC:**
- Assignment, mention, blocked, priority and ETA changes supported.
- User can configure non-critical notification channels.

### US-I05 — Global Search
**As a** user  
**I want** to find projects, tasks and decisions quickly.

**AC:**
- Search respects permissions.
- Results show entity type and context.

---

# 20) مدل داده و دیتابیس — MVP Local-first

## 20.1 تصمیم قطعی MVP

برای نسخه آزمایشی، دیتابیس **SQLite** است و داخل همان Runtime اپ نگه‌داری می‌شود:

```text
data/
├── app.db
├── uploads/
└── backups/
```

اهداف این تصمیم:

- صفر کردن نیاز به PostgreSQL یا Managed Database؛
- Setup بسیار ساده برای Vibe Coding و Pilot؛
- Backup ساده و قابل فهم؛
- انتقال آسان کل Pilot با چند فایل؛
- امکان حذف کامل Pilot بدون باقی ماندن سرویس بیرونی؛
- مناسب بودن برای تیم کوچک فعلی و حجم اولیه داده.

> فایل `data/app.db` و پوشه `data/` **هرگز داخل Git Commit نمی‌شوند** و باید در `.gitignore` باشند.

## 20.2 ORM و Migration

- ORM: **Prisma**
- Provider MVP: `sqlite`
- Migrationها Versioned و داخل Repository هستند.
- Seed باید idempotent باشد.
- Schema از قابلیت‌های اختصاصی PostgreSQL مثل `jsonb`, `citext`, `GIN`, `timestamptz` یا extensionها استفاده نکند.
- IDها در سطح Application به‌صورت string/UUID تولید شوند تا مهاجرت آینده راحت بماند.
- تاریخ‌ها در DB به UTC/ISO ذخیره و در UI شمسی نمایش داده شوند.

## 20.3 اصل Portability

Domain Model نباید به SQLite گره بخورد. اگر Pilot موفق شد، تیم فنی می‌تواند در فاز بعد Provider را به PostgreSQL تغییر دهد و Migration داده انجام دهد؛ اما **این مهاجرت جزو MVP نیست**.

```text
MVP:
NestJS + Prisma + SQLite

Future if needed:
NestJS + Prisma + PostgreSQL
```

API و Business Ruleها در این تغییر نباید عوض شوند.

## 20.4 Entityهای اصلی

مدل منطقی شامل این Entityهاست:

- Organization
- User / Membership
- Team / TeamMembership
- Project / ProjectMember
- Milestone
- WorkItem
- WorkItemAssignee
- WorkItemScheduleHistory
- EstimateHistory
- PriorityHistory
- Dependency
- Blocker / Risk
- Decision
- Intake
- Review / QA
- Handoff
- WeeklyReview
- Comment
- Attachment
- Notification
- AuditEvent

جزئیات فیلدها باید مطابق PRD بخش‌های Functional Requirement و User Story پیاده شوند؛ اما نوع داده‌ها باید SQLite-compatible بمانند.

## 20.5 قواعد مهم Work Item

حداقل فیلدهای اصلی:

```text
id                  string
organization_id     string
project_id           string nullable
parent_id            string nullable
key                   string unique in organization
title                 string
description           text nullable
work_type              enum/string
work_stream            enum/string
workflow_state         enum/string
delivery_health        enum/string
priority               enum/string
owner_id               string nullable
primary_assignee_id    string nullable
reviewer_id            string nullable
qa_owner_id             string nullable
start_date             datetime nullable
due_date               datetime nullable
current_eta             datetime nullable
first_committed_eta     datetime nullable
eta_confidence          enum/string nullable
eta_assumptions         text nullable
estimate_minutes        integer nullable
created_at              datetime
updated_at              datetime
completed_at            datetime nullable
```

## 20.6 Schedule History — غیرقابل حذف از MVP

هر تغییر ETA باید History بسازد؛ overwrite خام ممنوع است.

حداقل:

```text
WorkItemScheduleHistory
- id
- work_item_id
- version_no
- previous_eta
- new_eta
- delta_days
- reason_type
- reason_text
- confidence
- changed_by
- created_at
```

Baseline اولیه (`first_committed_eta`) immutable است.

## 20.7 Audit ساده

برای تغییرات مهم یک جدول `AuditEvent` کافی است:

- actor
- entity_type
- entity_id
- action
- before_json به‌صورت text JSON nullable
- after_json به‌صورت text JSON nullable
- created_at

در SQLite برای metadata پیچیده، JSON به‌صورت `TEXT` ذخیره شود و در Application serialize/deserialize شود؛ نیازی به قابلیت اختصاصی DB نیست.

## 20.8 فایل‌های ضمیمه

در MVP فایل‌ها روی Local Disk ذخیره می‌شوند:

```text
data/uploads/<generated-id>/<filename>
```

در DB فقط metadata ثبت شود:

- id
- entity_type
- entity_id
- original_name
- stored_path
- mime_type
- size_bytes
- uploaded_by
- created_at

قواعد:

- path traversal ممنوع؛
- نام ذخیره‌شده generated باشد؛
- MIME و size validate شود؛
- فایل مستقیم از مسیر public سرو نشود؛ دانلود از API با Permission check انجام شود؛
- S3/Object Storage در MVP ممنوع است مگر PRD بعداً تغییر کند.

## 20.9 Session و Notification

- Session/Refresh token state در همان SQLite ذخیره شود.
- In-app Notification در همان SQLite ذخیره شود.
- SMTP/Email Notification در MVP لازم نیست.
- Password Reset توسط Admin از داخل UI قابل انجام باشد؛ Self-service Email Reset Future است.

## 20.10 Concurrency و محدودیت آگاهانه

SQLite برای Pilot کوچک مناسب است، اما معماری MVP باید تک‌Instance بماند:

- یک App Instance؛
- یک فایل DB روی Disk محلی؛
- Horizontal Scaling در MVP ممنوع؛
- دیتابیس روی Network Share/NFS قرار نگیرد؛
- Write Transactionها کوتاه باشند؛
- عملیات Bulk سنگین در MVP محدود شوند.

اگر Scale واقعی این محدودیت را شکست، آن زمان PostgreSQL بررسی می‌شود.

---

# 21) API و قراردادهای Backend

## 21.1 سبک API

برای MVP: REST + OpenAPI.

Base:

```text
/api/v1
```

## 21.2 Authentication

```http
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me
```

## 21.3 Organizations / People / Teams

```http
GET    /organizations/:orgId
PATCH  /organizations/:orgId

GET    /organizations/:orgId/members
GET    /organizations/:orgId/members/:userId
POST   /organizations/:orgId/users
POST   /organizations/:orgId/users/:id/reset-password
PATCH  /organizations/:orgId/users/:id/status
PATCH  /organizations/:orgId/members/:userId
POST   /organizations/:orgId/members/:userId/suspend
POST   /organizations/:orgId/members/:userId/activate
POST   /organizations/:orgId/members/:userId/offboard
GET    /organizations/:orgId/members/:userId/reassignment-impact

GET    /organizations/:orgId/teams
POST   /organizations/:orgId/teams
PATCH  /organizations/:orgId/teams/:teamId
POST   /organizations/:orgId/teams/:teamId/members
DELETE /organizations/:orgId/teams/:teamId/members/:userId

GET    /organizations/:orgId/members/:userId/availability
PUT    /organizations/:orgId/members/:userId/availability
GET    /organizations/:orgId/members/:userId/onboarding
PATCH  /organizations/:orgId/members/:userId/onboarding/:itemId
```

`member_status` در سطح Organization مدیریت می‌شود؛ Lock امنیتی حساب در `users.account_status` مستقل است تا معماری Multi-tenant-ready بماند.

## 21.4 Projects

```http
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
POST   /projects/:id/archive
GET    /projects/:id/summary
GET    /projects/:id/activity
GET    /projects/:id/gantt
```

## 21.5 Work Items

```http
GET    /work-items
POST   /work-items
GET    /work-items/:id
PATCH  /work-items/:id
POST   /work-items/:id/transition
POST   /work-items/:id/health
POST   /work-items/:id/priority
POST   /work-items/:id/eta
GET    /work-items/:id/schedule-history
GET    /work-items/:id/schedule-metrics
POST   /work-items/:id/blockers
POST   /work-items/:id/dependencies
POST   /work-items/:id/comments
POST   /work-items/:id/attachments
POST   /work-items/:id/submit-review
POST   /work-items/:id/reviews
POST   /work-items/:id/qa
POST   /work-items/:id/handoffs
GET    /work-items/:id/handoffs
GET    /work-items/:id/activity
GET    /work-items/kanban
GET    /work-items/gantt
```

## 21.6 My Work / Team Work

```http
GET /me/work
GET /me/reviews
GET /me/qa
GET /teams/:teamId/work
GET /teams/:teamId/review-queue
GET /teams/:teamId/capacity
```

## 21.7 Intake

```http
GET   /intakes
POST  /intakes
GET   /intakes/:id
PATCH /intakes/:id
POST  /intakes/:id/triage
POST  /intakes/:id/convert
POST  /intakes/:id/merge
```

## 21.8 Feature Brief

```http
GET   /work-items/:id/feature-brief
PUT   /work-items/:id/feature-brief
POST  /work-items/:id/feature-brief/submit
POST  /work-items/:id/feature-brief/approve
```

## 21.9 Risks / Decisions

```http
GET  /risks
POST /risks
PATCH /risks/:id
GET  /decisions
POST /decisions
GET  /decisions/:id
PATCH /decisions/:id
```

## 21.10 Capacity

```http
GET  /capacity?periodStart=&periodEnd=&teamId=
PUT  /capacity/periods/:id/members
PUT  /capacity/periods/:id/allocations
GET  /capacity/summary
```

## 21.11 Weekly Reviews

```http
GET  /weekly-reviews
POST /weekly-reviews
GET  /weekly-reviews/:id
POST /weekly-reviews/:id/generate-agenda
POST /weekly-reviews/:id/commitments
POST /weekly-reviews/:id/close
GET  /weekly-reviews/:id/report
```

## 21.12 Reports

```http
GET /reports/executive-weekly
GET /reports/management-monthly
GET /reports/capacity
GET /reports/blockers
GET /reports/eta-accuracy
GET /reports/support-consumption
GET /reports/priority-changes
```

## 21.13 Pagination

Cursor-based برای Activity/Audit و Listهای بزرگ؛ در MVP page/limit نیز قابل قبول است ولی contract از ابتدا consistent باشد.

نمونه:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 50,
  "total": 0
}
```

## 21.14 Error Contract

```json
{
  "error": {
    "code": "WORK_ITEM_INVALID_TRANSITION",
    "message": "امکان انتقال این کار به وضعیت مقصد وجود ندارد.",
    "details": {}
  }
}
```

## 21.15 Idempotency

برای endpointهای حساس مثل:
- Create User
- Convert Intake
- Close Weekly Review
- File upload finalize

Idempotency key پیشنهاد می‌شود.

---

# 22) معماری فنی پیشنهادی — Self-contained MVP

## 22.1 معماری قفل‌شده

```text
Browser
   ↓
Single NestJS Application
   ├── /api/*        REST API
   ├── /*            React/Vite static build
   ├── Prisma
   │     └── data/app.db (SQLite)
   └── data/uploads/ (Local files)
```

Frontend:
- React + Vite + TypeScript

Backend:
- NestJS + TypeScript

Data:
- Prisma + SQLite

Storage:
- Local filesystem

Auth:
- Local username/email + password
- Cookie/session state backed by SQLite

## 22.2 چرا Single App؟

برای MVP عمداً Frontend و Backend در Runtime جدا Deploy نمی‌شوند. NestJS فایل Buildشده React را Serve می‌کند و API نیز روی همان Origin است.

نتیجه:

- یک Process/Container؛
- یک URL؛
- بدون CORS پیچیده؛
- بدون دو سرویس Deployment؛
- بدون Managed Database؛
- Backup و انتقال ساده.

## 22.3 سرویس‌هایی که در MVP نداریم

Claude/Developer بدون تغییر صریح PRD نباید این موارد را اضافه کند:

- PostgreSQL
- MySQL
- Redis
- BullMQ / Queue Service
- RabbitMQ / Kafka
- S3 / MinIO / Object Storage
- SMTP provider
- OAuth/SSO
- Elasticsearch
- Kubernetes
- Microservices
- Serverless DB
- Managed Auth

## 22.4 Dependency Policy

قبل از نصب Package جدید باید پاسخ داده شود:

1. آیا این قابلیت با Node/Nest/React/Prisma فعلی قابل انجام است؟
2. آیا Dependency برای MVP واقعاً لازم است؟
3. آیا Package نگه‌داری فعال و License مناسب دارد؟
4. آیا حذف آن بعداً سخت می‌شود؟

Dependency جدید فقط وقتی اضافه شود که مسئله واقعی حل کند.

## 22.5 Directory پیشنهادی

```text
repo/
├── apps/
│   ├── web/                 # React/Vite source
│   └── api/                 # NestJS + serves built web
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── data/                    # gitignored runtime data
│   ├── app.db
│   ├── uploads/
│   └── backups/
├── scripts/
│   ├── backup.*
│   ├── restore.*
│   └── smoke.*
├── docs/
│   └── PRD.md
├── .env.example
├── .gitignore
├── Dockerfile
├── package.json
├── pnpm-workspace.yaml
├── CLAUDE.md
├── PROJECT_STATUS.md
└── README.md
```

## 22.6 `.env` حداقلی

```text
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
DATABASE_URL=file:./data/app.db
AUTH_SECRET=change-me
ADMIN_NAME=مدیر سیستم
ADMIN_EMAIL=admin@local.test
ADMIN_PASSWORD=Admin12345!
UPLOAD_DIR=./data/uploads
```

قواعد:

- `.env` داخل Git Commit نشود.
- `.env.example` بدون Secret داخل Git باشد.
- برای Pilot آنلاین `AUTH_SECRET` و `ADMIN_PASSWORD` تغییر کنند.
- اگر مقدار Production همچنان Default باشد، App در حالت Production باید Start نشود و خطای واضح بدهد.

## 22.7 Admin پیش‌فرض

برای Development/Local:

```text
Email: admin@local.test
Password: Admin12345!
```

Seed/Bootstrap در Start اگر Admin وجود ندارد، آن را می‌سازد.

برای Online Pilot:
- همان منطق استفاده می‌شود؛
- ولی Email/Password از Environment خوانده می‌شود؛
- Password داخل Repository نیست.

## 22.8 Build واحد

Flow:

```text
pnpm install
pnpm build
  ├── build React
  └── build NestJS

pnpm start
  └── NestJS serves /api + React build
```

Docker نیز فقط یک Application Container لازم دارد. `data/` باید Volume/Persistent Directory باشد.

---

# 23) Frontend، UX/UI و فارسی‌سازی کامل

## 23.1 اصل زبان محصول

برای MVP:
- زبان رابط کاربری: **فارسی**
- جهت: **RTL**
- Locale: `fa-IR`
- Timezone Pilot: `Asia/Tehran`
- Calendar UI: جلالی/شمسی
- ذخیره timestamp: UTC
- کدهای داخلی/API/DB: انگلیسی

کاربر عادی نباید مجبور باشد اصطلاح انگلیسی سیستم را بفهمد.

### نمونه Labelهای UI

| Internal | فارسی UI |
|---|---|
| Project | پروژه |
| Work Item / Task | کار / تسک |
| Owner | مسئول نتیجه |
| Assignee | انجام‌دهنده |
| Reviewer | بازبین |
| QA Owner | مسئول کنترل کیفیت |
| Workflow State | مرحله اجرا |
| Delivery Health | سلامت تحویل |
| Priority | اولویت |
| Due Date | موعد |
| ETA | زمان تقریبی تحویل |
| Blocker | مانع |
| Dependency | وابستگی |
| Risk | ریسک |
| Intake | ورودی درخواست |
| Weekly Review | مرور هفتگی |
| Decision Log | ثبت تصمیم |
| Capacity | ظرفیت |
| Handoff | تحویل بین تیمی |

## 23.2 قواعد فارسی‌سازی

1. تمام Button، Menu، Validation، Toast، Empty State و Error Message فارسی باشد.
2. تاریخ نمایشی شمسی باشد و Tooltip/Export بتواند ISO Date را نیز نگه دارد.
3. اعداد به‌صورت پیش‌فرض فارسی نمایش داده شوند؛ شناسه‌ها، Email، URL، Code و Key به‌صورت LTR بمانند.
4. ورودی Search باید `ی/ي` و `ک/ك` و نیم‌فاصله/فاصله را برای جست‌وجوی کاربر نرمال کند.
5. Sorting تاریخ بر اساس مقدار واقعی باشد، نه String شمسی.
6. CSV Export با UTF-8 تولید شود و برای Excel فارسی تست شود.
7. متن‌های ترکیبی فارسی/English با `dir=auto` یا container مناسب نمایش داده شوند.
8. Accessibility: رنگ تنها علامت Priority/Health نباشد؛ Icon + Text نیز باشد.
9. قالب تاریخ/زمان و اعداد از یک Localization layer واحد عبور کند.
10. هیچ Date conversion business rule داخل component پراکنده نشود.

## 23.3 Design System

کامپوننت‌های پایه:
- Button
- Input
- Select / Multi-select
- Date Picker شمسی
- User Picker
- Team Picker
- Project Picker
- Status Badge
- Health Badge
- Priority Badge
- Avatar
- Table
- Kanban Card
- Drawer / Modal
- Tabs
- Timeline
- Comment Composer
- File Uploader
- Empty/Error/Loading State
- Confirmation Dialog

همه کامپوننت‌ها RTL-first و keyboard-accessible باشند.

## 23.4 Navigation فارسی پیشنهادی

```text
داشبورد
کارهای من
پروژه‌ها
تابلوی کارها
بک‌لاگ
ورودی درخواست‌ها
پشتیبانی و عملیات
تیم‌ها و افراد
ظرفیت
مرور هفتگی
تصمیم‌ها
گزارش‌ها
جست‌وجو
تنظیمات
```

## 23.5 داشبورد بر اساس Role

### Contributor
- کارهای امروز
- Due Soon / Overdue
- Blocked
- Waiting Review
- Mentions

### Team Lead
- Team Workload
- Unassigned
- Review Queue
- QA Queue
- Blocked/At Risk
- Capacity

### Project Manager / Owner
- Project Health
- Milestones
- Priority
- Change Requests
- Decisions Needed
- Cross-team Handoffs

### Admin
- Active/Suspended/Disabled
- Team membership
- Access changes
- Offboarding warnings
- Security events

## 23.6 صفحات MVP

### ورود
- ایمیل
- رمز عبور
- فراموشی رمز

### کارهای من
Tabs/sections:
- امروز
- این هفته
- عقب‌افتاده
- در حال انجام
- منتظر بازبینی من
- منتظر QA من
- Blocked
- Mentionها

### پروژه‌ها
- Search
- Status
- Owner
- Team
- Health
- Priority

### جزئیات پروژه
Tabs:
- نمای کلی
- تابلوی کارها
- Backlog
- Milestones
- اعضا
- Risks
- Decisions
- Change Requests
- Activity

### جزئیات تسک
Sections:
- خلاصه
- مرحله اجرا و سلامت
- Priority
- Owner / Assignee / Reviewer / QA
- Due Date / ETA
- Description
- Acceptance Criteria
- Checklist
- Dependencies
- Blockers
- Handoffs
- Attachments/Evidence
- Comments
- Activity

### تیم‌ها و افراد
- فهرست اعضا
- Team filters
- Role/Job Title
- Status
- Capacity
- Profile
- Projects
- Workload
- Create User
- Onboarding/Offboarding

### صف ورودی
- New / Needs Info / Under Review / Accepted / Deferred
- Source
- Impact
- Urgency
- Owner
- Decision

### مرور هفتگی
- Agenda
- Commitments
- Completed
- At Risk / Blocked
- ETA Changes
- Priority Changes
- Capacity changes
- Decisions
- Next actions

## 23.7 UX قواعد سرعت

- ساخت Task ساده در کمتر از چند فیلد اولیه ممکن باشد.
- فیلدهای پیشرفته با Progressive Disclosure نمایش داده شوند.
- Quick Add از Board/My Work.
- Keyboard shortcut برای Search/Create در آینده.
- User Picker عکس/نام/سمت را نشان دهد.
- Status Change از Card ممکن باشد، ولی Guardها در Backend enforce شوند.
- هیچ کاربر برای Update ساده مجبور به باز کردن فرم 30 فیلدی نباشد.

## 23.8 Mobile / Responsive

MVP:
- Responsive Web
- My Work، Comment، Status update و Review روی موبایل قابل انجام
- Board در موبایل می‌تواند List View جایگزین داشته باشد
- Admin پیچیده Desktop-first

---
# 24) امنیت، احراز هویت و Audit

## 24.1 Authentication

- Password hash با Argon2id یا bcrypt cost مناسب؛ ترجیح Argon2id
- Password policy قابل تنظیم
- Access token کوتاه‌عمر
- Rotating Refresh Token
- Refresh token hash در DB
- Session revocation

## 24.2 Authorization

دو سطح:

1. Role-level RBAC
2. Resource-level access، مثل project membership

هر Query باید `organization_id` را enforce کند.

## 24.3 Tenant Isolation

خطای خطرناک اصلی: IDOR / Cross-tenant access.

Rule:

```text
No repository query by entity id alone.
Always scope by organization_id + id.
```

## 24.4 CSRF / XSS / Injection

- SameSite/HttpOnly/Secure cookie در صورت cookie-based refresh
- CSP مناسب
- Output escaping
- ORM parameterization
- Validation schema روی تمام ورودی‌ها
- Sanitization فقط جایی که rich text اجازه داده می‌شود

## 24.5 Rate Limiting

روی:
- Login
- Password reset
- Password reset
- Search سنگین
- Upload

## 24.6 File Security

برای MVP دو روش ساده مجاز است:

1. **External Link** برای Deliverableهایی که از قبل در فضای مطمئن شرکت نگه‌داری می‌شوند؛ یا
2. **Private Local Volume** روی سرور برای Uploadهای محدود.

اگر Private Local Volume استفاده شد:

- MIME/type whitelist
- File size limit
- نام/کلید ذخیره‌سازی تصادفی و مستقل از filename کاربر
- جلوگیری از Path Traversal
- فایل‌ها مستقیم توسط Caddy به‌صورت Public Serve نشوند
- Download فقط از API و پس از Authorization انجام شود
- Volume فایل همراه Backup دیتابیس در برنامه Backup باشد

Object Storage / Private Bucket و Signed URL فقط وقتی اضافه شود که حجم فایل، Scale یا نیاز عملیاتی آن را توجیه کند. Malware scan نیز در Hardening و بر اساس ریسک سازمان اضافه می‌شود.

## 24.7 Audit Events

حداقل:

- Login success/failure summary
- Logout/session revoke
- User invite/disable
- Role change
- Project membership change
- Priority change
- ETA change
- Health change
- Weekly review close/amend
- Decision create/update
- Archive/delete

## 24.8 Secrets

- هیچ secret داخل repo نباشد.
- Environment Secret Store / CI Secret.
- Rotation procedure مستند شود.

## 24.9 Backup Security

- backup encrypted at rest
- access محدود
- restore drill دوره‌ای

---

# 25) Logging، Monitoring و Observability

## 25.1 Application Logs

Structured JSON logs:

- timestamp
- level
- request_id
- user_id در صورت مجاز
- organization_id
- route
- status_code
- latency_ms
- error_code

Password/token/content حساس نباید log شود.

## 25.2 Request ID

هر request یک correlation/request ID داشته باشد و به response header برگردد.

## 25.3 Metrics

- request rate
- error rate
- latency p50/p95/p99
- DB connection usage
- query latency
- background job failures فقط اگر بعداً background job/queue اضافه شد
- login failures
- upload failures

## 25.4 Product Metrics

- active users
- intake submitted
- intake decision time
- tasks completed
- blocked aging
- weekly review completion
- report usage

## 25.5 Error Tracking

Unhandled exceptions باید با stack trace در ابزار error tracking ثبت شوند، بدون PII/secret اضافه.

## 25.6 Health Endpoints

```http
GET /health/live
GET /health/ready
```

Readiness باید DB dependency را بررسی کند.

---

# 26) استراتژی تست

## 26.1 اصل کیفیت

هیچ Feature نباید فقط با «کار می‌کند روی سیستم من» Done شود.

تست در چند لایه:

```text
Static checks
  ↓
Unit tests
  ↓
Integration tests
  ↓
API/Contract tests
  ↓
E2E tests
  ↓
Exploratory QA
  ↓
UAT
  ↓
Production smoke + monitoring
```

## 26.2 Unit Test

تمرکز روی Business Ruleها:

- Priority score
- Priority override rule
- Displaced work requirement
- Work item transitions
- Done rule
- ETA change rule
- Blocked rule
- Dependency cycle detection
- Capacity calculations
- Weekly review snapshot logic
- Permission policies

### Coverage Target پیشنهادی

- Business/domain services: حداقل 85٪ line/branch هدف
- کل backend: حداقل 75٪ هدف

Coverage عدد جادویی نیست؛ Ruleهای حیاتی باید سناریوی مثبت و منفی داشته باشند.

## 26.3 Integration Test

با SQLite test database جداگانه:

- migrations
- repository queries
- constraints
- tenant isolation
- transactions
- history/audit writes

## 26.4 API Contract Test

برای endpointهای اصلی:

- status code
- response schema
- authorization
- validation errors
- idempotency

OpenAPI contract باید در CI validate شود.

## 26.5 Frontend Component Test

- فرم‌ها
- validation
- permission-aware rendering
- state badges
- filters
- critical interactions

## 26.6 E2E Test

ابزار پیشنهادی: Playwright.

### E2E-01 Login + My Work
1. Login
2. Dashboard loads
3. My Work visible

### E2E-02 Intake to Work Item
1. Sales creates Product Input
2. PM triages
3. Accepts
4. Converts to Feature
5. Feature links back to Intake

### E2E-03 Critical Support
1. Support creates Critical item
2. Lead notified
3. Work item created/linked
4. Resolution recorded
5. Follow-up tech debt created

### E2E-04 Priority Change
1. New P0 request created
2. Capacity full
3. System requires displaced work/reason
4. Change approved
5. Old/new owners notified
6. History visible

### E2E-05 Blocked Flow
1. Task In Progress
2. mark Blocked
3. reason/next action required
4. appears in review agenda
5. resolve blocker
6. aging frozen

### E2E-06 ETA Change
1. Owner changes P1 ETA
2. reason required
3. old ETA in history
4. notification emitted
5. weekly report includes change

### E2E-07 Weekly Review
1. Generate agenda
2. Add decisions
3. set next commitments
4. close review
5. immutable snapshot exists
6. report generated

### E2E-08 Tenant Isolation
1. User from Org A knows UUID of Org B task
2. GET/PATCH attempt
3. must return not-found/forbidden according to policy
4. no data leak

## 26.7 Regression Test Suite

قبل از Release:

- Auth
- Project CRUD
- Work Item CRUD
- Board transitions
- Intake convert
- Priority change
- ETA history
- Blocker
- Decision
- Weekly Review
- Reports
- Permission matrix

## 26.8 Performance Test

MVP baseline پیشنهادی:

- 100 concurrent active users هدف اولیه
- list endpoints p95 < 500ms در dataset واقع‌بینانه
- detail endpoints p95 < 300ms
- dashboard p95 < 1.5s server response با aggregation بهینه

Dataset تست:

- 100 users
- 100 projects
- 50,000 work items
- 100,000 activity/audit records

## 26.9 Security Test

- Broken access control
- IDOR
- SQL injection attempts
- XSS
- CSRF strategy verification
- brute-force login
- token reuse/rotation
- file access
- unauthorized report access

## 26.10 Accessibility QA

- keyboard critical flows
- form labels
- focus order
- contrast
- RTL visual correctness

---

# 27) فرآیند توسعه: از Requirement تا Production

این بخش باید به‌عنوان **روش اجباری اجرای هر Feature** استفاده شود.

## Step 1 — Requirement Intake

Feature/Change ابتدا Ticket/Work Item دارد.

Required:
- Problem
- User Story
- Acceptance Criteria
- Priority
- Owner

برای Feature مهم:
- Scope In/Out
- Risks
- Dependencies

## Step 2 — Definition of Ready Check

Ticket بدون DoR وارد Development نمی‌شود.

## Step 3 — Technical Design

برای تغییر متوسط/بزرگ:

- API contract
- data changes
- migration plan
- permission impact
- test plan
- rollback consideration

## Step 4 — Test-First Thinking

قبل از implementation، سناریوهای تست نوشته شوند.

برای Ruleهای business مهم، ترجیح TDD:

1. failing unit test
2. minimal implementation
3. pass
4. refactor

## Step 5 — Branch

نام پیشنهادی:

```text
feature/PROJ-123-intake-convert
fix/PROJ-456-eta-history
chore/...
```

## Step 6 — Implementation

Developer باید:

- کوچک و incremental commit کند
- migration را همراه feature بنویسد
- validation و permission را فراموش نکند
- logging مناسب اضافه کند
- testها را همزمان بسازد

## Step 7 — Local Verification

قبل از PR:

```text
format
lint
typecheck
unit tests
integration tests مرتبط
build
```

## Step 8 — Pull Request

PR باید شامل:

- What / Why
- linked ticket
- screenshots برای UI
- API/data changes
- migration notes
- test evidence
- risk/rollback note برای تغییر مهم

## Step 9 — CI Quality Gates

PR نباید قابل Merge باشد مگر:

- lint pass
- typecheck pass
- unit pass
- integration pass
- build pass
- migration validation pass
- security/static scan حداقلی pass
- required review approval

## Step 10 — Code Review

Reviewer بر correctness، security، maintainability و tests تمرکز می‌کند؛ نه صرفاً style.

## Step 11 — Shared Pilot / Staging Deploy

برای Featureهایی که نیازمند QA/UAT مشترک‌اند، بعد از Merge یا روی یک نسخه Candidate:

- DB migration
- app deploy روی همان Shared Pilot
- smoke tests

در تیم فعلی نیازی به ساخت PR Environment جدا برای هر Branch نیست مگر بعداً واقعاً مفید شود.

## Step 12 — QA

QA بر اساس Acceptance Criteria و exploratory testing اجرا می‌کند.

Status:
- QA Ready
- QA In Progress
- QA Failed
- QA Passed

## Step 13 — Bug Fix Loop

اگر QA fail:

```text
Bug → reproduce → test reproducing bug → fix → review → CI → QA retest
```

## Step 14 — UAT برای Featureهای مهم

CEO/PM/Lead یا نماینده business سناریوی واقعی را تأیید می‌کند.

## Step 15 — Release

- release notes
- migration backup/check
- deploy
- smoke test
- monitor

## Step 16 — Post-release Verification

- error rate
- key endpoint latency
- key business flow
- user feedback

## Step 17 — Close Work Item

فقط بعد از DoD کامل.

---

# 28) Code Review و Quality Gates

## 28.1 Reviewer Checklist

### Correctness
- آیا ACها پوشش داده شده‌اند؟
- edge caseها چیست؟
- transition invalid ممکن است؟

### Security
- authorization backend هست؟
- organization scope enforce شده؟
- input validation هست؟
- sensitive data log نشده؟

### Database
- migration safe است؟
- index لازم اضافه شده؟
- N+1 query داریم؟
- destructive change plan دارد؟

### API
- status/error contract consistent است؟
- backward compatibility لازم رعایت شده؟

### Tests
- business logic تست دارد؟
- regression test برای bug وجود دارد؟
- failure paths تست شده؟

### Maintainability
- naming روشن است؟
- duplicated business rule نداریم؟
- component/service بیش از حد بزرگ نشده؟

### UX
- loading/error/empty states هست؟
- RTL درست است؟
- permission state درست است؟

## 28.2 Approval Rule

پیشنهاد MVP:

- تغییر عادی: حداقل 1 approval
- Auth/Permission/Migration حساس: 2 approvals یا Lead approval

## 28.3 PR Size

ترجیح:
- زیر 400-600 line meaningful change در صورت امکان
- Feature بزرگ به PRهای عمودی کوچک تقسیم شود

## 28.4 No Self-Approval

نویسنده PR نباید تنها approver باشد.

---

# 29) QA، UAT و Release Management

## 29.1 QA Test Case Template

```text
ID:
Title:
Preconditions:
Test Data:
Steps:
Expected Result:
Actual Result:
Status:
Evidence:
Environment:
Build Version:
```

## 29.2 QA Severity

- `S1 Blocker`: login/data/security/core flow broken
- `S2 Critical`: major feature unusable, no reasonable workaround
- `S3 Major`: significant issue with workaround
- `S4 Minor`: cosmetic/low-impact

## 29.3 Release Blocking Rule

Release ممنوع اگر:

- S1 باز باشد
- S2 مرتبط با release باز باشد مگر risk acceptance رسمی
- migration تست نشده باشد
- critical E2E fail باشد
- backup/rollback برای migration پرریسک آماده نباشد

## 29.4 UAT Scenarios

### UAT-01 CEO
- Dashboard را باز کند.
- Top 5 Priority و Blocked را بفهمد.
- Priority change history را ببیند.

### UAT-02 Tech Lead
- Feature را review کند.
- Effort/Risk/Dependency ثبت کند.
- ETA با confidence بدهد.

### UAT-03 Support
- Critical issue در کمتر از چند مرحله ثبت کند.
- وضعیت پیگیری را ببیند.

### UAT-04 PM
- Intake را triage کند.
- Weekly Review تولید و close کند.

### UAT-05 Member
- Task خود را پیدا کند.
- In Progress کند.
- Blocker ثبت کند.
- Done flow را کامل کند.

## 29.5 Release Versioning

Semantic versioning ساده:

```text
MAJOR.MINOR.PATCH
```

مثال:
- `0.1.0` internal MVP
- `0.5.0` pilot
- `1.0.0` production baseline

## 29.6 Release Notes

- Added
- Changed
- Fixed
- Known Issues
- Migration Notes
- Rollback Notes

---

# 30) CI/CD و محیط‌ها — ساده برای MVP

## 30.1 محیط‌ها

### Local

همه‌چیز روی همان سیستم:

```text
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

داده در `data/app.db` و `data/uploads/` است.

### Pilot Online — اختیاری ولی مورد نیاز برای URL تیم

برای اینکه افراد شرکت با URL وارد شوند، App باید روی **یک ماشین/Runtime همیشه روشن با دیسک پایدار** اجرا شود. Provider مهم نیست.

نیازها فقط:

- Node/Docker runtime
- Persistent local disk/volume برای `data/`
- یک public URL/port
- Environment variables

هیچ Managed Database یا Storage لازم نیست.

### Future Server

اگر Pilot موفق بود، همان Build/Container و همان `data/` می‌تواند به Server شرکت منتقل شود. تیم فنی بعداً در صورت نیاز SQLite را به PostgreSQL مهاجرت می‌دهد.

## 30.2 GitHub Actions حداقلی

روی Push/PR فقط:

```text
install
lint
typecheck
unit tests
integration tests with temporary SQLite
build
```

CI نباید Secret واقعی یا دیتای Pilot را داشته باشد.

## 30.3 Deploy

MVP به Provider خاص قفل نیست.

Deploy ساده:

1. Build از Repo؛
2. یک Instance اجرا شود؛
3. `data/` روی Persistent Disk mount شود؛
4. Migration اجرا شود؛
5. App Start شود؛
6. Health Check و Login تست شوند.

Auto-deploy الزامی نیست. Manual Deploy برای Pilot قابل قبول است.

## 30.4 نکته حیاتی Persistent Disk

اگر Runtime فایل‌های Local را بعد از Restart/Deploy پاک می‌کند، برای این معماری مناسب نیست مگر Persistent Disk/Volume ارائه کند.

قبل از استفاده واقعی تیم، این تست اجباری است:

```text
Create test task
Restart/redeploy app
Login again
Task must still exist
Uploaded test file must still exist
```

## 30.5 Backup

Backup MVP شامل فقط این‌هاست:

```text
data/app.db
data/uploads/
```

`pnpm backup:create` باید یک Archive timestamped بسازد.

برای Backup امن SQLite، Repository باید یکی از این دو راه را پیاده کند:

- App را کوتاه Stop کند و سپس DB + uploads را Copy/Archive کند؛ یا
- از SQLite backup mechanism مطمئن استفاده کند.

کپی خام DB در حین Write فعال به‌عنوان روش رسمی Backup پذیرفته نیست.

## 30.6 Restore Test

حداقل یک بار قبل از Pilot واقعی:

1. App Stop؛
2. `data/` فعلی کنار گذاشته شود؛
3. Backup Restore شود؛
4. App Start؛
5. Login؛
6. Project/Task/Attachment نمونه بررسی شود.

---

# 31) Migration و ورود داده اولیه

## 31.1 هدف

سیستم از روز اول نباید خالی باشد؛ Work Inventory موجود باید وارد شود.

## 31.2 Import Format

CSV Template:

```text
Title
Project
Work Stream
Kind
Owner Email
Assignee Email
Workflow State
Delivery Health
Priority
ETA
Blocker
Source
```

## 31.3 Migration Flow

1. Export از Taskulu/Sheet/منبع فعلی
2. Clean data
3. Map users
4. Map work stream
5. Map status
6. Dry-run import
7. validation report
8. production import
9. owner verification

## 31.4 Unknown Data

اگر اطلاعات کافی نیست:

- Delivery Health = `UNKNOWN`
- Owner = nullable فقط در Inbox
- Work Stream باید در Reality Map تکمیل شود

نباید برای تمیز به نظر رسیدن داده، اطلاعات حدسی ساخت.

---

# 32) نقشه راه ساخت نرم‌افزار

> زمان‌ها تخمینی هستند و بر مبنای یک تیم کوچک متشکل از Backend، Frontend و QA/PM پاره‌وقت یا معادل آن نوشته شده‌اند. اگر یک نفر کل سیستم را بسازد، ترتیب حفظ شود ولی زمان افزایش پیدا می‌کند.

## Phase 0 — Product Definition & UX Skeleton
**هدف:** تثبیت Scope MVP.

خروجی:
- PRD approved
- Data model v1
- Permission matrix
- Wireframe صفحات اصلی
- API conventions
- ADRهای اصلی
- test strategy

Exit Criteria:
- هیچ ambiguity حیاتی درباره Work Stream/State/Health/Role باقی نماند.

## Phase 1 — Foundation

### Backend
- repo/monorepo
- DB
- migrations
- auth
- organization
- user/member/team
- invite/onboarding/offboarding foundation
- job title vs application role
- RBAC
- audit foundation

### Frontend
- app shell
- Persian localization layer + RTL + Jalali date picker
- login
- navigation
- permission guards
- base design system

### QA
- test environment
- auth E2E
- permission baseline

Exit:
- کاربر invite می‌شود، login می‌کند و فقط داده مجاز را می‌بیند.

## Phase 2 — Project + Work Item Core

- Project CRUD
- Work Item CRUD
- hierarchy
- workflow state including BACKLOG/IN_REVIEW/IN_QA
- delivery health
- priority
- owner/assignee/reviewer/qa owner
- My Work / Team Work basic
- comments
- activity
- board/list
- filters

Exit:
- تیم می‌تواند کارهای واقعی را از ابزار قبلی روی Board جدید مدیریت کند.
- اعضا Task را از اجرا تا Review/QA/Done داخل سیستم می‌برند.
- Lead می‌تواند Workload و Review Queue را ببیند.

## Phase 3 — Intake + Prioritization + ETA

- Intake queue
- triage
- convert
- priority score
- override history
- displaced work rule
- Feature Brief
- ETA/confidence/assumptions
- ETA history

Exit:
- کار جدید بدون ثبت و تصمیم وارد اجرا نشود.

## Phase 4 — Risk + Support + Decisions

- risk register
- blockers
- dependencies
- decision log
- support classification
- critical fast track
- support effort
- follow-up work item

Exit:
- علت توقف/ریسک/تصمیم و مصرف support traceable باشد.

## Phase 5 — Capacity + Weekly Review + Reports

- member capacity
- work stream allocations
- unplanned flag
- weekly review agenda
- commitments
- close snapshot
- executive weekly report
- monthly report

Exit:
- جلسه هفتگی فقط با داده داخل سیستم قابل اجرا باشد.

## Phase 6 — Hardening

- performance
- security review
- accessibility
- backup/restore
- observability
- full regression
- UAT
- production readiness

Exit:
- Release Checklist کامل.

## Phase 7 — Pilot & Rollout

- import live work
- train users
- pilot team
- fix friction
- full organization rollout

---

# 33) برنامه Rollout عملیاتی ۳۰ روزه مطابق سند

این برنامه **بعد از آماده شدن MVP قابل استفاده** یا در Pilot اجرا می‌شود و منطق سند را به داخل نرم‌افزار منتقل می‌کند.

## هفته 1 — Reality Map

### هدف
کاهش ابهام؛ نه حل همه مشکلات.

### داخل سیستم
- تمام کارهای باز Import/Register شوند.
- هر کار یکی از 4 Work Stream را بگیرد.
- Owner تعیین شود.
- Workflow State تعیین شود.
- Delivery Health تعیین شود.
- Risk/Blocker اولیه ثبت شود.
- Capacity اولیه افراد ثبت شود.

### خروجی
- Work Inventory
- Capacity Snapshot
- Risk List
- Priority Candidates

### Gate
حداقل 90٪ کارهای مهم دسته‌بندی و Owner شده باشند.

## هفته 2 — Priority Reset

### هدف
انتخاب 3 تا 5 خروجی واقعی برای 30 روز.

### داخل سیستم
- Intakeهای مهم Triage شوند.
- Priority Score ثبت شود.
- CEO/Lead Priority نهایی را انتخاب کنند.
- 3 تا 5 Outcome اصلی Mark شوند.
- Tech Debt سهم مشخص بگیرد.
- قانون Critical Support تنظیم شود.
- اولین Weekly Review انجام شود.

### خروجی
- Priority list
- Deferred list
- Tech Debt allocation
- Support rule

## هفته 3 — Commitment Rule

### هدف
زمان بدون Scope/Risk/Assumption اعلام نشود.

### داخل سیستم
- Feature Brief برای P0/P1ها تکمیل شود.
- ETA + confidence + assumptions ثبت شود.
- Dependency و Risks اضافه شود.
- Decisionهای مهم ثبت شوند.
- Support classification کامل اجرا شود.

### خروجی
- Defensible ETA
- Decision log
- Risk-aware commitments

## هفته 4 — Management Report

### هدف
اولین گزارش واقعی مدیریت.

### داخل سیستم
- Capacity actual ثبت/محاسبه شود.
- Completed/Delayed تحلیل شود.
- Delay reason دسته‌بندی شود.
- Critical Tech Debt مشخص شود.
- Monthly Report تولید شود.

### جلسه تصمیم
- چه چیزی ادامه یابد؟
- چه چیزی متوقف شود؟
- چه Priority تغییر کند؟
- آیا Capacity نیاز به تغییر دارد؟

---

# 34) Backlog اولویت‌بندی‌شده MVP

## P0 — بدون این‌ها Pilot واقعی شروع نشود

1. Auth/Login/Reset Password
2. Create User / Reset Password
3. Organization + RBAC
4. User lifecycle: Active/Suspended/Disabled
5. Job Title مستقل از Application Role
6. Team + Team Lead + Membership
7. Persian RTL + Jalali + fa-IR localization
8. Project + Project Members
9. Work Item hierarchy
10. Work Stream چهارگانه
11. Workflow: Inbox/Backlog/Ready/In Progress/In Review/In QA/Done/Cancelled
12. Delivery Health مستقل
13. Owner/Assignee/Reviewer/QA Owner
14. Priority
15. Due Date vs ETA + Confidence + Assumption
16. Acceptance Criteria + Checklist
17. Board/List
18. My Work
19. Team Work basic
20. Intake + Triage + Convert
21. Blocker + Dependency
22. Review/QA history
23. Decision Log
24. Weekly Review basic
25. Critical Audit
26. Executive basic dashboard
27. Offboarding impact/reassignment check

## P1 — بلافاصله بعد/همراه Pilot

1. Feature Brief
2. Priority Score
3. Priority history + displaced work
4. ETA history
5. Risks
6. Support/Ops classification + Critical Fast Track
7. Weekly Capacity + Availability
8. Unplanned Work
9. Handoff بین تیم‌ها
10. Project Change Request
11. Task Templates: Backend/Frontend/Design/Content/Marketing/Bug
12. Onboarding Checklist
13. Weekly/Monthly Reports
14. Comments/Mentions
15. Attachments/Evidence
16. Saved filters
17. Stale/Overdue automation flags
18. Review Queue/QA Queue analytics

## P2 — بعد از تثبیت استفاده

1. Recurring Tasks
2. Custom Fields
3. Workflow customization محدود
4. Advanced charts
5. CSV import/export UI پیشرفته
6. Notification preferences / Email
7. Bulk edit پیشرفته
8. Project Templates
9. Skill tags برای Assignment دستی بهتر
10. External integrations
11. Time tracking کامل‌تر فقط در صورت ارزش واقعی

## P3 — Future

1. SSO
2. Mobile App
3. AI summaries
4. Forecasting
5. Advanced Portfolio Management
6. Webhooks/Public API
7. Git provider integration
8. Incident automation
9. Optional English UI

---
# 35) Definition of Ready / Definition of Done

## 35.1 Definition of Ready — Feature

Feature فقط وقتی Ready for Development است که:

- [ ] Problem روشن باشد.
- [ ] User Story مشخص باشد.
- [ ] Acceptance Criteria تست‌پذیر باشد.
- [ ] Scope In مشخص باشد.
- [ ] Scope Out مشخص باشد.
- [ ] Priority مشخص باشد.
- [ ] Owner مشخص باشد.
- [ ] Assignee/Team مسئول مشخص باشد.
- [ ] Reviewer/QA policy مشخص باشد.
- [ ] Dependencyهای معلوم ثبت شده باشند.
- [ ] UX اولیه در صورت UI change مشخص باشد.
- [ ] API/Data impact اولیه فهمیده شده باشد.
- [ ] سؤال blocking باز نمانده باشد.

## 35.2 Definition of Done — Engineering

- [ ] Implementation کامل
- [ ] Unit tests پاس
- [ ] Integration tests پاس
- [ ] E2E critical path پاس یا به suite اضافه شده
- [ ] Lint/typecheck/build پاس
- [ ] Permission test شده
- [ ] Migration test شده
- [ ] Code/Deliverable review approved یا Review Exception ثبت و تأیید شده
- [ ] QA required? اگر بله QA passed
- [ ] Review/QA evidence در Task موجود است
- [ ] Acceptance Criteria passed
- [ ] Docs/OpenAPI updated
- [ ] Logging/monitoring impact بررسی شده
- [ ] Security impact بررسی شده
- [ ] No open release-blocking bug
- [ ] Staging smoke passed

## 35.3 Definition of Done — Product/Release

- [ ] UAT برای Feature مهم
- [ ] Release note
- [ ] Rollback/migration note در صورت نیاز
- [ ] Production deploy success
- [ ] Production smoke
- [ ] Monitoring clean after release
- [ ] Work Item closed

---

# 36) ریسک‌های پروژه ساخت نرم‌افزار

## R1 — ساخت ابزار سنگین‌تر از نیاز
**ریسک:** تبدیل Minimum Operating System به Jira پیچیده.  
**Mitigation:** P0/P1 discipline، Progressive Disclosure، عدم ساخت custom workflow در MVP.

## R2 — ورود داده ناقص
**ریسک:** داشبورد ظاهراً زیبا ولی غیرقابل اعتماد.  
**Mitigation:** mandatory fields فقط در transition مناسب، completeness metrics.

## R3 — مقاومت کاربران در ثبت کار
**ریسک:** دوباره اطلاعات در ذهن/چت بماند.  
**Mitigation:** فرم سریع، import، notification کم، weekly review فقط از سیستم.

## R4 — مدیران Priority را بدون Opportunity Cost تغییر دهند
**ریسک:** ابزار هم همان آشفتگی را دیجیتال کند.  
**Mitigation:** displaced work rule و change reason.

## R5 — Time Tracking تبدیل به کنترل افراد شود
**ریسک:** مقاومت و داده بد.  
**Mitigation:** Time Tracking در MVP سبک/اختیاری و برای capacity stream analysis، نه performance scoring.

## R6 — Permission Leak
**ریسک:** داده پروژه/مشتری به کاربر غیرمجاز برسد.  
**Mitigation:** tenant-scoped repositories، permission integration tests، security QA.

## R7 — Migration مشکل‌دار
**ریسک:** deploy باعث downtime/data issue شود.  
**Mitigation:** migration rehearsal، backup، expand-contract.

## R8 — گزارش‌ها کند شوند
**ریسک:** با رشد audit/work item dashboard کند شود.  
**Mitigation:** indexes، pre-aggregation در فاز نیاز، query profiling.

## R9 — Statusها به‌روز نشوند
**ریسک:** گزارش دوباره بی‌اعتماد شود.  
**Mitigation:** stale data warnings؛ مثلاً Active item بدون update طی N روز.

## R10 — تعریف Done مبهم باشد
**ریسک:** Taskها زود بسته شوند.  
**Mitigation:** acceptance criteria و QA gate برای Featureهای مهم.


## R11 — Hard-code کردن افراد فعلی
**ریسک:** سیستم با اضافه شدن افراد جدید نیازمند تغییر کد شود.  
**Mitigation:** افراد فقط Seed Data هستند؛ Role/Team/Reviewer policy از DB و Admin قابل تنظیم است.

## R12 — قاطی شدن Job Title با Permission
**ریسک:** تغییر عنوان شغلی ناخواسته دسترسی امنیتی ایجاد کند.  
**Mitigation:** Job Title informational؛ Application Role/Project Role تنها منبع Permission.

## R13 — Review Bottleneck در تیم کوچک
**ریسک:** با وجود یک نفر در یک تخصص، Review تبدیل به گلوگاه یا Self-review پنهان شود.  
**Mitigation:** Review Exception شفاف + Evidence + QA/UAT؛ با اضافه شدن عضو جدید Reviewer separation فعال شود.

## R14 — فارسی‌سازی سطحی
**ریسک:** RTL ظاهری درست باشد ولی Date/Search/Mixed text خراب شود.  
**Mitigation:** Localization layer، Jalali tests، Persian normalization tests و visual regression RTL.


---

# 37) موارد توسعه آینده

## 37.1 Stale Work Detection

اگر Work Item فعال طی X روز Update نشده:
- badge `STALE`
- notification به Owner
- نمایش در Weekly Review

## 37.2 Reason Taxonomy برای Delay

Delay reasons استاندارد:

- Scope Change
- Capacity
- Priority Change
- Support Interrupt
- Infrastructure
- Dependency
- Technical Risk
- External Dependency
- Estimate Error
- Other

این Taxonomy گزارش ماهانه را بسیار قوی‌تر می‌کند.

## 37.3 Risk-adjusted Forecast

بعد از داشتن داده کافی:
- ETA historical accuracy
- confidence calibration
- blocker frequency

برای Forecast بهتر استفاده شود.

## 37.4 Templates

- Feature Template
- Tech Debt Template
- Incident Template
- Infrastructure Change Template

## 37.5 Integrations

در آینده:
- GitHub/GitLab PR link
- Sentry/error monitoring link
- Slack/Telegram notification bridge
- CRM Product Input
- Email intake

## 37.6 People / Team آینده

قابلیت‌های قابل بررسی بعدی:
- Skill/Expertise tags برای Assignment دستی
- Team directory پیشرفته
- Temporary delegation
- Acting Lead
- Capacity scenarios
- Project staffing view

این قابلیت‌ها نباید به رتبه‌بندی خودکار افراد یا تصمیم منابع انسانی تبدیل شوند.

## 37.7 AI — فقط بعد از Data Quality

قابلیت‌های مناسب آینده:
- خلاصه Weekly Review
- خلاصه تغییرات پروژه
- تشخیص Work Itemهای stale/at risk پیشنهادی
- پیشنهاد duplicate intake
- استخراج Decision از Meeting Note

AI نباید در فاز اول جایگزین تصمیم Priority یا Health انسانی شود.

---

# 38) چک‌لیست نهایی تحویل

## Product
- [ ] PRD تأیید شده
- [ ] Roles/RBAC نهایی
- [ ] Work Streamها نهایی
- [ ] Workflow/Health definitions نهایی
- [ ] MVP scope قفل شده

## UX
- [ ] Login
- [ ] Dashboard
- [ ] Projects
- [ ] Board
- [ ] Work Item Detail
- [ ] Intake
- [ ] Support
- [ ] Capacity
- [ ] Weekly Review
- [ ] Reports
- [ ] Team/People
- [ ] My Work
- [ ] Review/QA
- [ ] Admin

## Backend
- [ ] Auth
- [ ] Create User / User Lifecycle
- [ ] People/Team
- [ ] Permission
- [ ] Projects
- [ ] Work Items
- [ ] Intake
- [ ] Prioritization
- [ ] ETA
- [ ] Risk/Blocker
- [ ] Decision
- [ ] Support
- [ ] Capacity
- [ ] Weekly Review
- [ ] Reports
- [ ] Review/QA/Handoff
- [ ] Audit

## Data
- [ ] migrations
- [ ] indexes
- [ ] constraints
- [ ] tenant isolation
- [ ] seed/test data
- [ ] backup
- [ ] restore test

## Quality
- [ ] lint
- [ ] typecheck
- [ ] unit
- [ ] integration
- [ ] E2E
- [ ] permission tests
- [ ] performance baseline
- [ ] security test
- [ ] accessibility smoke
- [ ] Persian/RTL/Jalali regression
- [ ] search normalization tests

## GitHub / Repository
- [ ] Private GitHub Repository ایجاد شده
- [ ] `main` protected است
- [ ] Pull Request برای تغییرات اصلی اجباری است
- [ ] CI روی PR اجرا می‌شود
- [ ] `README.md` از صفر Setup را توضیح می‌دهد
- [ ] `CLAUDE.md` قواعد اجرای Agent را مشخص می‌کند
- [ ] `.env.example` کامل و بدون Secret است
- [ ] Dockerfiles و Compose در Repo هستند

## Visualization / Schedule
- [ ] Global Kanban
- [ ] Project Kanban
- [ ] Team / My Work Kanban
- [ ] Global Gantt
- [ ] Project Gantt
- [ ] Dependency + Milestone display
- [ ] Baseline vs Current ETA
- [ ] ETA Shift Count
- [ ] Baseline Drift Days
- [ ] Cumulative Movement Days
- [ ] Schedule History UI

## Release
- [ ] Shared Pilot/Staging
- [ ] UAT
- [ ] release notes
- [ ] rollback plan
- [ ] domain DNS
- [ ] HTTPS
- [ ] production/pilot deploy
- [ ] database backup
- [ ] restore test
- [ ] smoke test
- [ ] monitoring

---

# ضمیمه A — State Transition Rules پیشنهادی

## Work Item

```text
INBOX -> BACKLOG
INBOX -> CANCELLED

BACKLOG -> READY
BACKLOG -> CANCELLED

READY -> IN_PROGRESS
READY -> BACKLOG       # re-plan
READY -> CANCELLED

IN_PROGRESS -> IN_REVIEW
IN_PROGRESS -> READY   # de-schedule/re-plan with reason
IN_PROGRESS -> CANCELLED

IN_REVIEW -> IN_PROGRESS   # changes requested
IN_REVIEW -> IN_QA         # approved + qa_required
IN_REVIEW -> DONE          # approved + qa_required=false

IN_QA -> IN_PROGRESS       # QA failed
IN_QA -> DONE              # QA passed

DONE -> IN_PROGRESS        # reopen with reason + permission
```

### Guardها

#### INBOX → BACKLOG
- Title
- Reporter
- Source در صورت Intake-linked

#### BACKLOG → READY
- Work Stream
- Owner
- Priority
- Scope حداقلی
- برای Feature P0/P1: Feature Brief حداقل Ready for Review
- Capacity warning evaluated

#### READY → IN_PROGRESS
- Assignee required
- Start timestamp
- WIP warning evaluated

#### IN_PROGRESS → IN_REVIEW
- Reviewer یا Review Exception
- Acceptance Criteria برای task types مشمول Policy
- Evidence/Deliverable ثبت شده

#### IN_REVIEW → IN_QA
- Review approved
- `qa_required=true`
- QA Owner/QA Policy مشخص

#### IN_REVIEW → DONE
- Review approved
- `qa_required=false`
- no open blocker
- DoD passed

#### IN_QA → DONE
- QA passed
- no open blocker
- Acceptance Criteria passed

#### Reopen
- reason required
- history append-only
- previous completion timestamp retained in activity/history

### Review Exception

در تیم تک‌نفره یا نبود Reviewer واجد صلاحیت:
- Reason اجباری
- Evidence اجباری بر اساس Project Policy
- برای کار حساس QA/UAT اجباری
- Exception در Weekly/Quality report قابل مشاهده

---
# ضمیمه B — Business Rules Catalogue

## BR-001
هر Active Work Item باید Work Stream داشته باشد.

## BR-002
هر Work Item مهم باید Owner داشته باشد.

## BR-003
Delivery Health از Workflow State مستقل است.

## BR-004
Blocked بدون Blocker Reason مجاز نیست.

## BR-005
P0/P1 Feature بدون ETA Confidence نباید committed شود.

## BR-006
تغییر ETA مهم باید reason داشته باشد.

## BR-007
تغییر Priority مهم باید reason داشته باشد.

## BR-008
ورود کار P0/P1 در ظرفیت پر باید Opportunity Cost را ثبت کند.

## BR-009
Critical Support می‌تواند Fast Track شود اما بدون Record خیر.

## BR-010
Product Input از Support/Sales به‌صورت پیش‌فرض Task فنی فوری نیست.

## BR-011
Closed Weekly Review immutable است؛ اصلاح بعدی amendment می‌خواهد.

## BR-012
Audit Log توسط کاربران عادی قابل ویرایش/حذف نیست.

## BR-013
Tenant access در Backend اجباری است.

## BR-014
Done item نباید open blocker داشته باشد.

## BR-015
Dependency blocking نباید cycle بسازد.

## BR-016
Unknown health باید در گزارش دیده شود، نه مخفی شود.

## BR-017
Unplanned work بعد از commitment باید علامت بخورد.

## BR-018
Manual priority score override باید traceable باشد.


## BR-019
Job Title هیچ Permission مستقیمی ایجاد نمی‌کند.

## BR-020
عضو با `member_status=DISABLED/SUSPENDED` نمی‌تواند از آن سازمان استفاده کند یا Owner جدید شود؛ `users.account_status=LOCKED` ورود حساب را در همه سازمان‌ها می‌بندد.

## BR-021
Task دارای `qa_required=true` بدون QA Pass به `DONE` نمی‌رود.

## BR-022
Submit to Review نیازمند Reviewer یا Review Exception مطابق Policy است.

## BR-023
Review Exception برای کار حساس باید Evidence و QA/UAT داشته باشد.

## BR-024
Offboarding باید قبل از نهایی شدن Impact/Reassignment را بررسی کند.

## BR-025
عضو می‌تواند چند Team داشته باشد ولی یک Primary Team دارد.

## BR-026
Handoff Returned نیازمند Reason است.

## BR-027
UI کاربر نهایی فارسی است؛ Error/Validation عمومی نباید انگلیسی خام باشد.

## BR-028
Due Date با ETA یکی نیست و تغییر هرکدام Rule مستقل دارد.

## BR-029
Metrics افراد برای planning هستند؛ سیستم Performance Ranking تولید نمی‌کند.


---

# ضمیمه C — نمونه Gherkin برای Ruleهای حیاتی

## Scenario: P0 در ظرفیت پر

```gherkin
Given team capacity for the week is fully allocated
And a new intake is accepted
When an authorized user changes its priority to P0
Then the system must require either a displaced work item or a capacity/scope decision
And the reason must be stored
And affected owners must be notified
```

## Scenario: تغییر ETA

```gherkin
Given a P1 feature has ETA "2026-09-10"
When the owner changes ETA to "2026-09-17"
Then a change reason is required
And the old ETA remains in history
And the new confidence is stored
And the change appears in the next weekly review
```

## Scenario: Blocked

```gherkin
Given a task is IN_PROGRESS
When a user marks delivery health as BLOCKED
Then blocker reason is required
And blocked_since is recorded
And next_action is required
And the task appears in the blocked report
```

## Scenario: Support Product Input

```gherkin
Given support receives a recurring customer request
When it is classified as PRODUCT_INPUT
Then it must enter product intake
And it must not automatically become an IN_PROGRESS technical task
```

## Scenario: Tenant isolation

```gherkin
Given user A belongs to organization A
And work item B belongs to organization B
When user A requests work item B by UUID
Then no business data from work item B is returned
And the security event may be logged according to policy
```


## Scenario: Create new member

```gherkin
Given an admin creates a user with a temporary password
When job title, application role, primary team and email/username are provided
Then the member status is ACTIVE
And must_change_password is true
And no invitation token is created
And the action is audited
```

## Scenario: Job title does not grant permission

```gherkin
Given a contributor's job title changes to "Lead"
When no application role change is approved
Then the user's permissions remain unchanged
And the job title change is audited
```

## Scenario: QA-required task

```gherkin
Given a task has qa_required = true
And review is approved
When the task has no successful QA run
Then transition to DONE is rejected
And the API returns a localized business error
```

## Scenario: Safe offboarding

```gherkin
Given a member owns active work
When an admin starts offboarding
Then the system shows owned tasks, projects, reviews, QA, risks and decisions
And requires a reassignment plan or explicit accepted exception
And active sessions are revoked when offboarding is confirmed
And historical activity remains unchanged
```

## Scenario: Persian search normalization

```gherkin
Given a task contains Persian character "ی" or "ک"
When a user searches using Arabic variants "ي" or "ك"
Then the task can still be found according to normalization policy
```


---

# ضمیمه D — Seed Data پیشنهادی برای Pilot

## Organization Settings

```text
locale: fa-IR
direction: rtl
timezone: Asia/Tehran
calendar: jalali
digits: persian
public_signup: false
```

## افراد فعلی

> Email/Username در اطلاعات دریافتی وجود ندارند؛ هنگام ساخت User توسط Admin وارد می‌شوند و در Seed حدس زده نمی‌شوند.

| Display Name | Job Title | Primary Team | Application Role | Login State |
|---|---|---|---|---|
| خانم ترابی | هد بک‌اند | Backend | TEAM_LEAD | User توسط Admin ساخته می‌شود → ACTIVE |
| آقای گلی | کارشناس بک‌اند | Backend | CONTRIBUTOR | User توسط Admin ساخته می‌شود → ACTIVE |
| آقای دلیری | هد فرانت | Frontend | TEAM_LEAD | User توسط Admin ساخته می‌شود → ACTIVE |
| آقای میلاد نیکروان | ارشد بازاریابی | Marketing & Growth | CONTRIBUTOR | User توسط Admin ساخته می‌شود → ACTIVE |
| خانم مقدم | دیزاینر و تولید محتوا | Design & Content | CONTRIBUTOR | User توسط Admin ساخته می‌شود → ACTIVE |

یک `ORG_OWNER` جداگانه در Setup اولیه تعیین شود.

## Team Defaults

### Backend
- Lead: خانم ترابی
- Member: آقای گلی
- Default reviewer for آقای گلی: خانم ترابی
- WIP Warning: 3 active items/member

### Frontend
- Lead: آقای دلیری
- تا زمان اضافه شدن عضو دیگر: Review Exception policy فعال ولی ثبت‌شده
- QA/UAT برای Featureهای مهم اجباری

### Marketing & Growth
- Senior member: آقای میلاد نیکروان
- Intake from market/sales/customer feedback enabled

### Design & Content
- Member: خانم مقدم
- Handoff to Frontend/Marketing enabled

## ماتریس پیشنهادی مسئولیت ساخت خود نرم‌افزار

> این بخش **پیشنهاد طراحی اجرایی** بر اساس سمت‌های فعلی است و Rule ثابت سازمانی نیست.

| حوزه ساخت محصول | Owner پیشنهادی | همکار/بازبین | خروجی |
|---|---|---|---|
| Backend Architecture / DB / Auth / RBAC | خانم ترابی | آقای گلی | API، Schema، Migration، Security Rules |
| Backend Implementation | آقای گلی | خانم ترابی | Endpoint، Tests، Bug Fix |
| Frontend Architecture / RTL / State Management | آقای دلیری | Reviewer پروژه‌ای در صورت وجود | UI، Integration، Frontend Tests |
| UX/UI و Design System | خانم مقدم | آقای دلیری | Wireframe، Components spec، Visual QA |
| Content/Copy فارسی محصول | خانم مقدم | آقای میلاد نیکروان | Labelها، Empty State، Help Text |
| Flowهای Marketing / Intake / UAT کسب‌وکاری | آقای میلاد نیکروان | خانم مقدم / Project Owner | UAT سناریوهای غیر فنی و ورودی بازار |
| Release Gate نهایی | Project Owner/Admin تعیین‌شده | Leadهای فنی + QA/UAT Owner | Go/No-Go |

### چون QA اختصاصی در فهرست فعلی وجود ندارد
- QA یک **مسئولیت Task-level** است، نه Job Title ثابت.
- برای Backend، Reviewer و QA می‌توانند متفاوت باشند اگر ظرفیت اجازه دهد.
- برای Frontend تک‌نفره، Review Exception ثبت می‌شود و Functional/UAT QA توسط فرد دیگری روی Staging انجام می‌شود.
- برای Design/Content، Approval و QA بر اساس پروژه به Marketing/Project Owner سپرده می‌شود.
- با اضافه شدن QA اختصاصی در آینده، فقط Role/Team/Assignment تغییر می‌کند و Workflow نیاز به بازطراحی ندارد.

## Work Streams
- Product
- Tech Debt
- Support
- Infrastructure

## Saved Views

### عمومی
- کارهای من
- امروز
- عقب‌افتاده
- Blocked / At Risk
- منتظر بازبینی من

### Backend Lead
- Backend In Progress
- Backend Review Queue
- Backend Blocked
- Backend Capacity

### Frontend Lead
- Frontend Backlog
- Frontend Handoffs In
- Frontend At Risk
- Frontend QA Pending

### Marketing
- Marketing Projects
- Market Intake
- Content Waiting
- Campaign Due Soon

### Design & Content
- Design/Content My Work
- Waiting Approval
- Handoffs to Frontend
- Handoffs to Marketing

## Task Templates

1. Backend Task
2. Frontend Task
3. Bug
4. Design Deliverable
5. Content Deliverable
6. Marketing Task
7. Product Feature
8. Tech Debt
9. Infrastructure
10. Support Follow-up

## Delay Reasons
- Scope Change
- Capacity
- Priority Change
- Support Interrupt
- Infrastructure
- Dependency
- Technical Risk
- External Dependency
- Review Delay
- QA Failure
- Handoff Delay
- Estimate Error
- Other

## Onboarding Default Checklist

- ورود موفق به سیستم
- مشاهده پروفایل و Team
- مشاهده «کارهای من»
- مطالعه تعریف State/Health/Priority
- مشاهده Projectهای مجاز
- تنظیم Notification
- بررسی ظرفیت هفتگی
- تکمیل یک Task آزمایشی در محیط Pilot در صورت نیاز

---
# ضمیمه E — دستور اجرای پروژه برای تیم توسعه/Agent

این ترتیب برای پیاده‌سازی مرحله‌به‌مرحله توصیه می‌شود و نباید فازها بی‌دلیل Skip شوند.

## چرخه هر Story

1. Story را بخوان.
2. Acceptance Criteria را به Test Case تبدیل کن.
3. Permission/Data/Localization implications را مشخص کن.
4. Unit/Integration testهای Business Rule را ابتدا یا همزمان بنویس.
5. Backend implementation.
6. Frontend implementation.
7. RTL/Persian/Jalali behavior را بررسی کن.
8. Local lint/typecheck/unit/integration.
9. PR ایجاد کن.
10. CI کامل پاس شود.
11. Code/Deliverable Review انجام شود.
12. Review comments resolve شوند.
13. Staging deploy.
14. QA functional + exploratory + RTL.
15. Bugها با regression test رفع شوند.
16. QA retest.
17. UAT برای flowهای business-critical.
18. Release checklist.
19. Production deploy.
20. Smoke test.
21. Monitor.
22. Story فقط بعد از DoD کامل Close شود.

### Gate اجباری

```text
Requirement
  ↓
Acceptance Criteria
  ↓
Test Design
  ↓
Implementation
  ↓
Automated Checks
  ↓
Review
  ↓
Staging
  ↓
QA
  ↓
UAT (if required)
  ↓
Release
  ↓
Production Smoke
```

اگر هر Gate fail شود، Story به مرحله مناسب برمی‌گردد؛ Done فقط در انتهای مسیر است.

## قانون «اول تست، بعد اعتماد»

برای هر Bug:

1. اول test یا reproduction قابل تکرار بساز.
2. مطمئن شو test fail می‌شود.
3. Fix را اعمال کن.
4. test pass شود.
5. regression suite اجرا شود.
6. سپس PR/Review/QA.

## قانون «هیچ Migration بدون Rollback Thinking»

هر migration باید پاسخ دهد:

- اگر وسط deploy شکست خورد چه می‌شود؟
- آیا old app با new schema سازگار است؟
- آیا data backfill لازم است؟
- آیا lock سنگین ایجاد می‌شود؟
- چطور restore می‌کنیم؟

## قانون «هیچ Permission فقط در Frontend»

هر operation حساس باید backend policy test داشته باشد.

## قانون «هیچ تغییر Priority/ETA بدون History»

UI فقط آخرین مقدار را نشان نمی‌دهد؛ history باید همیشه قابل مشاهده باشد.

---

# ضمیمه F — Minimum Production Readiness Checklist

## Infrastructure
- [ ] HTTPS
- [ ] production DB isolated
- [ ] DB backups
- [ ] backup retention policy
- [ ] restore drill
- [ ] storage backup/retention
- [ ] secrets outside repo

## Security
- [ ] password hashing secure
- [ ] refresh rotation
- [ ] RBAC tested
- [ ] tenant isolation tested
- [ ] rate limits
- [ ] file authorization
- [ ] audit critical events

## Reliability
- [ ] health endpoints
- [ ] structured logs
- [ ] error tracking
- [ ] alert on elevated 5xx
- [ ] migration runbook
- [ ] rollback runbook

## Quality
- [ ] critical E2E green
- [ ] Persian/RTL/Jalali critical flows green
- [ ] regression green
- [ ] UAT sign-off
- [ ] no S1/S2 unresolved without explicit acceptance

## Operations
- [ ] Admin account recovery procedure
- [ ] user disable procedure
- [ ] incident contact/process
- [ ] release owner
- [ ] production smoke checklist

---

# نتیجه نهایی طراحی

این سامانه باید از همان روز اول یک اصل را حفظ کند:

> هدف افزایش تعداد فرم‌ها یا جلسات نیست؛ هدف این است که اجرای واقعی سازمان قابل مشاهده، قابل توضیح و قابل تصمیم‌گیری شود.

نسخه MVP موفق نسخه‌ای نیست که بیشترین Feature را داشته باشد. نسخه موفق نسخه‌ای است که بتوان با آن بدون Spreadsheet و روایت شفاهی پاسخ داد:

- الان روی چه چیزی کار می‌کنیم؟
- چرا این‌ها اولویت‌اند؟
- ظرفیت کجا می‌رود؟
- چه چیزی متوقف یا در خطر است؟
- ETA بر چه فرضی است؟
- چه چیزی تغییر کرد و چرا؟
- چه تصمیمی لازم است؟
- اگر کار جدید آمد، چه چیزی عقب رفت؟
- چه کاری منتظر Review/QA یا Handoff است؟
- آیا فرد/تیمی Overloaded یا بدون ظرفیت است؟

اگر این سؤال‌ها با داده داخل سیستم پاسخ داده شوند، «حداقل سیستم اجرایی» سند به‌صورت نرم‌افزار عملیاتی پیاده شده است.

---

# 39) GitHub-first و قرارداد همکاری تیم توسعه

## 39.1 هدف

Repository باید از روز اول **منبع حقیقت کد** باشد و هیچ بخشی از پروژه فقط روی سیستم Claude/Developer باقی نماند. خروجی هر مرحله قابل Commit، Review و Deploy باشد.

## 39.2 Repository — مدل ساده MVP

فاز فعلی:

```text
GitHub Personal Account
  └── Private Repository
       ├── Owner: صاحب پروژه
       └── Collaborators: اعضای فنی لازم
```

- Repository روی اکانت شخصی صاحب پروژه ساخته می‌شود.
- `Private` بودن پیشنهاد می‌شود.
- Branch اصلی: `main`.
- GitHub Organization یا پلن پولی لازم نیست.
- CODEOWNERS، Ruleset و Branch Protection اجباری نیستند.
- GitHub Pages برای اجرای این Full-stack App استفاده نمی‌شود.
- کاربران شرکت برای استفاده از Pilot **هیچ Clone نمی‌کنند** و فقط URL عمومی را باز می‌کنند.
- دسترسی GitHub فقط برای صاحب پروژه و هر Developerی است که واقعاً روی کد کار می‌کند؛ افزودن Collaborator در Pilot اختیاری است.
- اگر بعداً تیم سرور خواست، همین Repo مبنای Deploy خواهد بود.

### اضافه کردن همکار

صاحب Repo فقط از Settings → Collaborators افراد لازم را با GitHub Username دعوت می‌کند. فعلاً همین کافی است.

برای تیم فعلی، دسترسی Repository عمدتاً برای اعضای فنی لازم است:

- خانم ترابی
- آقای گلی
- آقای دلیری

بازاریابی و دیزاین برای استفاده از خود نرم‌افزار الزاماً نیاز به دسترسی GitHub ندارند.

## 39.3 Workflow ساده GitHub

### وقتی فقط صاحب پروژه/Claude روی کد کار می‌کند

برای سرعت MVP، Commit مستقیم به `main` قابل قبول است، به شرط اینکه قبل از Push:

```text
lint + typecheck + test + build
```

اجرا شده باشد و `.env`/Secret وارد Commit نشده باشد.

### وقتی چند Developer همزمان کار می‌کنند

Branch ساده توصیه می‌شود:

```text
feat/login
feat/kanban
fix/eta-history
```

Flow:

```text
Sync main
  ↓
Create branch
  ↓
Code + Test
  ↓
Commit + Push
  ↓
PR
  ↓
Review در صورت امکان
  ↓
Merge
```

PR برای همکاری تیمی مفید است، ولی MVP به Branch Protection یا Plan خاص GitHub وابسته نیست.

قواعد حداقلی:

- Force Push به `main` انجام نشود.
- Secret Commit نشود.
- قبل از Merge/Push تست‌ها اجرا شوند.
- اگر Migration وجود دارد در PR/Commit واضح نوشته شود.
- Conflict پیچیده با حدس حل نشود؛ یکی از اعضای فنی بررسی کند.

## 39.4 Pull Request Template

هر PR حداقل:

```markdown
## مسئله
چه چیزی حل شده؟

## تغییرات
- ...

## Acceptance Criteria
- [ ] ...

## Test Evidence
- [ ] Unit
- [ ] Integration
- [ ] E2E/Manual where applicable

## Database
- [ ] No migration
- [ ] Migration included and tested

## UI / RTL
- [ ] Not applicable
- [ ] Persian/RTL checked

## Risk / Rollback
...
```

## 39.5 CODEOWNERS — Future/Optional

`CODEOWNERS` برای MVP لازم نیست. اگر بعداً تعداد Contributorها زیاد شد می‌توان آن را اضافه کرد؛ Username افراد هرگز حدس زده نشود.

منطق پیشنهادی:

- Backend/API/Prisma → Head Backend به‌عنوان Owner اصلی Review
- Frontend/UI → Head Frontend
- Design assets/copy → Designer/Content برای UAT محتوایی
- Marketing flow → Senior Marketing برای UAT فرآیندهای Intake/Marketing

CODEOWNERS جای Permission داخل اپ را نمی‌گیرد؛ فقط فرآیند Review کد است.

## 39.6 Issue / Task Link

تا قبل از آماده شدن خود سامانه، GitHub Issue می‌تواند برای کارهای ساخت محصول استفاده شود. بعد از آماده شدن MVP:

- Work Item Key در Branch/PR نوشته شود.
- لینک PR در Work Item ثبت شود.
- Merge شدن PR به معنی Done شدن Task نیست؛ QA/UAT/DoD نیز باید کامل شود.

## 39.7 Definition of Repository Ready

قبل از شروع Featureهای زیاد، Repository/Pilot باید:

- Build شود؛
- Setup توسعه طبق README قابل تکرار باشد؛
- Migration اجرا شود؛
- Admin Bootstrap اجرا شود؛
- Hosted Pilot URL باز شود؛
- Login کار کند؛
- تست‌ها اجرا شوند؛
- Dockerfile production build شود؛
- CI پایه Pass شود.

این Milestone با نام **M0 — Repository & Deployability Foundation** قبل از توسعه گسترده UI توصیه می‌شود.

---

# 40) Pilot آنلاین Local-first و بدون سرویس داده خارجی

## 40.1 اصل اصلی

نیاز کاربر همچنان این است:

```text
GitHub Personal Repo
       ↓
Build / Run on one online machine
       ↓
One public URL
       ↓
Company users Login and work
```

اما برخلاف نسخه قبلی، داده به Managed PostgreSQL یا Storage خارجی وابسته نیست.

## 40.2 Runtime خودکفا

روی ماشینی که App اجرا می‌شود:

```text
Application
├── React static UI
├── NestJS API
├── SQLite: data/app.db
├── Uploads: data/uploads/
└── Backups: data/backups/
```

فقط یک شرط بیرونی داریم: **دیسک پایدار**.

## 40.3 GitHub چه نقشی دارد؟

GitHub فقط برای:

- نگه‌داری Source Code؛
- History کد؛
- Backup کد؛
- Push نسخه‌های جدید؛
- CI ساده؛
- همکاری فنی در آینده.

دیتابیس، Attachment، Password و داده کاربران داخل GitHub Commit نمی‌شوند.

## 40.4 URL عمومی

برای URL عمومی، App باید روی یک سیستم قابل دسترس از اینترنت اجرا شود. این سیستم می‌تواند:

- یک Hosting ساده با Persistent Disk؛
- یک VPS ساده؛
- یک Server شرکت در آینده؛
- یا هر Runtime دیگری که فایل `data/` را بین Restartها نگه دارد.

**PRD به هیچ Provider مشخصی وابسته نیست.** Render/Vercel/Railway و ... Requirement محصول نیستند.

## 40.5 چیزی که نباید انتخاب شود

برای Pilot این معماری روی Runtimeی که Disk آن Ephemeral است و پس از Redeploy پاک می‌شود، بدون Persistent Volume استفاده نشود؛ چون SQLite و Uploadها از بین می‌روند.

## 40.6 ساخت کاربران

SMTP نداریم.

Flow:

```text
Admin Login
  ↓
Users
  ↓
Create User
  ↓
Name + Email/Username + Team + Role + Temporary Password
  ↓
User opens same public URL
  ↓
Login
  ↓
Force password change on first login
```

Admin همچنین می‌تواند Password کاربر را Reset کند.

## 40.7 انتقال بعدی به Server

اگر Pilot موفق شد، ساده‌ترین انتقال:

```text
1. Stop app
2. Backup data/app.db + data/uploads/
3. Copy repository/build to server
4. Copy data/ directory
5. Set .env
6. Start app
7. Smoke test
```

تا وقتی Scale واقعی نیاز ایجاد نکرده، حتی روی Server نیز می‌توان SQLite را حفظ کرد.

مهاجرت به PostgreSQL فقط وقتی بررسی شود که یکی از این‌ها رخ دهد:

- کاربران/Write concurrency به شکل واقعی زیاد شود؛
- نیاز به چند App Instance ایجاد شود؛
- گزارش‌ها یا حجم داده SQLite را محدود کند؛
- تیم Server استاندارد سازمانی دیگری الزام کند.

## 40.8 اصل حذف‌پذیری MVP

اگر Pilot رد شد:

- Runtime/Hosting را Stop/Delete کن؛
- `data/` را در صورت نیاز Export/Backup کن؛
- Repo را نگه دار یا حذف کن.

هیچ Managed DB، Bucket، Queue یا Vendor resource دیگری برای Cleanup وجود ندارد.

---

# 41) Kanban و Gantt سراسری/پروژه‌ای

## 41.1 چرا هر دو لازم‌اند؟

Kanban جواب می‌دهد:

> الان هر کار در چه مرحله‌ای است؟

Gantt جواب می‌دهد:

> این کارها نسبت به زمان، Milestone و Dependency چگونه روی هم قرار گرفته‌اند و برنامه چقدر جابه‌جا شده؟

هیچ‌کدام جای دیگری را نمی‌گیرد.

## 41.2 Scopeهای نمایش Kanban

### Global Kanban
همه کارهای قابل مشاهده از همه پروژه‌ها.

### Project Kanban
فقط Work Itemهای یک Project.

### Team Kanban
مثلاً Backend یا Frontend.

### My Work
کارهای Assignee/Owner/Reviewer/QA Owner فعلی.

## 41.3 Kanban Columns

Default:

```text
Inbox
Backlog
Ready
In Progress
In Review
In QA
Done
```

Cancelled از View اصلی مخفی ولی قابل Filter باشد.

## 41.4 Swimlaneهای مفید

کاربر بتواند در صورت نیاز بر اساس یکی از این‌ها Swimlane بسازد:

- Project
- Team
- Owner
- Assignee
- Priority
- Work Stream
- Delivery Health

## 41.5 اطلاعات Card

حداقل روی Card:

- Key + Title
- Project
- Priority
- Assignee
- Team
- Delivery Health
- ETA
- `+N روز` یا `-N روز` Drift از Baseline اگر تغییر کرده
- Blocked badge
- Review/QA badge

Card نباید با جزئیات زیاد شلوغ شود؛ اطلاعات کامل در Detail Drawer/Page.

## 41.6 Gantt Global

Global Gantt می‌تواند در Level اول Projectها را نشان دهد و Expand هر Project، Milestone/Feature/Taskهای زمان‌دار را باز کند.

حداقل قابلیت:

- Expand/Collapse
- Day/Week/Month zoom
- Today marker
- Milestones
- Dependencies
- Baseline bar
- Current ETA bar
- Completed progress
- Filter
- Search

## 41.7 Gantt Project

در Project Detail:

```text
Project
 ├─ Milestone 1
 │   ├─ Feature A
 │   │   ├─ Task 1
 │   │   └─ Task 2
 │   └─ Feature B
 └─ Milestone 2
```

اگر Parent تاریخ صریح ندارد، می‌توان Summary bar آن را از فرزندان محاسبه کرد ولی باید در UI مشخص باشد که تاریخ «محاسبه‌شده» است نه «تعهد صریح».

## 41.8 Baseline vs Current در Gantt

برای Work Item دارای تغییر ETA:

```text
Baseline:  [==========]
Current:      [=============]
              ↳ +7 days
```

این یکی از مهم‌ترین Viewهای مدیریتی سیستم است.

## 41.9 Drag در Gantt

Drag/Resize نباید صرفاً `eta_end` را Update کند.

Flow:

```text
User drags date
  ↓
Show Change ETA dialog
  ↓
Old/New dates
Shift = +N/-N days
Reason Type
Reason
Confidence
Assumptions changed?
  ↓
Confirm
  ↓
Transaction:
Current ETA update + Schedule History insert + Audit
```

Cancel یعنی هیچ تغییری ذخیره نشود.

## 41.10 User Storyهای نمایشی

### US-VIEW-01 — Global Kanban
As a manager, I want to see all visible work across projects in one Kanban so that I can understand execution state without opening projects one by one.

Acceptance:
- Permission scope رعایت شود.
- Filter و Saved View کار کند.
- Card Health و ETA Drift را نشان دهد.

### US-VIEW-02 — Project Gantt
As a project owner, I want to see Milestones, dated work items and dependencies on a timeline so that I can understand schedule impact.

Acceptance:
- Baseline و Current قابل تشخیص باشند.
- Dependency دیده شود.
- Work Item بدون تاریخ در unscheduled list قرار گیرد.

### US-VIEW-03 — Global Gantt
As an executive, I want a cross-project timeline so that I can see overlapping commitments and delayed projects.

Acceptance:
- Project expand/collapse.
- Project/Team/Priority filters.
- Drift badge.

### US-VIEW-04 — Safe Date Drag
As an authorized owner, I want to adjust a task date from Gantt but be forced to record the reason so schedule history remains trustworthy.

Acceptance:
- Drag opens change dialog.
- Cancel writes nothing.
- Confirm writes Current ETA + History + Audit atomically.

## 41.11 Performance MVP

در Gantt سراسری، به‌جای Load تمام تاریخچه‌ها:

- لیست جاری Work Itemها + Baseline fields Load شود.
- History فقط وقتی Detail باز شد Fetch شود.
- Pagination/virtualization اگر تعداد ردیف بالا رفت اضافه شود.

---

# 42) رهگیری Estimate/ETA، Baseline و میزان جابه‌جایی تاریخ‌ها

## 42.1 دو مفهوم متفاوت

### Effort Estimate
مثلاً:

```text
16 ساعت
3 روز کاری
5 Story Points (اگر بعداً استفاده شد)
```

در MVP مقدار پایه بهتر است `estimate_minutes` باشد و UI آن را به ساعت/روز نشان دهد.

### ETA / Schedule Estimate
بازه یا تاریخی که انتظار داریم خروجی آماده شود.

این دو نباید با هم یکی فرض شوند.

## 42.2 Baseline اولیه

اولین ETA که بعد از Ready/Commitment رسمی ثبت می‌شود:

```text
First Committed ETA
```

این تاریخ برای همیشه حفظ می‌شود.

مثال:

```text
Baseline: 1405/06/10
Current:  1405/06/17
Drift:    +7 days
```

## 42.3 Timeline تاریخچه

در Work Item Detail یک تب «تاریخچه برآورد»:

```text
نسخه 1 — 10 شهریور — High
برآورد اولیه

نسخه 2 — 13 شهریور — Medium — +3 روز
دلیل: Dependency
توضیح: API سرویس X دیرتر آماده شد

نسخه 3 — 17 شهریور — Medium — +4 روز
دلیل: Support Interrupt
توضیح: Incident پرداخت دو روز ظرفیت Backend را گرفت
```

Summary:

```text
برآورد اولیه:        10 شهریور
برآورد فعلی:         17 شهریور
تعداد جابه‌جایی:     2
آخرین جابه‌جایی:     +4 روز
Drift از Baseline:   +7 روز
مجموع حرکت برنامه:   7 روز
```

اگر تاریخ ابتدا +5 و بعد -3 شود:

```text
Baseline Drift = +2
Cumulative Movement = 8
```

این تفاوت برای فهم ثبات برنامه مهم است.

## 42.4 وقتی Task Done شد

سیستم ثبت کند:

- Actual Completion Date
- Baseline Delay/Lead
- Last ETA Error
- Number of Shifts
- Cumulative Movement
- Reason distribution

مثال:

```text
Baseline ETA: 10 Sep
Final ETA:    17 Sep
Done:         16 Sep

Baseline Delay = +6 days
Last ETA Error = -1 day
```

یعنی برنامه اولیه 6 روز عقب افتاده، ولی آخرین Forecast یک روز محافظه‌کارانه بوده است.

## 42.5 گزارش مدیریتی Schedule Changes

Filters:

- Date Range
- Project
- Team
- Owner/Assignee
- Priority
- Work Stream
- Reason Type

Columns:

- Work Item
- Baseline ETA
- Current/Final ETA
- Actual Done
- Shift Count
- Baseline Drift
- Cumulative Movement
- Last Reason
- Health

Charts در فاز بعدی مجازند، ولی MVP ابتدا Table + Summary Cards کافی است.

## 42.6 تحلیل علت جابه‌جایی

سیستم باید بتواند بگوید در یک بازه مثلاً:

```text
35% Scope Change
25% Support Interrupt
20% Dependency
10% Technical Discovery
10% Capacity Change
```

این گزارش برای اصلاح سیستم اجراست، نه پیدا کردن «مقصر».

## 42.7 Re-estimation Rule

Developer باید بتواند بگوید Estimate قبلی با اطلاعات جدید معتبر نیست؛ اما:

- مقدار قبلی حذف نمی‌شود.
- Reason ثبت می‌شود.
- اگر ETA نیز متاثر شد، ETA Change هم ثبت می‌شود.
- Change Event در Weekly Review دیده می‌شود اگر Priority/Impact آن مهم باشد.

## 42.8 Acceptance Criteria کلیدی

### AC-SCHED-01
Given یک Work Item اولین ETA committed را می‌گیرد، When ذخیره می‌شود، Then First Committed ETA و History v1 ساخته شوند.

### AC-SCHED-02
Given Baseline وجود دارد، When ETA تغییر می‌کند، Then Baseline تغییر نکند و History v2 ایجاد شود.

### AC-SCHED-03
When ETA از 10 به 17 تغییر کند، Then Last Shift و Baseline Drift هر دو `+7` روز باشند.

### AC-SCHED-04
Given تغییرات `+5` و `-3`، Then Baseline Drift برابر `+2` و Cumulative Movement برابر `8` باشد.

### AC-SCHED-05
When ETA از Gantt drag شود، Then Dialog Reason باز شود و بدون Confirm هیچ Update انجام نشود.

### AC-SCHED-06
When Task Done شود، Then Actual Completion با Baseline و Last ETA مقایسه شود.

### AC-SCHED-07
Direct update به ETA بدون History باید در Service/Repository Test Fail شود.

### AC-SCHED-08
تمام محاسبات ETA بر پایه Date تقویمی انجام شوند و تبدیل Jalali صرفاً Presentation باشد؛ مقدار canonical در DB تاریخ استاندارد است.

## 42.9 Test Plan اختصاصی Schedule/Gantt

### Unit
- محاسبه `Last Shift Days` برای جلو/عقب رفتن تاریخ
- محاسبه `Baseline Drift`
- محاسبه `Cumulative Movement`
- محاسبه Completion Variance
- تبدیل نمایش Jalali بدون تغییر مقدار canonical

### Integration
- Update ETA و Insert History در یک Transaction
- Rollback کامل هر دو در صورت Failure
- Baseline immutable
- Permission برای تغییر ETA
- Dependency cycle prevention

### API
- GET Schedule History ترتیب نسخه‌ها را درست برگرداند
- GET Schedule Metrics با History سازگار باشد
- POST ETA بدون Reason در حالت required باید 4xx بدهد

### E2E
- ساخت Task → ثبت ETA اولیه → تغییر ETA → مشاهده Drift در Card
- تغییر ETA از Gantt → Reason Dialog → History
- Done کردن Task → مشاهده Final Baseline Delay و Last ETA Error
- Filter Global Gantt و Global Kanban بر اساس Team/Project

### Regression
Bug مربوط به Drift/History بدون Regression Test بسته نشود.

---

# 43) قرارداد اجرای مرحله‌ای با Claude / AI Coding Agent

## 43.1 هدف

PRD به Agent داده می‌شود تا پروژه را مرحله‌ای بسازد، نه اینکه یک‌باره حجم زیادی کد بدون Validation تولید کند.

در Root Repository یک `CLAUDE.md` پیشنهاد می‌شود که این قواعد را خلاصه کند.

## 43.2 قانون Golden Path

برای هر Feature:

```text
Read PRD section
  ↓
Create/Update issue or implementation note
  ↓
Confirm data/API/UI impact from existing spec
  ↓
Write/Update tests
  ↓
Implement smallest complete slice
  ↓
Run lint + typecheck + tests
  ↓
Review diff
  ↓
Fix issues
  ↓
Commit
  ↓
Push to GitHub
  ↓
Branch/PR فقط وقتی چند نفر همزمان روی کد کار می‌کنند یا Review لازم است
```

Agent نباید Feature بعدی را با Testهای شکسته شروع کند.

## 43.3 ترتیب پیشنهادی Build

### M0 — Repository Foundation

- Monorepo
- pnpm workspace
- React/Vite + NestJS
- SQLite/Prisma
- Docker Compose
- `.env.example`
- CI
- README
- CLAUDE.md
- Health checks
- Publish روی GitHub شخصی Private
- Local seed قابل اجرا برای Developer
- Production/Pilot Dockerfile build

### M1 — Auth + Organization + People

- Login
- Admin Bootstrap from `ADMIN_*` Environment
- Create User + Temporary Password از UI
- Force password change on first login
- Roles/Permissions
- Teams
- Seed اطلاعات سازمانی افراد فعلی بدون Credential جعلی

### M2 — Project + Work Item Core

- Project CRUD
- Work Item CRUD
- Workflow
- Health
- My Work

### M3 — Kanban

- Project Kanban
- Global Kanban
- Team/My Work views
- Filters

### M4 — ETA / Estimate History

- First baseline
- Schedule History
- Drift Metrics
- Schedule History UI
- Tests

### M5 — Gantt

- Project Gantt
- Global Gantt
- Milestones
- Dependencies
- Baseline vs Current
- Safe drag/change flow

### M6 — Intake / Priority / Risk / Decision

### M7 — Review / QA / Handoff

### M8 — Weekly Review / Reports / Schedule Change Report

### M9 — Online Pilot Run

- GitHub personal repo published
- Single app runtime built from repo
- Persistent `data/` directory configured
- SQLite migration working
- Admin bootstrap from Environment working
- Public Pilot URL working
- Restart persistence test passed
- Backup/restore smoke test passed
- UAT with company users
- Server/Domain اختصاصی فقط در صورت تأیید Pilot

## 43.4 Agent Rules

Claude/Agent باید:

- قبل از ایجاد Library جدید بررسی کند آیا واقعاً لازم است.
- Dependency جدید فقط با دلیل وارد کند.
- در MVP PostgreSQL/Redis/S3/SMTP/Queue/Kubernetes یا Managed Service اضافه نکند مگر PRD تغییر کرده باشد.
- تمام Persistence را روی `data/app.db` و `data/uploads/` نگه دارد.
- Migration را همراه Schema Change بسازد.
- Seed را idempotent طراحی کند.
- Secret نسازد یا Commit نکند.
- UI فارسی/RTL را در تمام Screenهای جدید رعایت کند.
- Business Rule را داخل UI پخش نکند.
- Permission را فقط در Frontend enforce نکند؛ Backend منبع نهایی Authorization باشد.
- ETA را هرگز مستقیم و بدون Schedule History update نکند.
- برای Bug ابتدا Regression Test بسازد هرجا عملی است.
- بعد از هر Milestone، README و API docs را Sync کند.

## 43.5 Stop Conditions

Agent باید Feature را «تمام‌شده» اعلام نکند اگر:

- Test fail است؛
- migration اجرا نمی‌شود؛
- lint/typecheck fail است؛
- Permission test ندارد در Feature حساس؛
- Persian/RTL برای UI بررسی نشده؛
- API contract با Frontend mismatch دارد؛
- README برای Setup تغییر کرده ولی Update نشده؛
- Build Docker fail است.

## 43.6 خروجی هر Milestone

حداقل:

```text
1. Code
2. Tests
3. Migration if needed
4. Updated docs
5. Changelog summary
6. Known limitations
7. Manual QA checklist
8. Git commit/PR-ready state
```

## 43.7 دستور مهم برای Agent

پیاده‌سازی باید **قابل تحویل در هر Milestone** بماند. اگر Feature بزرگ است، Vertical Slice بسازد؛ مثلاً Gantt ابتدا Read-only، سپس Dependency، سپس Drag با History. از تولید همزمان ده‌ها Feature نیمه‌تمام خودداری شود.

---

# 44) راهنمای GitHub برای اولین پروژه و Vibe Coding

## 44.1 اصل ساده

اگر کاربر اصلی این پروژه Git/GitHub را حرفه‌ای بلد نیست، **نباید موفقیت پروژه به حفظ کردن Commandهای Git وابسته باشد**.

برای Windows/macOS مسیر پیشنهادی کاربر غیرحرفه‌ای:

```text
GitHub.com + GitHub Desktop + Editor/Claude
```

اعضای فنی می‌توانند CLI استفاده کنند، ولی Workflow یکی است.

## 44.2 قبل از ساخت Repository

چک‌لیست صاحب پروژه:

- [ ] GitHub account فعال
- [ ] 2FA فعال
- [ ] Recovery codeها خارج از لپ‌تاپ و در محل امن ذخیره شده
- [ ] Repository روی اکانت شخصی شما ساخته می‌شود و Private است
- [ ] GitHub Desktop نصب شده اگر کاربر با CLI راحت نیست
- [ ] Docker Desktop / Docker Engine مطابق سیستم توسعه نصب شده

## 44.3 Repository از ابتدا چه فایل‌هایی داشته باشد؟

```text
README.md
CLAUDE.md
PROJECT_STATUS.md
.env.example
.gitignore
package.json
pnpm-lock.yaml
docker-compose.yml
docker-compose.prod.yml
apps/
  web/
  api/
packages/             # فقط اگر واقعاً نیاز شد
docs/
  PRD.md
  BEGINNER_GITHUB_GUIDE.md
  DEPLOY_RUNBOOK.md              # optional until server deploy
  BACKUP_RESTORE_RUNBOOK.md      # optional until server deploy
  UAT_CHECKLIST.md
.github/
  workflows/ci.yml
  pull_request_template.md
```

`PROJECT_STATUS.md` برای Vibe Coding بسیار مهم است و باید کوتاه بماند:

```markdown
# Project Status

Current milestone: M1
Last known green commit: <sha/tag>

## Done
- M0 repository foundation

## In progress
- Login

## Next
- Create user with temporary password

## Known issues
- ...

## Do not start yet
- Gantt
- Reports
```

Claude باید در پایان هر Milestone این فایل را Update کند.

## 44.4 اولین Publish امن

اگر Claude ابتدا کد را Local ساخته است:

1. Folder پروژه را با GitHub Desktop باز کنید (`Add Existing Repository`).
2. مطمئن شوید `.env`, `.env.local`, `.env.production`, backupها و فایل‌های Secret در Changes دیده نمی‌شوند.
3. اگر دیده شدند، **Commit نکنید**؛ ابتدا `.gitignore` اصلاح شود.
4. اولین Commit فقط Foundation باشد.
5. Repository را روی **اکانت شخصی خودتان** و به‌صورت `Private` Publish کنید.
6. بعد از Publish، صفحه Repository را روی GitHub باز کنید و Visibility را دوباره بررسی کنید.
7. CI را روی یک تغییر کوچک تست کنید.
8. سپس اعضای تیم از داخل Admin ساخته شوند.

اگر Repository را اول در GitHub می‌سازید، Clone با GitHub Desktop انجام شود و Claude داخل همان Folder کار کند؛ دو Copy جدا از پروژه نسازید.

## 44.5 اولین Branch / Commit / PR — بدون نیاز به حفظ Git

Workflow روزمره:

```text
1. Fetch/Pull main
2. New Branch from main
3. Claude/Developer changes code
4. Review Changes/Diff
5. Run tests
6. Commit
7. Push/Publish branch
8. Open Pull Request
9. CI
10. Review
11. Merge
12. Sync main again
```

نمونه Branch:

```text
feat/login
fix/eta-history
chore/docker-setup
```

برای کاربر تازه‌کار مهم‌تر از naming دقیق این است که **روی `main` مستقیم کار نکند**.

## 44.6 معنی پنج واژه‌ای که صاحب پروژه باید بداند

- **Repository:** پوشه اصلی پروژه + تاریخچه تغییرات روی GitHub.
- **Branch:** مسیر موقت و امن برای یک تغییر.
- **Commit:** Snapshot با توضیح کوتاه از تغییر.
- **Push:** فرستادن Commitهای Local به GitHub.
- **Pull Request (PR):** درخواست بررسی و Merge تغییر به `main`.

برای مدیریت پروژه همین پنج مفهوم در شروع کافی است.

## 44.7 وقتی Conflict دیدید

کاربر غیرحرفه‌ای نباید Conflict پیچیده را با حدس Resolve کند.

Rule:

1. Commit/Push فعلی را متوقف کنید.
2. از فایل‌های تغییرکرده Snapshot/Backup داشته باشید.
3. به Head Frontend/Backend یا فرد فنی مربوط ارجاع دهید.
4. Claude می‌تواند توضیح دهد Conflict چیست، ولی نباید بدون Review انسانی بخش‌های business-critical را کورکورانه انتخاب کند.

## 44.8 ساخت اعضای شرکت

پیشنهاد:

- Backend → خانم ترابی، آقای گلی
- Frontend → آقای دلیری
- Design/Content و Marketing فقط زمانی Repository access بگیرند که واقعاً برای UAT/Docs/Assets لازم است؛ برای استفاده از خود App نیازی به دسترسی GitHub ندارند.

اصل Least Privilege رعایت شود.

---

# 45) Safety Guardrails برای Git / Database / Docker / Claude

## 45.1 دستورهای کم‌ریسک برای مشاهده وضعیت

این‌ها معمولاً برای بررسی امن‌اند:

```bash
git status
git diff
git log --oneline -n 20
docker compose ps
docker compose logs --tail=200
```

`git pull --ff-only` برای Sync ساده ترجیح دارد چون از ساخت Merge Commit ناخواسته جلوگیری می‌کند.

## 45.2 Danger Zone — بدون نظر فرد فنی اجرا نشود

روی پروژه واقعی/Server این Commandها برای کاربر تازه‌کار **ممنوع** هستند مگر فرد فنی دقیقاً دلیل و Recovery Plan را بداند:

```text
git push --force
git push -f
git reset --hard
git clean -fd / -fdx
rm -rf ...
docker compose down -v
docker volume rm ...
pnpm prisma migrate reset
npx prisma migrate reset
DROP DATABASE
DROP TABLE
TRUNCATE ...
DELETE بدون WHERE
حذف دستی migrationهای قبلاً deploy شده
ویرایش مستقیم داده Production برای «درست کردن سریع»
```

دلیل کلیدی:

- `docker compose down -v` می‌تواند Volume/Persistent Data متصل به `data/` را حذف کند اگر اشتباه تنظیم شده باشد.
- `prisma migrate reset` برای دیتابیس توسعه است و داده را پاک می‌کند.
- Force Push می‌تواند تاریخچه قابل اتکای تیم را بازنویسی کند.

## 45.3 قانون Environment واضح

Environmentها باید اسم صریح داشته باشند:

```text
APP_ENV=local
APP_ENV=test
APP_ENV=pilot
APP_ENV=production
```

هر Script مخرب باید در `pilot/production` Fail شود.

Repository باید Helper داشته باشد که قبل از DB command حساس، مسیر فایل `app.db` و `APP_ENV` را چاپ کند و در Pilot/Production اجازه Reset ندهد.

## 45.4 قانون Secret

این فایل‌ها/مقادیر هرگز Commit نشوند:

```text
.env
.env.local
.env.production
*.pem
*.key
data/app.db
data/uploads/
data/backups/
*.db
*.db-wal
*.db-shm
AUTH_SECRET واقعی
ADMIN_PASSWORD واقعی
SSH private key
```

`.env.example` فقط اسم متغیر و مقدار Dummy دارد.

اگر Secret اشتباهی Commit شد:

1. فقط حذف فایل از Commit کافی نیست.
2. Secret فوراً Rotate/Revoke شود.
3. سپس History cleanup در صورت نیاز توسط فرد فنی انجام شود.

## 45.5 Ruleهای Claude / Coding Agent برای کاربر تازه‌کار

در `CLAUDE.md` این Rules صریح باشند:

Claude مجاز است بدون تأیید جداگانه:

- فایل Local پروژه را تغییر دهد؛
- تست اجرا کند؛
- lint/typecheck/build اجرا کند؛
- migration جدید برای Schema Change بسازد؛
- Docker Local را بالا بیاورد؛
- Diff را Review و Bug را Fix کند.

Claude **باید قبل از انجام** این عملیات از انسان تأیید بگیرد:

- `git push` به `main`
- Force Push یا History Rewrite
- Merge PR
- تغییر Visibility Repository
- حذف Repository/Branch/Tag مهم
- تغییر DNS/Domain
- ایجاد یا حذف Cloud/VPS resource
- خواندن/چاپ/تغییر Secret Production
- اجرای Production Migration
- اجرای هر DB Reset/Delete/Restore روی Pilot/Production
- `docker compose down -v` روی هر محیط دارای داده
- Deploy به Production
- Rollback Production

Claude نباید با عبارت‌هایی مثل «احتمالاً امن است» Guardrail را دور بزند.

## 45.6 Checkpoint قبل از تغییر حساس

قبل از Migration/Deploy مهم:

```text
Current branch/tag:
Current commit SHA:
Target environment:
Backup created at:
Backup restore tested? yes/no
Migration list:
Rollback plan:
Approver:
```

این Checkpoint در Release Note یا Deploy Log ثبت شود.

---

# 46) Runbook ساده اجرا، Backup، Rollback و Recovery

## 46.1 سه حالت

```text
Local Development
      ↓
Online Pilot on one machine + persistent data/
      ↓
Future Company Server if approved
```

هیچ مرحله‌ای نیازمند Managed Database نیست.

## 46.2 First Pilot Run

پیش‌نیاز فقط:

- Repository Build شده باشد؛
- Runtime همیشه روشن یا قابل دسترس باشد؛
- پوشه `data/` Persistent باشد؛
- `.env` روی Runtime وجود داشته باشد؛
- Admin password از Default ناامن تغییر کرده باشد.

ترتیب:

1. Build موفق.
2. `data/` ساخته/mount شود.
3. Prisma Migration اجرا شود.
4. App Start شود.
5. `/health/live` بررسی شود.
6. Admin Login.
7. یک User آزمایشی بساز.
8. یک Project و Task بساز.
9. یک فایل کوچک Attach کن.
10. App را Restart کن.
11. Login مجدد.
12. Task و Attachment باید باقی مانده باشند.
13. سپس پنج کاربر واقعی شرکت ساخته شوند.

## 46.3 Scriptهای ساده

Repository حداقل این Commandها را داشته باشد:

```text
pnpm dev
pnpm build
pnpm start
pnpm db:migrate
pnpm db:seed
pnpm backup:create
pnpm backup:restore
pnpm smoke
```

## 46.4 Backup واقعی MVP

دارایی داده‌ای فقط:

```text
data/app.db
data/uploads/
```

Backup خروجی:

```text
data/backups/projectos_YYYY-MM-DD_HH-mm.zip
```

برای Pilot:
- قبل از تغییر بزرگ یک Backup دستی؛
- حداقل روزی یک Backup اگر تیم داده واقعی مهم وارد می‌کند؛
- یک Copy خارج از همان Runtime اگر داده واقعاً ارزشمند شد.

روش رسمی Backup باید Write را متوقف/قفل کند یا از SQLite backup mechanism استفاده کند؛ Copy کورکورانه DB زنده کافی نیست.

## 46.5 Restore

1. App Stop.
2. از `data/` فعلی Copy ایمنی بگیر.
3. Backup انتخابی Restore شود.
4. App Start.
5. Login.
6. Project/Task/Attachment نمونه Verify شود.

## 46.6 Rollback Code

اگر فقط Code خراب شده و Schema سازگار است:

```text
Checkout previous known-good commit/tag
Build
Start with same data/
Smoke test
```

اگر Migration داده‌ای مشکل‌دار است، قبل از هر اقدام Backup بگیر و موضوع را به فرد فنی بده. `data/` پاک نشود.

## 46.7 Danger Zone

بدون Backup و فهم دقیق اثر، این کارها ممنوع:

```text
rm -rf data/
prisma migrate reset
حذف app.db
حذف uploads/
git clean با حذف فایل‌های runtime
```

Claude نیز نباید این دستورات را روی Pilot واقعی خودکار اجرا کند.

---

# 47) MVP Scope Lock و تحویل مرحله‌ای به تیم فنی

## 47.1 خطر اصلی Vibe Coding این پروژه

PRD عمداً جامع است، اما اگر به Agent گفته شود «همه‌اش را بساز»، خروجی احتمالاً شامل Featureهای نیمه‌کاره، Dependency زیاد و Bugهای سخت خواهد شد.

بنابراین **جامع بودن سند به معنی اجرای همزمان همه سند نیست**.

## 47.2 Scope Lock اولیه

تا قبل از پایان M4، Agent حق ندارد بدون تصمیم جدید این موارد را جلو بیندازد:

- Gantt پیشرفته
- Reporting سنگین
- Email automation کامل
- Object Storage
- Recurring Tasks
- Custom Role Builder
- AI Features
- پیچیده‌سازی Monitoring

### Release 0.1 — Foundation

فقط:

- M0 Repository/CI/Docker/README
- Default Admin Bootstrap from Environment
- Login
- People/Teams پایه
- Project CRUD
- Work Item CRUD
- My Work
- Project Kanban ساده
- ETA + Schedule History پایه

این نسخه باید **قابل استفاده واقعی** باشد حتی اگر Featureهای بعدی هنوز وجود ندارند.

### Release 0.2 — Execution Control

- Intake
- Priority
- Risk/Blocker
- Review/QA
- Global/Team Kanban
- Schedule Change Report ساده

### Release 0.3 — Planning Views

- Milestone
- Dependency
- Project Gantt
- Baseline vs Current
- Safe Date Change

### Release 0.4 — Management Loop

- Weekly Review
- Executive Dashboard
- Reports
- UAT/Hardening

Global Gantt را بعد از اثبات نیاز و Performance اضافه کنید؛ لازم نیست Blocker اولین Pilot باشد.

## 47.3 Human Checkpoint بعد از هر Milestone

قبل از گفتن «برو مرحله بعد»، صاحب پروژه فقط این موارد را Verify کند:

```text
[ ] App اجرا می‌شود
[ ] Login کار می‌کند
[ ] Feature جدید را خودم یک‌بار استفاده کردم
[ ] Persian/RTL قابل قبول است
[ ] Testها سبزند
[ ] GitHub Commit/Push وجود دارد؛ PR فقط اگر تیمی کار می‌کنیم
[ ] PROJECT_STATUS.md Update شده
[ ] Known Issues نوشته شده
[ ] Backup/DB risk اگر وجود دارد توضیح داده شده
```

لازم نیست صاحب پروژه Code Review حرفه‌ای انجام دهد؛ ولی باید **رفتار Feature** را ببیند و قبول کند.

## 47.4 استفاده تیم شرکت در Pilot

در فاز فعلی، «تحویل به تیم» یعنی افراد شرکت بتوانند **بدون GitHub و بدون Clone** از URL عمومی وارد شوند.

حداقل:

- Pilot URL در دسترس باشد
- Admin Login کار کند
- Admin پنج عضو فعلی را از UI بسازد
- هر کاربر Credential خودش را داشته باشد
- کاربران Project/Task/My Work/Kanban را استفاده کنند
- تغییر ETA و History قابل مشاهده باشد
- داده بین Loginها باقی بماند
- Owner بتواند بعد از Push نسخه جدید را Deploy کند
- Repo شخصی و Secretها امن باقی بمانند

تحویل فنی برای Server فقط بعد از تأیید Pilot لازم می‌شود.

## 47.5 Definition of «من می‌توانم بروم اجرا»

برای شروع Pilot واقعی، این هفت خروجی کافی‌اند:

1. Private Repository روی اکانت شخصی شما ساخته و Push شده.
2. PRD نسخه 3.4 در `docs/PRD.md` قرار گرفته.
3. `CLAUDE.md` Ruleهای Agent را دارد.
4. M0/M1 حداقل شامل Login، User/Team، Project و Task قابل اجراست.
5. Runtime آنلاین از GitHub Repo Build شده و پوشه `data/` پایدار است.
6. SQLite Migration + Admin Bootstrap کار می‌کند و داده پس از Restart باقی می‌ماند.
7. شما URL عمومی را باز می‌کنید، Login می‌کنید و می‌توانید User شرکت بسازید.

از این نقطه، بقیه قابلیت‌ها Milestone به Milestone روی همان Pilot Deploy می‌شوند.


---

# 48) چک‌لیست خیلی ساده Pilot برای صاحب پروژه

این بخش عمداً برای کسی نوشته شده که نمی‌خواهد درگیر زیرساخت شود.

## مرحله A — GitHub

- [ ] یک Repository شخصی Private بساز.
- [ ] پروژه را Push کن.
- [ ] مطمئن شو `data/`, `.env`, `*.db` و Uploadها در `.gitignore` هستند.
- [ ] `README.md` روش Run را دارد.

## مرحله B — اجرای اولیه

- [ ] `pnpm install`
- [ ] `.env.example` را به `.env` تبدیل کن.
- [ ] Admin Email/Password را تنظیم کن.
- [ ] `pnpm db:migrate`
- [ ] `pnpm db:seed`
- [ ] `pnpm dev` یا Build/Start.
- [ ] با Admin Login کن.

## مرحله C — اگر URL عمومی برای تیم می‌خواهی

- [ ] فقط یک Runtime/Hosting با **Persistent Disk** انتخاب کن.
- [ ] Repo را Build/Run کن.
- [ ] پوشه `data/` را روی Persistent Disk قرار بده.
- [ ] `.env` را روی Runtime تنظیم کن.
- [ ] URL را باز کن.
- [ ] Login کن.
- [ ] یک Test Task بساز.
- [ ] App را Restart/Redeploy کن.
- [ ] مطمئن شو Task هنوز وجود دارد.

> اگر داده بعد از Restart پاک شد، آن Runtime برای این MVP مناسب نیست تا Persistent Disk درست شود.

## مرحله D — ساخت کاربران شرکت

از داخل Admin:

- [ ] خانم ترابی
- [ ] آقای گلی
- [ ] آقای دلیری
- [ ] آقای میلاد نیکروان
- [ ] خانم مقدم

برای هر نفر:

- نام
- Email/Username
- Team
- Role
- Temporary Password

سپس فقط URL + Credential را به فرد بده.

## مرحله E — تست واقعی

- [ ] هر نفر Login کند.
- [ ] هر نفر حداقل یک Task را Update کند.
- [ ] Kanban استفاده شود.
- [ ] ETA یک Task تغییر کند و History دیده شود.
- [ ] یک Attachment تست شود.
- [ ] Logout/Login انجام شود.
- [ ] Restart انجام شود و داده باقی بماند.
- [ ] `pnpm backup:create` یک Backup بسازد.

## مرحله F — تصمیم

### اگر خوب بود

- Backup بگیر.
- Repo + `data/` قابل انتقال به Server است.
- تیم فنی تصمیم بگیرد SQLite کافی است یا PostgreSQL لازم شده.

### اگر خوب نبود

- اگر داده مهمی نیست، Runtime را پاک کن.
- Repo را نگه دار یا پاک کن.
- هیچ DB/Storage Service دیگری برای Cancel کردن وجود ندارد.

---

# تصمیم نهایی معماری نسخه 3.4

Baseline MVP از این لحظه:

```text
Frontend:       React + Vite + TypeScript
Backend:        NestJS + TypeScript
ORM/Migration:  Prisma
Database:       SQLite local file
DB Path:        data/app.db
File Storage:   data/uploads/
Backup:         data/backups/
Repository:     Personal GitHub Private Repo
Runtime:        Single app instance
Pilot URL:      Any simple runtime with persistent disk
Package Mgr:    pnpm
Container:      Single Dockerfile optional
CI:             GitHub Actions simple checks
Admin:          Local bootstrap from ADMIN_* env
Notifications:  In-app only
Email/SMTP:     None in MVP
Redis/Queue:    None
Object Storage: None
Managed DB:     None
UI:             Persian + RTL + Jalali presentation
Architecture:   Modular Monolith / Single Runtime
Future Server:  Copy repo/build + data/; migrate DB only if needed
```

اصل تصمیم:

> برای MVP همه داده‌ها و فایل‌ها روی همان ماشینی که App اجرا می‌شود نگه‌داری می‌شوند. محصول به هیچ Database-as-a-Service، Storage، SMTP، Redis یا Provider خاصی وابسته نیست. GitHub فقط محل کد است. برای استفاده تیم با URL عمومی فقط یک Runtime با دیسک پایدار لازم است. اگر Pilot موفق شد، همین پروژه و پوشه `data/` به Server منتقل می‌شوند؛ PostgreSQL فقط در صورت نیاز واقعی آینده مطرح می‌شود.
