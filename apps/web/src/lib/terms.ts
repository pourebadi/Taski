/**
 * تک منبع حقیقتِ «واژگان دامنه».
 *
 * هر برچسبی که به یک مقدار enum بک‌اند وصل است (مرحله، اولویت، سلامت،
 * جریان، نوع کار، علت، اطمینان، نقش) فقط اینجا تعریف می‌شود — نه پخش در
 * ۲۰ کامپوننت. پیش‌تر مثلاً «P0» خام در چهار Select تکرار شده بود و برچسب
 * نقش‌ها در دو فایل جدا. حالا:
 *   • برچسب فارسی (fa) برای بج‌های فشرده.
 *   • برچسب دوزبانه dual(fa, en) برای Select و سربرگ‌ها — چون تیم گاهی با
 *     انگلیسیِ ابزار آشناتر است.
 *   • tone برای رنگ (رنگ هرگز تنها حاملِ معنا نیست).
 *   • hint یک‌جمله‌ای که مفهوم را باز می‌کند.
 */

export type Tone = 'ok' | 'warn' | 'danger' | 'unknown' | 'brand';

export interface Term {
  value: string;
  fa: string;
  en: string;
  tone: Tone;
  hint?: string;
}

/** «فارسی (English)» — انگلیسی داخل پرانتز. */
export const dual = (fa: string, en: string) => `${fa} (${en})`;

// ── مرحله‌های کار ─────────────────────────────────────────────────
export const STATES: Term[] = [
  { value: 'INBOX', fa: 'ورودی', en: 'Inbox', tone: 'unknown', hint: 'تازه رسیده و هنوز تریاژ نشده. اینجا تصمیم می‌گیریم انجام می‌شود یا نه.' },
  { value: 'BACKLOG', fa: 'بک‌لاگ', en: 'Backlog', tone: 'unknown', hint: 'قرار است انجام شود ولی هنوز نوبتش نرسیده.' },
  { value: 'READY', fa: 'آماده شروع', en: 'Ready', tone: 'brand', hint: 'همه‌چیزش روشن است؛ هر لحظه می‌شود شروعش کرد.' },
  { value: 'IN_PROGRESS', fa: 'در حال انجام', en: 'In Progress', tone: 'brand', hint: 'کسی همین حالا رویش کار می‌کند.' },
  { value: 'IN_REVIEW', fa: 'منتظر تأیید', en: 'Review', tone: 'warn', hint: 'کار تمام شده و منتظر تأییدِ تأییدکننده است.' },
  { value: 'IN_QA', fa: 'در حال تست', en: 'QA', tone: 'warn', hint: 'در مرحله‌ی آزمون کیفیت است.' },
  { value: 'DONE', fa: 'انجام شد', en: 'Done', tone: 'ok', hint: 'تمام و تأیید شد.' },
  { value: 'CANCELLED', fa: 'لغو شد', en: 'Cancelled', tone: 'unknown', hint: 'متوقف و بسته شد؛ دیگر دنبال نمی‌شود.' },
];

// ── اولویت ── مهم‌ترین تغییر: کد هرگز تنها نمی‌آید، همیشه با معنایش ──
export const PRIORITIES: Term[] = [
  { value: 'P0', fa: 'فوری', en: 'P0', tone: 'danger', hint: 'همین حالا. بقیه کارها کنار می‌روند تا این تمام شود.' },
  { value: 'P1', fa: 'مهم', en: 'P1', tone: 'warn', hint: 'این هفته باید انجام شود.' },
  { value: 'P2', fa: 'عادی', en: 'P2', tone: 'brand', hint: 'این ماه. مسیر عادی کارها.' },
  { value: 'P3', fa: 'کم', en: 'P3', tone: 'unknown', hint: 'هر وقت فرصت شد؛ عجله‌ای نیست.' },
];

// ── سلامت تحویل ──────────────────────────────────────────────────
export const HEALTHS: Term[] = [
  { value: 'ON_TRACK', fa: 'طبق برنامه', en: 'On Track', tone: 'ok' },
  { value: 'AT_RISK', fa: 'در خطر تأخیر', en: 'At Risk', tone: 'warn' },
  { value: 'BLOCKED', fa: 'متوقف', en: 'Blocked', tone: 'danger' },
  { value: 'UNKNOWN', fa: 'بی‌خبر', en: 'Unknown', tone: 'unknown' },
];

// ── جریان کار ────────────────────────────────────────────────────
export const STREAMS: Term[] = [
  { value: 'PRODUCT', fa: 'محصول', en: 'Product', tone: 'brand' },
  { value: 'TECH_DEBT', fa: 'بدهی فنی', en: 'Tech Debt', tone: 'warn' },
  { value: 'SUPPORT', fa: 'پشتیبانی', en: 'Support', tone: 'unknown' },
  { value: 'INFRASTRUCTURE', fa: 'زیرساخت', en: 'Infrastructure', tone: 'unknown' },
];

// ── نوع کار ──────────────────────────────────────────────────────
export const WORK_TYPES: Term[] = [
  { value: 'FEATURE', fa: 'قابلیت', en: 'Feature', tone: 'brand' },
  { value: 'BUG', fa: 'باگ', en: 'Bug', tone: 'danger' },
  { value: 'TASK', fa: 'کار', en: 'Task', tone: 'unknown' },
  { value: 'SUPPORT', fa: 'پشتیبانی', en: 'Support', tone: 'unknown' },
  { value: 'TECH_DEBT', fa: 'بدهی فنی', en: 'Tech Debt', tone: 'warn' },
  { value: 'INFRA', fa: 'زیرساخت', en: 'Infra', tone: 'unknown' },
];

// ── علت تغییر تاریخ ── جمله‌ی کامل، تا زیر سؤال «چرا؟» معنا بدهد ──
export const REASONS: Term[] = [
  { value: 'SCOPE_CHANGE', fa: 'دامنه کار عوض شد', en: 'Scope changed', tone: 'unknown' },
  { value: 'BLOCKER', fa: 'به مانع خوردیم', en: 'Blocker', tone: 'danger' },
  { value: 'DEPENDENCY', fa: 'منتظر کار دیگری بودیم', en: 'Dependency', tone: 'warn' },
  { value: 'PRIORITY_CHANGE', fa: 'اولویت‌ها عوض شد', en: 'Priority change', tone: 'warn' },
  { value: 'SUPPORT_INTERRUPT', fa: 'کار پشتیبانی وقفه انداخت', en: 'Support interrupt', tone: 'warn' },
  { value: 'RE_ESTIMATION', fa: 'تخمین اولمان درست نبود', en: 'Re-estimation', tone: 'unknown' },
  { value: 'EXTERNAL', fa: 'عاملی بیرون از تیم', en: 'External', tone: 'unknown' },
];

// ── سطح اطمینان تخمین ── اول‌شخص، تا گفتنِ «حدس است» کم‌هزینه شود ──
export const CONFIDENCES: Term[] = [
  { value: 'HIGH', fa: 'مطمئنم', en: 'High', tone: 'ok' },
  { value: 'MEDIUM', fa: 'تقریباً مطمئنم', en: 'Medium', tone: 'warn' },
  { value: 'LOW', fa: 'بیشتر حدس است', en: 'Low', tone: 'unknown' },
];

// ── نقش نرم‌افزاری ────────────────────────────────────────────────
export const ROLES: Term[] = [
  { value: 'ORG_OWNER', fa: 'مالک سازمان', en: 'Org Owner', tone: 'brand' },
  { value: 'ADMIN', fa: 'مدیر سیستم', en: 'Admin', tone: 'brand' },
  { value: 'PROJECT_MANAGER', fa: 'مدیر پروژه', en: 'Project Manager', tone: 'brand' },
  { value: 'TEAM_LEAD', fa: 'سرپرست تیم', en: 'Team Lead', tone: 'unknown' },
  { value: 'CONTRIBUTOR', fa: 'عضو اجرایی', en: 'Contributor', tone: 'unknown' },
  { value: 'REQUESTER', fa: 'درخواست‌دهنده', en: 'Requester', tone: 'unknown' },
  { value: 'VIEWER', fa: 'مشاهده‌گر', en: 'Viewer', tone: 'unknown' },
];

/**
 * سه نقشِ روی یک کار. اینها قبلاً هیچ‌جا کنار هم توضیح داده نشده بودند و
 * همین باعث گیج شدن «واگذاری» می‌شد. حالا یک تعریفِ واحد دارند.
 */
export const PEOPLE_ROLES = {
  owner: { fa: 'مسئول', en: 'Owner', hint: 'پاسخگوی نتیجه. اگر کار عقب بیفتد، در جلسه سراغ او می‌روند. لازم نیست خودش انجامش دهد.' },
  assignee: { fa: 'مجری', en: 'Assignee', hint: 'کسی که واقعاً دستش روی کار است و امروز رویش وقت می‌گذارد.' },
  reviewer: { fa: 'تأییدکننده', en: 'Reviewer', hint: 'کسی که پیش از بسته‌شدن کار، تأییدش می‌کند.' },
} as const;

// ── ابزارهای عمومی ────────────────────────────────────────────────
function indexOf(list: Term[]): Record<string, Term> {
  return Object.fromEntries(list.map((t) => [t.value, t]));
}

const INDEX = {
  state: indexOf(STATES),
  priority: indexOf(PRIORITIES),
  health: indexOf(HEALTHS),
  stream: indexOf(STREAMS),
  workType: indexOf(WORK_TYPES),
  reason: indexOf(REASONS),
  confidence: indexOf(CONFIDENCES),
  role: indexOf(ROLES),
};

type Domain = keyof typeof INDEX;

/** برچسب فشرده‌ی فارسی — برای بج و جای تنگ. */
export function label(domain: Domain, value: string): string {
  return INDEX[domain][value]?.fa ?? value;
}
/** برچسب دوزبانه — برای Select و سربرگ. */
export function labelDual(domain: Domain, value: string): string {
  const t = INDEX[domain][value];
  return t ? dual(t.fa, t.en) : value;
}
export function tone(domain: Domain, value: string): Tone {
  return INDEX[domain][value]?.tone ?? 'unknown';
}
export function hint(domain: Domain, value: string): string | undefined {
  return INDEX[domain][value]?.hint;
}

/** گزینه‌های آماده‌ی AntD Select. dual=true برای سربرگ‌دار، dual=false برای فشرده. */
export function options(domain: Domain, opts: { dual?: boolean } = {}): { value: string; label: string }[] {
  const useDual = opts.dual ?? true;
  return INDEX[domain] && Object.values(INDEX[domain]).map((t) => ({
    value: t.value,
    label: useDual ? dual(t.fa, t.en) : t.fa,
  }));
}

/** برچسب اولویت به‌صورت «فوری · P0» برای Select. */
export function priorityOption(value: string): string {
  const t = INDEX.priority[value];
  return t ? `${t.fa} · ${t.value}` : value;
}
export const priorityOptions = () => PRIORITIES.map((p) => ({ value: p.value, label: `${p.fa} · ${p.value}` }));

/** رنگ CSS اولویت. */
export const priorityColor = (value: string) => `var(--${(value || 'p3').toLowerCase()})`;
