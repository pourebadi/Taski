import { Tooltip } from 'antd';
import { toJalali, faDigits } from '../lib/date';

/**
 * امضای بصری محصول.
 *
 * این سامانه فقط یک ادعا دارد: «تاریخ‌ها جابه‌جا می‌شوند و باید بدانیم چقدر».
 * پس همان عدد، به‌جای اینکه ته یک تب پنهان شود، روی کارت دیده می‌شود:
 * لنگر = تعهد اولیه، امتداد نوار = فاصله تا تاریخ فعلی.
 *
 * جهت نوار عمداً منطقی است نه بصری: عقب‌افتادگی به یک سمت رشد می‌کند و
 * جلو افتادن به سمت دیگر، تا با یک نگاه بشود فهمید اوضاع از چه قرار است.
 */

const SCALE_DAYS = 15; // بیش از این، نوار پر می‌شود و عدد حرف اصلی را می‌زند

export default function DriftRibbon({
  baseline,
  current,
  driftDays,
  compact = false,
}: {
  baseline?: string | null;
  current?: string | null;
  driftDays?: number | null;
  compact?: boolean;
}) {
  if (!baseline || !current || driftDays == null) return null;

  const magnitude = Math.min(Math.abs(driftDays) / SCALE_DAYS, 1);
  const late = driftDays > 0;
  const tone = !late ? 'ok' : Math.abs(driftDays) > 5 ? 'danger' : 'warn';

  // لنگر وسط است تا هر دو جهت جا داشته باشند
  const half = magnitude * 50;
  const fillStyle = late
    ? { insetInlineEnd: '50%', width: `${half}%` }
    : { insetInlineStart: '50%', width: `${half}%` };

  const label =
    driftDays === 0
      ? 'دقیقاً روی تعهد اولیه'
      : late
        ? `${faDigits(Math.abs(driftDays))} روز کاری عقب‌تر از تعهد اولیه`
        : `${faDigits(Math.abs(driftDays))} روز کاری جلوتر از تعهد اولیه`;

  return (
    <Tooltip
      title={
        <div style={{ fontSize: 12, lineHeight: 1.9 }}>
          <div>تعهد اولیه: {faDigits(toJalali(baseline))}</div>
          <div>تاریخ فعلی: {faDigits(toJalali(current))}</div>
          <div style={{ marginTop: 4, opacity: 0.85 }}>{label}</div>
        </div>
      }
    >
      <div className="drift" role="img" aria-label={label}>
        {!compact && <span style={{ color: 'var(--text-faint)' }}>انحراف</span>}
        <span className="drift-track" aria-hidden="true">
          <span className="drift-anchor" style={{ insetInlineStart: '50%' }} />
          <span className="drift-fill" data-tone={tone} style={fillStyle} />
        </span>
        <span className="drift-value" style={{ color: `var(--${tone})` }} aria-hidden="true">
          {driftDays > 0 ? '+' : ''}
          {faDigits(driftDays)}
        </span>
      </div>
    </Tooltip>
  );
}
