import { describe, it, expect } from 'vitest';
import * as svc from '../src/calendar/working-days';
const noHolidays = new Set<string>();

// 2026-08-29 شنبه است؛ 2026-08-28 جمعه.
const SAT = new Date('2026-08-29T00:00:00Z');
const FRI = new Date('2026-08-28T00:00:00Z');

describe('تقویم کاری: شنبه تا پنجشنبه کاری، فقط جمعه تعطیل', () => {
  it('جمعه روز کاری نیست', () => {
    expect(svc.isWorkingDay(FRI, noHolidays)).toBe(false);
  });

  it('پنجشنبه روز کاری است', () => {
    const thu = new Date('2026-08-27T00:00:00Z');
    expect(thu.getUTCDay()).toBe(4);
    expect(svc.isWorkingDay(thu, noHolidays)).toBe(true);
  });

  it('یک هفته کامل شش روز کاری دارد', () => {
    const nextSat = new Date('2026-09-05T00:00:00Z');
    expect(svc.countWorkingDays(SAT, nextSat, noHolidays)).toBe(6);
  });

  it('تعطیل رسمی از شمارش حذف می‌شود', () => {
    const holidays = new Set(['2026-09-01']);
    const nextSat = new Date('2026-09-05T00:00:00Z');
    expect(svc.countWorkingDays(SAT, nextSat, holidays)).toBe(5);
  });

  it('حرکت به عقب عدد منفی می‌دهد', () => {
    const nextSat = new Date('2026-09-05T00:00:00Z');
    expect(svc.countWorkingDays(nextSat, SAT, noHolidays)).toBe(-6);
  });

  it('ابتدای هفته گزارشی شنبه است', () => {
    const wed = new Date('2026-09-02T00:00:00Z');
    expect(svc.startOfReportingWeek(wed).toISOString().slice(0, 10)).toBe('2026-08-29');
  });
});
