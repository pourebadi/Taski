import { labelDual } from './terms';

/**
 * چیدمان بورد در «سطح نمایش». states و ماشین حالت هرگز عوض نمی‌شوند؛ فقط اینکه
 * کدام ستون‌ها، به چه ترتیبی و با چه نامی نشان داده شوند. مدیر می‌تواند یک مدل
 * استاندارد را انتخاب کند یا دستی تنظیم کند — بدون خطر شکستن موتور.
 */

export type BoardColumn = { state: string; label: string | null; visible: boolean };

// ترتیبِ جریانِ پیش‌فرض (CANCELLED عمداً ستون نیست).
export const FLOW_STATES = ['INBOX', 'BACKLOG', 'READY', 'IN_PROGRESS', 'IN_REVIEW', 'IN_QA', 'DONE'] as const;

export const defaultColumns = (): BoardColumn[] =>
  FLOW_STATES.map((state) => ({ state, label: null, visible: true }));

/** مدل‌های استاندارد که مدیر می‌تواند یک‌کلیک انتخاب کند. */
export type Preset = {
  key: string;
  name: string;
  hint: string;
  /** مرحله‌های نمایان و ترتیبشان؛ بقیه مخفی می‌شوند. */
  visible: string[];
  /** بازنویسی نام برخی ستون‌ها (مثلاً برای اسکرام). */
  labels?: Record<string, string>;
};

export const PRESETS: Preset[] = [
  {
    key: 'full',
    name: 'کامل (Full)',
    hint: 'همه‌ی مرحله‌ها — دقیق‌ترین، ولی پرستون. برای تیمی که همه‌ی مراحل را جدی دنبال می‌کند.',
    visible: ['INBOX', 'BACKLOG', 'READY', 'IN_PROGRESS', 'IN_REVIEW', 'IN_QA', 'DONE'],
  },
  {
    key: 'kanban',
    name: 'کانبان ساده (Simple Kanban)',
    hint: 'استاندارد و متعادل. بدون «ورودی» و «تست». برای بیشتر تیم‌ها بهترین شروع.',
    visible: ['BACKLOG', 'READY', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
  },
  {
    key: 'minimal',
    name: 'حداقلی (Minimal)',
    hint: 'سه ستون. برای تیم کوچک یا وقتی نمی‌خواهید کسی درگیر جابه‌جایی زیاد شود.',
    visible: ['BACKLOG', 'IN_PROGRESS', 'DONE'],
  },
  {
    key: 'scrum',
    name: 'اسکرام (Scrum)',
    hint: 'بک‌لاگ → انجام‌دادنی → در حال انجام → بازبینی → انجام شد. با واژگان اسکرام.',
    visible: ['BACKLOG', 'READY', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
    labels: { BACKLOG: 'بک‌لاگ اسپرینت', READY: 'انجام‌دادنی (To Do)', IN_REVIEW: 'بازبینی (Review)' },
  },
];

/** یک preset را به آرایه‌ی کاملِ ستون‌ها تبدیل می‌کند (نمایان‌ها اول، بقیه مخفی). */
export function columnsFromPreset(p: Preset): BoardColumn[] {
  const visible = p.visible.map((state) => ({ state, label: p.labels?.[state] ?? null, visible: true }));
  const rest = FLOW_STATES.filter((s) => !p.visible.includes(s)).map((state) => ({ state, label: null, visible: false }));
  return [...visible, ...rest];
}

/**
 * چیدمانِ مؤثر: از config می‌آید، ولی همیشه همه‌ی stateها را پوشش می‌دهد (اگر
 * stateی جدید اضافه شد، به‌صورت مخفی ته لیست می‌آید تا گم نشود).
 */
export function effectiveColumns(columns: BoardColumn[] | null | undefined): BoardColumn[] {
  if (!columns || columns.length === 0) return defaultColumns();
  const known = new Set(columns.map((c) => c.state));
  const extra = FLOW_STATES.filter((s) => !known.has(s)).map((state) => ({ state, label: null, visible: false }));
  // فقط stateهای معتبر
  const valid = columns.filter((c) => (FLOW_STATES as readonly string[]).includes(c.state));
  return [...valid, ...extra];
}

/** نامِ نمایشیِ یک ستون: override یا پیش‌فرضِ دوزبانه. */
export const columnLabel = (col: BoardColumn): string => col.label ?? labelDual('state', col.state);
