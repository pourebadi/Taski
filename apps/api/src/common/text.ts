// نرمال‌سازی فارسی در زمان نوشتن. (D-008)

const AR_TO_FA: Record<string, string> = { 'ي': 'ی', 'ك': 'ک', 'ة': 'ه', 'أ': 'ا', 'إ': 'ا', 'ؤ': 'و' };
const DIGITS: Record<string, string> = {
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
};

/** برای ذخیره در ستون‌های *Normalized و برای نرمال کردن عبارت جست‌وجو. */
export function normalizeFa(input: string | null | undefined): string {
  if (!input) return '';
  let s = input;
  for (const [from, to] of Object.entries(AR_TO_FA)) s = s.split(from).join(to);
  for (const [from, to] of Object.entries(DIGITS)) s = s.split(from).join(to);
  return s
    .replace(/[\u200c\u200f\u200e]/g, ' ')
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
