import { describe, it, expect } from 'vitest';
import fa from '../src/locales/fa.json';
import { STATES, HEALTHS, STREAMS, REASONS } from '../src/lib/terms';

/**
 * واژگانِ دامنه در دو جا ظاهر می‌شود: lib/terms.ts (منبع اصلی، برای Select و
 * بج‌ها) و fa.json (برای فراخوانی‌های قدیمیِ t(`state.X`)). این تست تضمین
 * می‌کند برچسبِ فشرده‌ی فارسی در هر دو یکی بماند تا دوباره واگرا نشوند.
 */

const faMap = fa as Record<string, string>;

const CASES: [string, { value: string; fa: string }[]][] = [
  ['state', STATES],
  ['health', HEALTHS],
  ['stream', STREAMS],
  ['reason', REASONS],
];

describe('همگام‌سازی واژگان — terms.ts ↔ fa.json', () => {
  for (const [domain, list] of CASES) {
    for (const term of list) {
      it(`${domain}.${term.value} در fa.json با terms.ts یکی است`, () => {
        expect(faMap[`${domain}.${term.value}`]).toBe(term.fa);
      });
    }
  }
});
