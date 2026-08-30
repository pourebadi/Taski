import { t } from '../lib/i18n';

/**
 * واژگان بصری مشترک.
 * قاعده: رنگ هرگز تنها حامل معنا نیست — هر نشان متن هم دارد،
 * تا برای کاربر کم‌بینا یا در چاپ سیاه‌وسفید هم خوانا بماند.
 */

type Tone = 'ok' | 'warn' | 'danger' | 'unknown' | 'brand';

const TONE_VARS: Record<Tone, { fg: string; bg: string }> = {
  ok: { fg: 'var(--ok)', bg: 'var(--ok-soft)' },
  warn: { fg: 'var(--warn)', bg: 'var(--warn-soft)' },
  danger: { fg: 'var(--danger)', bg: 'var(--danger-soft)' },
  unknown: { fg: 'var(--unknown)', bg: 'var(--unknown-soft)' },
  brand: { fg: 'var(--brand)', bg: 'var(--brand-soft)' },
};

export function Pill({
  tone = 'unknown',
  children,
  title,
}: {
  tone?: Tone;
  children: React.ReactNode;
  title?: string;
}) {
  const c = TONE_VARS[tone];
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.6,
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.fg}22`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

const HEALTH_TONE: Record<string, Tone> = {
  ON_TRACK: 'ok',
  AT_RISK: 'warn',
  BLOCKED: 'danger',
  UNKNOWN: 'unknown',
};

/** نقطه‌ی رنگی + متن. متن همیشه هست، پس رنگ فقط تقویت‌کننده است. */
export function HealthBadge({ health }: { health: string }) {
  const tone = HEALTH_TONE[health] ?? 'unknown';
  return (
    <Pill tone={tone}>
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: TONE_VARS[tone].fg,
          flex: 'none',
        }}
      />
      {t(`health.${health}`)}
    </Pill>
  );
}

const PRIORITY_COLOR: Record<string, string> = {
  P0: 'var(--p0)',
  P1: 'var(--p1)',
  P2: 'var(--p2)',
  P3: 'var(--p3)',
};

const PRIORITY_LABEL: Record<string, string> = {
  P0: 'فوری',
  P1: 'بالا',
  P2: 'عادی',
  P3: 'پایین',
};

export const priorityColor = (p: string) => PRIORITY_COLOR[p] ?? 'var(--p3)';

/** خود «P0» برای صفحه‌خوان بی‌معناست، پس معنای فارسی هم اعلام می‌شود. */
export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--mono)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.03em',
        color: priorityColor(priority),
        background: `color-mix(in srgb, ${priorityColor(priority)} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${priorityColor(priority)} 25%, transparent)`,
        borderRadius: 5,
        padding: '1px 6px',
        direction: 'ltr',
      }}
    >
      {priority}
      <span className="sr-only">— اولویت {PRIORITY_LABEL[priority] ?? priority}</span>
    </span>
  );
}

const STATE_TONE: Record<string, Tone> = {
  INBOX: 'unknown',
  BACKLOG: 'unknown',
  READY: 'brand',
  IN_PROGRESS: 'brand',
  IN_REVIEW: 'warn',
  IN_QA: 'warn',
  DONE: 'ok',
  CANCELLED: 'unknown',
};

export function StateBadge({ state }: { state: string }) {
  return <Pill tone={STATE_TONE[state] ?? 'unknown'}>{t(`state.${state}`)}</Pill>;
}

/** کلید کار — همیشه LTR و با ارقام هم‌عرض تا در متن فارسی نشکند. */
export function WorkKey({ value }: { value: string }) {
  return (
    <span className="key-tag">
      <span className="sr-only">شناسه کار </span>
      {value}
    </span>
  );
}
