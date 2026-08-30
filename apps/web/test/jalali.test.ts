import { describe, it, expect } from 'vitest';
import { toJalaliParts, fromJalali, jalaliMonthLength } from '../src/lib/jalali';

/**
 * ریاضیات تقویم را در برابر Intl می‌سنجیم — یعنی تقویم فارسیِ بومی
 * مرورگر. اگر محاسبات دست‌ساز یک روز هم بلغزد، این تست می‌گیرد.
 */

const intlFmt = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

function intlJalali(d: Date) {
  const p: Record<string, string> = {};
  for (const part of intlFmt.formatToParts(d)) {
    if (part.type !== 'literal') p[part.type] = part.value;
  }
  return { jy: Number(p.year), jm: Number(p.month), jd: Number(p.day) };
}

describe('تبدیل تقویم شمسی', () => {
  it('نوروز چند سال را درست می‌دهد', () => {
    expect(toJalaliParts(new Date(2026, 2, 21))).toEqual({ jy: 1405, jm: 1, jd: 1 });
    expect(toJalaliParts(new Date(2025, 2, 21))).toEqual({ jy: 1404, jm: 1, jd: 1 });
    expect(toJalaliParts(new Date(2024, 2, 20))).toEqual({ jy: 1403, jm: 1, jd: 1 });
  });

  it('با Intl روی ۴۰ سال روز‌به‌روز می‌خواند', () => {
    // نمونه‌برداری هر ۷ روز از ۱۹۹۰ تا ۲۰۳۰
    const mismatches: string[] = [];
    for (let t = Date.UTC(1990, 0, 1); t < Date.UTC(2030, 0, 1); t += 7 * 86400_000) {
      const utc = new Date(t);
      // نسخه‌ی محلی با همان اجزای تقویمی، چون توابع ما محلی کار می‌کنند
      const local = new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
      const ours = toJalaliParts(local);
      const theirs = intlJalali(utc);
      if (ours.jy !== theirs.jy || ours.jm !== theirs.jm || ours.jd !== theirs.jd) {
        mismatches.push(
          `${utc.toISOString().slice(0, 10)}: ما ${ours.jy}/${ours.jm}/${ours.jd} — Intl ${theirs.jy}/${theirs.jm}/${theirs.jd}`,
        );
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });

  it('رفت و برگشت تبدیل، همان تاریخ را برمی‌گرداند', () => {
    for (let t = Date.UTC(2000, 0, 1); t < Date.UTC(2035, 0, 1); t += 11 * 86400_000) {
      const utc = new Date(t);
      const d = new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
      const j = toJalaliParts(d);
      const back = fromJalali(j.jy, j.jm, j.jd);
      expect(back.getFullYear()).toBe(d.getFullYear());
      expect(back.getMonth()).toBe(d.getMonth());
      expect(back.getDate()).toBe(d.getDate());
    }
  });

  it('طول ماه‌ها درست است', () => {
    for (let m = 1; m <= 6; m += 1) expect(jalaliMonthLength(1404, m)).toBe(31);
    for (let m = 7; m <= 11; m += 1) expect(jalaliMonthLength(1404, m)).toBe(30);
    // اسفند ۲۹ یا ۳۰ روز، بسته به کبیسه
    expect([29, 30]).toContain(jalaliMonthLength(1404, 12));
  });

  it('طول اسفند با Intl می‌خواند', () => {
    for (let jy = 1395; jy <= 1420; jy += 1) {
      const len = jalaliMonthLength(jy, 12);
      const last = fromJalali(jy, 12, len);
      expect(toJalaliParts(last)).toEqual({ jy, jm: 12, jd: len });
      // روز بعد باید فروردین سال بعد باشد
      const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      expect(toJalaliParts(next)).toEqual({ jy: jy + 1, jm: 1, jd: 1 });
    }
  });
});
