/**
 * منطق خالص تقویم کاری — بدون وابستگی به فریم‌ورک تا مستقیم قابل تست باشد.
 * روزهای کاری: شنبه تا پنجشنبه. تنها تعطیلی هفتگی: جمعه. (D-002)
 * getUTCDay: 0=یکشنبه ... 4=پنجشنبه، 5=جمعه، 6=شنبه
 */
export const FRIDAY = 5;
export const SATURDAY = 6;

export const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

export function isWorkingDay(date: Date, holidays: Set<string>): boolean {
  if (date.getUTCDay() === FRIDAY) return false;
  return !holidays.has(dayKey(date));
}

/** روزهای کاری بین دو تاریخ. علامت‌دار: منفی یعنی تاریخ جدید جلوتر آمده. */
export function countWorkingDays(from: Date, to: Date, holidays: Set<string>): number {
  if (from.getTime() === to.getTime()) return 0;
  const sign = to > from ? 1 : -1;
  const a = new Date(Math.min(from.getTime(), to.getTime()));
  const b = new Date(Math.max(from.getTime(), to.getTime()));
  const cur = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()));
  const last = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()));
  let count = 0;
  while (cur < last) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (isWorkingDay(cur, holidays)) count++;
  }
  return count * sign;
}

export function addWorkingDays(from: Date, n: number, holidays: Set<string>): Date {
  const cur = new Date(from.getTime());
  let left = n;
  while (left > 0) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (isWorkingDay(cur, holidays)) left--;
  }
  return cur;
}

/** ابتدای هفته گزارشی: شنبه. */
export function startOfReportingWeek(d: Date): Date {
  const cur = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  while (cur.getUTCDay() !== SATURDAY) cur.setUTCDate(cur.getUTCDate() - 1);
  return cur;
}
