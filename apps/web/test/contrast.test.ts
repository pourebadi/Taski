import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * کنتراست را حدس نمی‌زنیم؛ اندازه می‌گیریم.
 *
 * مقادیر از خود styles.css خوانده می‌شوند، پس اگر کسی یک رنگ را روشن‌تر
 * کند و از حد WCAG بیفتد، همین تست قرمز می‌شود. پیش‌تر --text-faint نسبت
 * ۳.۰۳:۱ داشت (حد لازم ۴.۵) و تفکیک بوم از کارت ۱.۰۷:۱ بود — یعنی روی
 * مانیتور معمولی ستون‌های بورد عملاً دیده نمی‌شدند.
 */

const css = fs.readFileSync(path.resolve(__dirname, '../src/styles.css'), 'utf8');

function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`توکن --${name} در styles.css پیدا نشد`);
  return m[1];
}

const channels = (h: string) =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const linear = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const luminance = (h: string) => {
  const [r, g, b] = channels(h).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe('کنتراست پالت — WCAG 2.1 AA', () => {
  const surface = token('surface');
  const canvas = token('canvas');

  // متن معمولی: حداقل ۴.۵:۱
  const textOn: [string, string, string][] = [
    ['text', surface, 'متن اصلی روی کارت'],
    ['text', canvas, 'متن اصلی روی بوم'],
    ['text-muted', surface, 'متن کم‌رنگ روی کارت'],
    ['text-muted', canvas, 'متن کم‌رنگ روی بوم'],
    ['text-faint', surface, 'متن خیلی کم‌رنگ روی کارت'],
    ['text-faint', canvas, 'متن خیلی کم‌رنگ روی بوم'],
    ['brand', surface, 'رنگ برند روی کارت'],
    ['brand', canvas, 'رنگ برند روی بوم'],
  ];

  for (const [fg, bg, label] of textOn) {
    it(`${label} حداقل ۴.۵:۱ است`, () => {
      expect(contrast(token(fg), bg)).toBeGreaterThanOrEqual(4.5);
    });
  }

  // نشان‌های سلامت: متن روی زمینه‌ی نرم خودش
  for (const tone of ['ok', 'warn', 'danger', 'unknown']) {
    it(`نشان ${tone} روی زمینه‌ی خودش خوانا است`, () => {
      expect(contrast(token(tone), token(`${tone}-soft`))).toBeGreaterThanOrEqual(4.5);
    });
  }

  // اولویت‌ها روی کارت
  for (const p of ['p0', 'p1', 'p2', 'p3']) {
    it(`رنگ ${p.toUpperCase()} روی کارت خوانا است`, () => {
      expect(contrast(token(p), surface)).toBeGreaterThanOrEqual(4.5);
    });
  }

  // عناصر غیرمتنی مثل مرز کارت و ستون: حداقل ۳:۱
  it('خط مرزی روی کارت حداقل ۳:۱ است', () => {
    expect(contrast(token('line'), surface)).toBeGreaterThanOrEqual(3);
  });

  it('خط مرزی روی بوم حداقل ۳:۱ است', () => {
    expect(contrast(token('line'), canvas)).toBeGreaterThanOrEqual(3);
  });

  it('بوم و کارت واقعاً از هم تفکیک می‌شوند', () => {
    // ۱.۰۷:۱ قبلی روی مانیتور معمولی نامرئی بود
    expect(contrast(canvas, surface)).toBeGreaterThanOrEqual(1.15);
  });

  it('حلقه‌ی فوکوس روی هر دو سطح دیده می‌شود', () => {
    expect(contrast(token('focus'), surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(token('focus'), canvas)).toBeGreaterThanOrEqual(3);
  });
});
