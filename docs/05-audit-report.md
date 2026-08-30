# گزارش ممیزی — مرحله ۰ (بازخوانی کامل کد)

**مخزن:** `pourebadi/Taski` · برنچ کاری: `redesign/ux-and-design-overhaul`
**روش:** بازخوانی کامل کد بک‌اند (NestJS) و فرانت‌اند (React/AntD)، تأیید هر یافته با `file:line`. هیچ رفتار زمان‌اجرا از پنل زنده بررسی نشده (شبکه‌ی محیط بسته است) — همه‌ی یافته‌ها از کد می‌آیند و با تست/بیلد صحه‌گذاری می‌شوند.

این سند مرجع همه‌ی مرحله‌های بعدی است. هر باگ یک شناسه دارد که در commitها ارجاع داده می‌شود.

---

## خلاصه‌ی مدیریتی

سه یافته از بقیه جدا هستند چون یک **قول اصلی محصول** را نقض می‌کنند — نه اینکه فقط زشت باشند:

1. **هر کاربری می‌تواند بازبینی هر کاری را تأیید کند** (`reviewerId` صرفاً برچسب است). — `BE-1`
2. **کارِ بدون تأییدکننده در «منتظر تأیید» گیر می‌کند و در صف هیچ‌کس دیده نمی‌شود.** — `BE-2` / `FE-2`
3. **انتقال گروهی کارها، دفتر تغییرات را کامل دور می‌زند** (بدون علت، بدون تاریخچه‌ی هر آیتم، بدون تأیید). — `BE-3`

یافته‌ی ۱ و ۲ دقیقاً همان چیزی است که کاربر گفت: «نمی‌فهمم از کجا باید تأیید کنم.» پاسخ: **جایی برای تأیید ساخته نشده.**

ریشه‌ی نارضایتی از ظاهر هم مشخص شد: **سه سیستم رنگ موازی که با هم نمی‌خوانند** (`theme.ts` ≠ `styles.css` ≠ رنگ‌های هاردکد نمودار)، **نبودِ کامل دارک‌مود**، و **۵۳ کلید i18n در برابر صدها رشته‌ی فارسیِ هاردکد**.

---

## A — بک‌اند (عملکرد و درستی)

### BE-1 · بحرانی · تأیید بازبینی هیچ نگهبانی ندارد
`apps/api/src/work-items/work-items.service.ts:136-177` · `common/constants.ts:33` · `authorization/permissions.ts:13-15`
گذار `IN_REVIEW → DONE` فقط مجوز عمومی `workitem.update` می‌خواهد (که هر `CONTRIBUTOR` دارد). هیچ‌جا `actor.id === item.reviewerId` بررسی نمی‌شود. تنها شرط موجود این است که آیتم «زمانی از IN_REVIEW عبور کرده باشد» — نه اینکه چه کسی تأیید می‌کند.
**یعنی:** مجریِ کار می‌تواند کار خودش را «تأیید شده» کند. دروازه‌ی بازبینی نمایشی است.

### BE-2 · بحرانی · کارِ بدون تأییدکننده در صف هیچ‌کس نیست
`work-items.service.ts:440-447` (صف `awaitingMyReview`) · `common/validation.ts:42` (`reviewerId` اختیاری) · `schema.prisma:171`
صف «منتظر تأیید من» با `reviewerId = actor.id AND state = IN_REVIEW` ساخته می‌شود، ولی `reviewerId` هنگام ساخت اختیاری است و `requiresReview` مستقل از آن است.
**یعنی:** کاری که تأییدکننده ندارد و به «منتظر تأیید» می‌رود، در داشبورد هیچ‌کس ظاهر نمی‌شود و اگر `requiresReview` روشن باشد، هرگز به DONE نمی‌رسد مگر دستی. علت اصلی «گم شدن کارها در بازبینی».

### BE-3 · بحرانی · انتقال گروهی، دفتر تغییرات را دور می‌زند
`apps/api/src/users/users.service.ts:206-222`
`reassignAll()` با سه `updateMany` مالک/مجری/تأییدکننده‌ی همه‌ی کارهای باز را عوض می‌کند و فقط یک ردیف `AuditEvent` سطح‌سازمان می‌نویسد — **هیچ `ChangeRecord`/`Activity` برای تک‌تک کارها**، هیچ علت، هیچ تأیید. مسیر تک‌آیتمی (`work-items.service.ts:632-656`) علت اجباری و تاریخچه دارد؛ این مسیر ندارد. نقض مستقیم قانون ۲ در `CLAUDE.md`.

### BE-4 · مهم · گذارهای حالت هیچ علتی ثبت نمی‌کنند
`work-items.service.ts:182-219`
`STATE` یک `TrackedField` است ولی گذارها (مثلاً بازگشت `IN_REVIEW → IN_PROGRESS` یا reopen `DONE → IN_PROGRESS`) فقط `Activity` می‌نویسند، بدون `ChangeRecord` و بدون علت. تاریخچه‌ی حالت نازک‌تر از تاریخچه‌ی ویرایش فیلدهاست.

### BE-5 · مهم · هیچ `username` وجود ندارد (برای سوییچ لاگین)
`schema.prisma:45` (`email String @unique`) · `auth/auth.service.ts:18-19` · `validation.ts:136-139`
ستون `username` اصلاً نیست؛ `email` تنها هویت ورود است. سوییچ به نام‌کاربری نیازمند migration (افزودن `username @unique` + backfill از قسمت قبل `@`)، تغییر `LoginSchema`/`CreateUserSchema`، `AuthService.login/refresh/me` و `UsersService.create/list` است — با rollback (قانون ۸).

### BE-6 · مهم · هدف انتقال می‌تواند کاربر غیرفعال باشد
`users.service.ts:206-218` — `toUserId` فقط از نظر وجود/عضویت سازمان چک می‌شود، نه `status === 'ACTIVE'`. کار ممکن است به کاربر SUSPENDED/DISABLED منتقل و دوباره یتیم شود.

### BE-7 · متوسط · کش تعطیلات هرگز باطل نمی‌شود
`calendar/working-calendar.service.ts:8-23` — `holidayCache` سراسریِ per-process است و `invalidate()` هیچ‌جا صدا زده نمی‌شود. تغییر تعطیلات تا ری‌استارت پروسه اثر نمی‌کند.

### BE-8 · متوسط · `mustChangePassword` سمت سرور اعمال نمی‌شود
`schema.prisma:53` · `auth.service.ts:31-60` — کاربری با `mustChangePassword: true` توکن کامل می‌گیرد و API جلوی هیچ درخواستی را نمی‌گیرد؛ اعمال فقط سمت فرانت است (تنش با قانون ۱).

### BE-9 · متوسط · `changeHealth` بدون رکورد علت
`work-items.service.ts:224-251` — حتی برای `BLOCKED` فقط `Activity` می‌نویسد؛ علت مسدودی فقط در متن آزاد `healthNote` می‌ماند.

### BE-10 · جزئی · محاسبه‌ی هفته‌ی throughput حساس به DST
`analytics/analytics.service.ts:205-215` — سطل‌های ۷روزه با محاسبه‌ی wall-clock روی UTC؛ با `TZ=Asia/Tehran` ممکن است آیتم‌های نزدیک نیمه‌شب شنبه در سطل اشتباه بیفتند.

**سالم (دست نزنیم):** فیلتر استثنا `common/errors.ts:29-33` (هیچ stack trace به کلاینت نمی‌رود ✅)، تقویم کاری (`working-days.ts:11-14` جمعه‌تنها تعطیل ✅)، ماشین حالت `ALLOWED_TRANSITIONS`.

### مرجع — حالت‌ها و گذارها (`constants.ts`)
`INBOX, BACKLOG, READY, IN_PROGRESS, IN_REVIEW, IN_QA, DONE, CANCELLED`
| از | به |
|---|---|
| INBOX | BACKLOG, CANCELLED |
| BACKLOG | READY, IN_PROGRESS, CANCELLED |
| READY | IN_PROGRESS, BACKLOG, CANCELLED |
| IN_PROGRESS | IN_REVIEW, IN_QA, DONE, BACKLOG, CANCELLED |
| IN_REVIEW | IN_PROGRESS, IN_QA, DONE, CANCELLED |
| IN_QA | IN_PROGRESS, DONE, CANCELLED |
| DONE | IN_PROGRESS |
| CANCELLED | BACKLOG |

---

## B — فرانت‌اند (باگ و تجربه‌ی کاربری)

### FE-1 · بحرانی · ستون «ورودی (INBOX)» روی بورد نیست
`pages/Board.tsx:25` — `COLUMNS = ['BACKLOG','READY','IN_PROGRESS','IN_REVIEW','IN_QA','DONE']`. چون گروه‌بندی با `map.get(state)?.push()` است، هر آیتم `INBOX` بی‌صدا حذف می‌شود و هیچ‌جا رندر نمی‌شود.

### FE-2 · بحرانی · «تأیید» جایی در UI ندارد
هیچ دکمه‌ی «تأیید» یا «برگشت با توضیح» روی کارهای `IN_REVIEW` نیست و هیچ صندوق «منتظر تأیید من» به کاربر نشان داده نمی‌شود (با `BE-1`/`BE-2` هم‌ریشه).

### FE-3 · مهم · تغییر «مالک (Owner)» از UI ممکن نیست
`components/WorkItemDrawer.tsx:259-261` — نوار عمل فقط اولویت/واگذاری/مهلت دارد. `TrackedChangeModal` از `kind='OWNER'` پشتیبانی می‌کند ولی `setTracked('OWNER')` هیچ‌جا صدا زده نمی‌شود.

### FE-4 · مهم · فیلد «کدام کار عقب می‌افتد؟» مرده است
`components/TrackedChangeModal.tsx:140` فقط با `siblings.length > 0` رندر می‌شود، ولی `WorkItemDrawer` هرگز `siblings` را پاس نمی‌دهد → همیشه خالی.

### FE-5 · مهم · اعداد نمودارها لاتین‌اند و برچسب‌ها بیرون می‌زنند
`pages/Insights.tsx` — محورها/تولتیپ‌های recharts عدد خام لاتین می‌دهند؛ `XAxis` تروپوت رشته‌ی ISO خام چاپ می‌کند؛ pie با `outerRadius={90}` داخل `height={260}` و **بدون `margin`** → برچسب فارسی بریده می‌شود. هیچ نموداری `margin` ندارد.

### FE-6 · مهم · وضعیت تب‌ها روی رشته‌ی فارسی کلید خورده
`Insights.tsx:55` `useState('سازمان')` و شاخه‌زدن روی `tab === 'سازمان'`. هر تغییر کپی صفحه را می‌شکند. ضمناً تب‌ها یک `Segmented` کوچک در سربرگ‌اند و به‌عنوان ناوبری اصلی دیده نمی‌شوند.

### FE-7 · مهم · تخمین زمانی از تاریخ تحویل جداست
`components/CommitmentModal.tsx:113-115` — `newEstimateHours` (InputNumber خام) و `newEta` (تاریخ) دو فیلد مستقل‌اند؛ هیچ تبدیل ساعت/روز→تاریخ با تقویم کاری وجود ندارد. کاربر باید خودش «۱۶ ساعت» را به تاریخ ترجمه کند.

### FE-8 · متوسط · مودال «کار جدید» دیوار ۱۳فیلدیِ تک‌ستون است
`components/CreateWorkItemModal.tsx:66-110` — `layout="vertical"`, `width=620`, ۱۳ فیلد پشت‌سرهم. اولویت به‌صورت خام `P0..P3` (بدون معنا) در dropdown (`:87`)، همان الگو در `Board.tsx:162`, `WorkList.tsx:112`, `TrackedChangeModal.tsx:106`.

### FE-9 · متوسط · ظرفیت هفتگی هیچ‌جا قابل ویرایش نیست
`pages/Admin.tsx:326-355` فرم کاربر جدید فقط fullName/email/jobTitle/role/team دارد؛ `weeklyCapacityHours` که جدول بار کاری را می‌سازد، از UI ست نمی‌شود و فرم ویرایش کاربر هم اصلاً نیست.

### FE-10 · متوسط · چهار نسخه‌ی `WorkItemDrawer` هم‌زمان mount است
`AppShell.tsx:214` + `Board.tsx:207` + `MyWork.tsx:125` + `WorkList.tsx:218` — دو مکانیزم رقیب برای «کار باز شده»؛ لینک اشتراکی `?item=` در بورد و کارهای‌من کار نمی‌کند.

### FE-11 · متوسط · رویداد `taski:refresh` شنونده ندارد
`AppShell.tsx:218` dispatch می‌شود ولی هیچ `addEventListener('taski:refresh')` وجود ندارد → تغییرهای دراور سراسری صفحه را تازه نمی‌کنند.

### FE-12 · جزئی · باگ‌های استایلی و مرده
- `WorkItemDrawer.tsx:348` — `'1px solid var(--warn)33'` رنگ نامعتبر (نمی‌توان alpha را به `var()` چسباند) → مرز رندر نمی‌شود.
- رنگ آیکون راهنما هاردکد `#8c8c8c` در `FieldLabel.tsx:17` و `Insights.tsx:46`.
- importهای بلااستفاده: `useSearchParams` در `MyWork.tsx:2` و `WorkList.tsx:2`، `HealthBadge` در `WorkItemDrawer.tsx:26`.
- `.env.example` که README به آن ارجاع می‌دهد وجود ندارد.

---

## C — دیزاین‌سیستم (ریشه‌ی «زشتی»)

### C1 · سه سیستم رنگِ ناسازگار
| مفهوم | `theme.ts` (AntD) | `styles.css` (`:root`) | نمودار (هاردکد) |
|---|---|---|---|
| برند | `#14675a` | `#0f5a4e` | `#14675a` |
| ok | `#17795e` | `#0f6b52` | `#17795e` |
| warn | `#a35a06` | `#8a4a00` | `#a35a06` |
| danger | `#b42318` | `#a11d13` | `#b42318` |
| line | `#e3e8e6` | `#76867f` | — |
| canvas | `#f6f8f7` | `#e9edec` | — |
کامنت `theme.ts:3-7` خودش می‌گوید باید یکی بمانند — نمانده‌اند. دکمه‌ی antd یک سبز، کارت یک سبز دیگر، اسلایس نمودار یک سبز سوم.

### C2 · دارک‌مود کاملاً وجود ندارد
`styles.css:28` هاردکد `color-scheme: light`؛ هیچ `[data-theme="dark"]`/`@media (prefers-color-scheme)`؛ `main.tsx:16` فقط الگوریتم روشن. زمین صفر.

### C3 · i18n عملاً رها شده
`fa.json` فقط ۵۳ کلید دارد؛ اکثر متن‌های فارسی در ۲۰+ فایل هاردکد شده‌اند (نقض قانون ۴). برچسب‌های نقش دوبار تعریف شده (`AppShell.tsx` و `Admin.tsx`). بدون منبع واحد، یکدست‌کردن لحن و واژگان ناممکن است.

### C4 · Tailwind ادعا شده ولی وصل نشده
نه `tailwind.config`، نه `postcss.config`، نه دایرکتیو `@tailwind`. در `CLAUDE.md` هست ولی در کد نیست.

---

## نگاشت یافته‌ها به مرحله‌ها

| مرحله | یافته‌ها |
|---|---|
| ۱ · بنیان دیزاین + دارک‌مود | C1, C2, C4, FE-12 |
| ۲ · زبان و مفاهیم (i18n) | C3, FE-8(اولویت), FE-6 |
| ۳ · بازطراحی کامپوننت‌های پایه | همه‌ی استایل‌ها/حالت‌های hover/active/disabled |
| ۴ · فرم «کار جدید» | FE-8 |
| ۵ · تخمین زمانی | FE-7, FE-9 |
| ۶ · بورد | FE-1 |
| ۷ · بازبینی و تأیید | BE-1, BE-2, BE-4, FE-2 |
| ۸ · واگذاری و افراد | BE-3, BE-6, FE-3, FE-4, FE-9, FE-10, FE-11 |
| ۹ · نمودارها و تب‌ها | FE-5, FE-6 |
| ۱۰ · نام‌کاربری + پایان | BE-5, BE-8, FE-12(پاک‌سازی), `.env.example`, PR |
