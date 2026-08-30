import fa from '../locales/fa.json';

/** هیچ متن فارسی هاردکد در کامپوننت. (CLAUDE.md قانون ۴) */
export const t = (key: keyof typeof fa | string): string => (fa as Record<string, string>)[key] ?? key;
