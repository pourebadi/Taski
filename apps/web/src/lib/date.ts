import dayjs from 'dayjs';

/** نمایش همیشه شمسی. ذخیره‌سازی همیشه UTC. (CLAUDE.md قانون ۹) */
export const toJalali = (iso?: string | null, format = 'YYYY/MM/DD'): string =>
  iso ? (dayjs(iso) as any).calendar('jalali').locale('fa').format(format) : '—';

/** خروجی ورودی کاربر به ISO برای ارسال به API. */
export const toIso = (d: dayjs.Dayjs | null): string | null => (d ? d.toDate().toISOString() : null);

/** اعداد لاتین به فارسی فقط برای نمایش. */
export const faDigits = (v: string | number): string =>
  String(v).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
