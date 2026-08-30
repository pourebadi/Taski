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
