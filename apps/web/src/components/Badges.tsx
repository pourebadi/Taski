import { label, tone as termTone, priorityColor, type Tone } from '../lib/terms';

/**
 * واژگان بصری مشترک.
 * قاعده: رنگ هرگز تنها حامل معنا نیست — هر نشان متن هم دارد،
 * تا برای کاربر کم‌بینا یا در چاپ سیاه‌وسفید هم خوانا بماند.
 * منبع برچسب و رنگ‌ها: lib/terms.ts.
 */

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
        border: `1px solid color-mix(in srgb, ${c.fg} 20%, transparent)`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** نقطه‌ی رنگی + متن. متن همیشه هست، پس رنگ فقط تقویت‌کننده است. */
export function HealthBadge({ health }: { health: string }) {
  const tone = termTone('health', health);
  return (
    <Pill tone={tone} title={label('health', health)}>
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
      {label('health', health)}
    </Pill>
  );
}

export { priorityColor };

/**
 * اولویت — دیگر «P0» خشک نیست. معنای فارسی جلو می‌آید و کد در کنارش
 * (mono، LTR) تا کسی که با P0 آشناست هم جا نماند.
 */
export function PriorityBadge({ priority }: { priority: string }) {
  const color = priorityColor(priority);
  const fa = label('priority', priority);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11.5,
        fontWeight: 600,
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        borderRadius: 6,
        padding: '1px 7px',
      }}
    >
      {fa}
      <span
        aria-hidden="true"
        style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', direction: 'ltr', opacity: 0.85 }}
      >
        {priority}
      </span>
      <span className="sr-only">— اولویت {fa}</span>
    </span>
  );
}

export function StateBadge({ state }: { state: string }) {
  return (
    <Pill tone={termTone('state', state)} title={label('state', state)}>
      {label('state', state)}
    </Pill>
  );
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
