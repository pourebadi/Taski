import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Popover } from 'antd';
import { CalendarOutlined, CloseCircleFilled, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  JALALI_MONTHS,
  WEEKDAYS,
  addMonths,
  fromJalali,
  isSameDay,
  jalaliMonthLength,
  toJalaliParts,
  weekColumn,
} from '../lib/jalali';
import { faDigits } from '../lib/date';

/**
 * انتخابگر تاریخ شمسی.
 *
 * جایگزین antd-jalali-plus که سه مشکل داشت: پلاگین dayjs را خراب می‌کرد،
 * فایل CSS‌اش هیچ‌جا import نشده بود (پس بی‌استایل رندر می‌شد)، و چون با
 * پیشوند rc-picker کار می‌کرد توکن فونت antd هرگز به آن نمی‌رسید.
 *
 * اینجا همه‌چیز از توکن‌های خود برنامه می‌آید، پس وزیرمتن و رنگ‌ها
 * خودبه‌خود درست‌اند. پیمایش کامل با کیبورد پشتیبانی می‌شود.
 *
 * قرارداد value/onChange عمداً همان dayjs است تا فرم‌های موجود دست‌نخورده بمانند.
 */
export default function JalaliDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  allowClear = true,
  disabled,
  id,
  'aria-label': ariaLabel,
  style,
}: {
  value?: dayjs.Dayjs | null;
  onChange?: (v: dayjs.Dayjs | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  style?: React.CSSProperties;
}) {
  const selected = value ? value.toDate() : null;
  const today = useMemo(() => new Date(), []);

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => toJalaliParts(selected ?? today));
  // روزی که فوکوس کیبورد رویش است
  const [focusDay, setFocusDay] = useState<number>(() => (selected ?? today) && toJalaliParts(selected ?? today).jd);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const base = toJalaliParts(selected ?? today);
      setCursor({ jy: base.jy, jm: base.jm, jd: base.jd });
      setFocusDay(base.jd);
    }
  }, [open]);

  // وقتی روز فوکوس عوض می‌شود، فوکوس واقعی DOM هم باید برود
  useEffect(() => {
    if (!open) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`);
    el?.focus();
  }, [focusDay, cursor.jy, cursor.jm, open]);

  const monthLength = jalaliMonthLength(cursor.jy, cursor.jm);
  const firstDate = fromJalali(cursor.jy, cursor.jm, 1);
  const leadingBlanks = weekColumn(firstDate);

  const pick = (day: number) => {
    const d = fromJalali(cursor.jy, cursor.jm, day);
    onChange?.(dayjs(d));
    setOpen(false);
  };

  const shiftMonth = (delta: number) => {
    const next = addMonths(cursor.jy, cursor.jm, delta);
    const len = jalaliMonthLength(next.jy, next.jm);
    setCursor({ ...next, jd: Math.min(cursor.jd, len) });
    setFocusDay((d) => Math.min(d, len));
  };

  /** پیمایش شبکه با کلیدهای جهت‌دار — در RTL چپ و راست جابه‌جا می‌شوند. */
  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowRight: -1,
      ArrowLeft: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (e.key in moves) {
      e.preventDefault();
      const next = focusDay + moves[e.key];
      if (next < 1) {
        shiftMonth(-1);
        const prev = addMonths(cursor.jy, cursor.jm, -1);
        setFocusDay(jalaliMonthLength(prev.jy, prev.jm) + next);
      } else if (next > monthLength) {
        shiftMonth(1);
        setFocusDay(next - monthLength);
      } else {
        setFocusDay(next);
      }
      return;
    }
    if (e.key === 'PageUp') {
      e.preventDefault();
      shiftMonth(-1);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      shiftMonth(1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusDay(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusDay(monthLength);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const label = selected
    ? (() => {
        const j = toJalaliParts(selected);
        return faDigits(`${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`);
      })()
    : null;

  const panel = (
    <div style={{ width: 268, padding: 4 }} className="jalali-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
        <Button
          type="text"
          size="small"
          icon={<RightOutlined />}
          onClick={() => shiftMonth(-1)}
          aria-label="ماه قبل"
        />
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 14 }} aria-live="polite">
          {JALALI_MONTHS[cursor.jm - 1]} {faDigits(cursor.jy)}
        </div>
        <Button
          type="text"
          size="small"
          icon={<LeftOutlined />}
          onClick={() => shiftMonth(1)}
          aria-label="ماه بعد"
        />
      </div>

      <div className="jalali-weekdays" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div
        ref={gridRef}
        className="jalali-grid"
        role="grid"
        aria-label={`${JALALI_MONTHS[cursor.jm - 1]} ${cursor.jy}`}
        onKeyDown={onGridKeyDown}
      >
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: monthLength }, (_, i) => {
          const day = i + 1;
          const date = fromJalali(cursor.jy, cursor.jm, day);
          const isSelected = selected ? isSameDay(date, selected) : false;
          const isToday = isSameDay(date, today);
          const isFriday = date.getDay() === 5;
          return (
            <button
              key={day}
              type="button"
              data-day={day}
              role="gridcell"
              aria-selected={isSelected}
              aria-current={isToday ? 'date' : undefined}
              tabIndex={day === focusDay ? 0 : -1}
              className="jalali-day"
              data-selected={isSelected || undefined}
              data-today={isToday || undefined}
              data-holiday={isFriday || undefined}
              onClick={() => pick(day)}
            >
              {faDigits(day)}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Button size="small" block onClick={() => onChange?.(dayjs()) || setOpen(false)}>
          امروز
        </Button>
        {allowClear && (
          <Button
            size="small"
            block
            onClick={() => {
              onChange?.(null);
              setOpen(false);
            }}
          >
            پاک کردن
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      content={panel}
      styles={{ body: { padding: 12 } }}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="jalali-trigger"
        style={style}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <CalendarOutlined aria-hidden="true" style={{ color: 'var(--text-faint)' }} />
        <span className={label ? 'tabular' : undefined} style={{ flex: 1, textAlign: 'start' }}>
          {label ?? <span style={{ color: 'var(--text-faint)' }}>{placeholder}</span>}
        </span>
        {allowClear && label && (
          <CloseCircleFilled
            role="button"
            aria-label="پاک کردن تاریخ"
            tabIndex={0}
            className="jalali-clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange?.(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                onChange?.(null);
              }
            }}
          />
        )}
      </button>
    </Popover>
  );
}
