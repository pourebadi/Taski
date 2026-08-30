import fa from '../locales/fa.json';

/**
 * متن‌های «کروم» رابط (ناوبری، دکمه‌ها، عنوان صفحه، متن ثابت) از fa.json.
 * واژگانِ دامنه (مرحله، اولویت، سلامت، نقش، ...) در lib/terms.ts است.
 * هیچ متن فارسی هاردکد در کامپوننت. (CLAUDE.md قانون ۴)
 */
export const t = (key: keyof typeof fa | string): string => (fa as Record<string, string>)[key] ?? key;

/** t با جای‌گذاری متغیر: tf('x.y', { n: ۳ }) → متن با {n} جایگزین‌شده. */
export const tf = (key: string, vars: Record<string, string | number>): string =>
  Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), t(key));
