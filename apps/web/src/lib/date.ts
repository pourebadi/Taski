import dayjs from 'dayjs';

/**
 * تبدیل تاریخ به شمسی.
 *
 * پیش‌تر اینجا از `dayjs(iso).calendar('jalali').locale('fa')` استفاده می‌شد
 * و این یک بمب ساعتی بود: کتابخانه‌ی antd-jalali-plus نسخه‌ی خودش از
 * rc-picker را دارد که `dayjs/plugin/calendar` رسمی را ثبت می‌کند. آن پلاگین
 * یک ابزار *نمایشی* است و `.calendar()` در آن به‌جای یک شیء dayjs، یک رشته
 * برمی‌گرداند. هر کدام دیرتر ثبت شود برنده است، و ترتیبش به ترتیب بارگذاری
 * chunkها بستگی دارد — یعنی در یک صفحه کار می‌کرد و در صفحه‌ای دیگر با
 * «TypeError: .locale is not a function» کل صفحه را سفید می‌کرد.
 *
 * حالا اصلاً به dayjs و پلاگین‌هایش تکیه نمی‌کنیم. Intl تقویم فارسی را
 * به‌صورت بومی دارد، در همه‌ی مرورگرهای امروزی هست، و هیچ‌کس نمی‌تواند
 * رفتارش را از زیر پای ما عوض کند.
 */

const dateFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Tehran',
});

const dateTimeFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Tehran',
});

function parts(d: Date, withTime: boolean) {
  const out: Record<string, string> = {};
  for (const p of (withTime ? dateTimeFmt : dateFmt).formatToParts(d)) {
    if (p.type !== 'literal') out[p.type] = p.value;
  }
  return out;
}

/** نمایش همیشه شمسی. ذخیره‌سازی همیشه UTC. (CLAUDE.md قانون ۹) */
export const toJalali = (iso?: string | null, format = 'YYYY/MM/DD'): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  // تاریخ نامعتبر نباید صفحه را بشکند؛ فقط خط تیره نشان می‌دهیم.
  if (Number.isNaN(d.getTime())) return '—';

  const withTime = format.includes('HH') || format.includes('mm');
  const p = parts(d, withTime);
  const y = (p.year ?? '').padStart(4, '0');
  const base = `${y}/${p.month ?? '--'}/${p.day ?? '--'}`;
  return withTime ? `${base} ${p.hour ?? '00'}:${p.minute ?? '00'}` : base;
};

/** خروجی ورودی کاربر به ISO برای ارسال به API. */
export const toIso = (d: dayjs.Dayjs | null): string | null => (d ? d.toDate().toISOString() : null);

/** اعداد لاتین به فارسی فقط برای نمایش. */
export const faDigits = (v: string | number): string =>
  String(v).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

/** نمایش دوستانه با نام روز و ماه: «پنجشنبه ۱۲ شهریور ۱۴۰۵». */
const longFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Tehran',
});
export const toJalaliLong = (input?: Date | string | null): string => {
  if (!input) return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  // ترتیب را دستی می‌چینیم تا مستقل از ICU همیشه «روز‌هفته ۱۲ ماه ۱۴۰۵» باشد.
  const p: Record<string, string> = {};
  for (const part of longFmt.formatToParts(d)) if (part.type !== 'literal') p[part.type] = part.value;
  return faDigits(`${p.weekday ?? ''} ${p.day ?? ''} ${p.month ?? ''} ${p.year ?? ''}`.trim());
};

/**
 * تقویم کاری در سمت کلاینت — فقط برای پیش‌نمایش زنده‌ی «تخمین → تاریخ تحویل».
 * روز کاری = شنبه تا پنجشنبه (فقط جمعه تعطیل)، هم‌راستا با قانون ۹c و
 * ماژول working-days بک‌اند. تعطیلات رسمی اینجا لحاظ نمی‌شوند (سرور مرجع است).
 */
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Tehran' });
const isFriday = (d: Date) => weekdayFmt.format(d) === 'Fri';

/** ساعت به روز کاری (پیش‌فرض ۸ ساعت در روز). */
export const hoursToWorkingDays = (hours: number, hoursPerDay = 8): number =>
  hoursPerDay > 0 ? hours / hoursPerDay : 0;

/**
 * تاریخ تحویل تخمینی: n‌اُمین روز کاری از «شروع» (شروع، روز اول حساب می‌شود).
 * مثلاً ۱ روز کاری از امروز = همین امروز (اگر کاری باشد، وگرنه شنبه بعد).
 */
export const workingDeliveryDate = (start: Date, workingDays: number): Date => {
  const whole = Math.max(1, Math.ceil(workingDays));
  const d = new Date(start);
  while (isFriday(d)) d.setUTCDate(d.getUTCDate() + 1); // اگر شروع جمعه بود، بعدی
  let counted = 1; // روز شروع، روز اول
  while (counted < whole) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isFriday(d)) counted++;
  }
  return d;
};
