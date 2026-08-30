import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COLOR_TOKENS, SHADOW_TOKENS } from '../src/theme/tokens';

/**
 * تک‌منبع‌بودن رنگ را تضمین می‌کند.
 *
 * منبع حقیقت theme/tokens.ts است، ولی styles.css ناچار همان مقادیر را به‌صورت
 * literal تکرار می‌کند (چون contrast.test.ts آن‌ها را از CSS می‌خواند و برای
 * جلوگیری از پرشِ تم لازم‌اند). این تست تضمین می‌کند این دو هرگز واگرا نشوند —
 * دقیقاً همان باگی که رابط را «سرهم‌بندی‌شده» نشان می‌داد.
 */

const css = fs.readFileSync(path.resolve(__dirname, '../src/styles.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`);
  const m = css.match(re);
  if (!m) throw new Error(`بلاک ${selector} در styles.css پیدا نشد`);
  const out: Record<string, string> = {};
  for (const line of m[1].split(';')) {
    const mm = line.match(/--([\w-]+)\s*:\s*(.+)$/);
    if (mm) out[mm[1]] = mm[2].trim().replace(/\s+/g, ' ').toLowerCase();
  }
  return out;
}

const norm = (v: string) => v.trim().replace(/\s+/g, ' ').toLowerCase();

describe('همگام‌سازی توکن‌ها — tokens.ts ↔ styles.css', () => {
  const lightCss = block(':root');
  const darkCss = block(":root\\[data-theme='dark'\\]");

  for (const mode of ['light', 'dark'] as const) {
    const cssBlock = mode === 'light' ? lightCss : darkCss;
    const expected = { ...COLOR_TOKENS[mode], ...SHADOW_TOKENS[mode] };

    for (const [name, value] of Object.entries(expected)) {
      it(`[${mode}] --${name} در styles.css با tokens.ts یکی است`, () => {
        expect(cssBlock[name], `--${name} در بلاک ${mode} گم است`).toBeDefined();
        expect(cssBlock[name]).toBe(norm(value));
      });
    }
  }
});
