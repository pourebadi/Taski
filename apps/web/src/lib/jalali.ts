/**
 * تبدیل تقویم شمسی و میلادی — بدون هیچ وابستگی.
 *
 * چرا دست‌ساز: تنها کتابخانه‌ی تقویمی پروژه (antd-jalali-plus) نسخه‌ی
 * خودش از rc-picker را همراه دارد که `dayjs/plugin/calendar` رسمی را
 * ثبت می‌کند و jalaliday را از کار می‌اندازد — همان چیزی که صفحه‌ی
 * «پروژه‌ها» را سفید می‌کرد. ضمناً فایل CSS آن کتابخانه هیچ‌جا import
 * نشده بود، برای همین تقویم بی‌استایل و بدون فونت وزیرمتن رندر می‌شد.
 *
 * مبنای محاسبه عمداً Intl است، نه یک الگوریتم دست‌نویس: تقویم فارسی
 * به‌صورت بومی در همه‌ی مرورگرهای امروزی هست، درست است، و نگهداری‌اش
 * با ما نیست. تبدیل معکوس با جست‌وجوی دودویی روی همان مبنا انجام
 * می‌شود تا دو جهت هرگز از هم واگرا نشوند.
 */

export type Jalali = { jy: number; jm: number; jd: number };

const fmt = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

/** اجزای محلی یک تاریخ را بدون لغزش منطقه‌ی زمانی به UTC می‌برد. */
const asUtc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

function partsOfUtc(ms: number): Jalali {
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(new Date(ms))) {
    if (part.type !== 'literal') p[part.type] = part.value;
  }
  return { jy: Number(p.year), jm: Number(p.month), jd: Number(p.day) };
}

/** میلادی → شمسی */
export function toJalaliParts(date: Date): Jalali {
  return partsOfUtc(asUtc(date));
}

const rank = (j: Jalali) => j.jy * 10000 + j.jm * 100 + j.jd;
const DAY = 86_400_000;

/**
 * شمسی → میلادی.
 * جست‌وجوی دودویی روی همان تبدیلِ Intl، پس دو جهت همیشه سازگارند.
 */
export function fromJalali(jy: number, jm: number, jd: number): Date {
  const target = jy * 10000 + jm * 100 + jd;
  // سال شمسی همیشه در بازه‌ی [jy+621, jy+622] میلادی می‌افتد
  let lo = Date.UTC(jy + 620, 0, 1);
  let hi = Date.UTC(jy + 622, 11, 31);

  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / DAY / 2) * DAY;
    if (rank(partsOfUtc(mid)) < target) lo = mid + DAY;
    else hi = mid;
  }
  const d = new Date(lo);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** تعداد روزهای یک ماه شمسی. */
export function jalaliMonthLength(jy: number, jm: number): number {
  const first = fromJalali(jy, jm, 1);
  const nextY = jm === 12 ? jy + 1 : jy;
  const nextM = jm === 12 ? 1 : jm + 1;
  const nextFirst = fromJalali(nextY, nextM, 1);
  return Math.round((asUtc(nextFirst) - asUtc(first)) / DAY);
}

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** شنبه اول هفته است. */
export const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/** ستون هفته برای یک تاریخ؛ شنبه = ۰. */
export const weekColumn = (d: Date) => (d.getDay() + 1) % 7;

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const addMonths = (jy: number, jm: number, delta: number) => {
  const total = jy * 12 + (jm - 1) + delta;
  return { jy: Math.floor(total / 12), jm: (total % 12) + 1 };
};
