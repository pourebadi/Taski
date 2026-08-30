import { describe, it, expect } from 'vitest';
import { normalizeFa } from '../src/common/text';

describe('نرمال‌سازی فارسی', () => {
  it('کاف و یای عربی را فارسی می‌کند', () => {
    expect(normalizeFa('كاربر جديد')).toBe(normalizeFa('کاربر جدید'));
  });
  it('اعداد فارسی و عربی را لاتین می‌کند', () => {
    expect(normalizeFa('نسخه ۳')).toBe('نسخه 3');
    expect(normalizeFa('نسخه ٣')).toBe('نسخه 3');
  });
  it('فاصله‌های اضافه را حذف می‌کند', () => {
    expect(normalizeFa('  تسک   جدید  ')).toBe('تسک جدید');
  });
});
