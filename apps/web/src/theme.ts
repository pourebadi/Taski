import { buildAntdTheme, COLOR_TOKENS } from './theme/tokens';

/**
 * لایه‌ی سازگاری. منبع حقیقت رنگ حالا در theme/tokens.ts است.
 * این فایل فقط برای importهای موجود (و تست‌ها) نگه داشته شده.
 */
export const theme = buildAntdTheme('light');
export const palette = COLOR_TOKENS.light;

export { buildAntdTheme, COLOR_TOKENS, SHADOW_TOKENS, themeVarBlock } from './theme/tokens';
export type { ThemeMode } from './theme/tokens';
