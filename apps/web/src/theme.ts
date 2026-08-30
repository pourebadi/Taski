import type { ThemeConfig } from 'antd';

/**
 * مقادیر اینجا باید با توکن‌های styles.css یکی بمانند.
 * antd نمی‌تواند var(--x) را بخواند، پس ناچار تکرار می‌شوند؛
 * هر تغییری باید در هر دو جا انجام شود.
 */
export const palette = {
  brand: '#14675a',
  brandHover: '#10554a',
  ink: '#101917',
  surface: '#ffffff',
  canvas: '#f6f8f7',
  line: '#e3e8e6',
  text: '#16211e',
  textMuted: '#5c6b66',
  ok: '#17795e',
  warn: '#a35a06',
  danger: '#b42318',
  unknown: '#6b7a76',
};

export const theme: ThemeConfig = {
  token: {
    fontFamily: 'Vazirmatn, IRANSans, system-ui, sans-serif',
    colorPrimary: palette.brand,
    colorSuccess: palette.ok,
    colorWarning: palette.warn,
    colorError: palette.danger,
    colorInfo: palette.brand,
    colorText: palette.text,
    colorTextSecondary: palette.textMuted,
    colorBorder: palette.line,
    colorBorderSecondary: palette.line,
    colorBgLayout: palette.canvas,
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,
    fontSize: 14,
    controlHeight: 36,
    wireframe: false,
    boxShadowSecondary: '0 12px 32px rgba(16, 25, 23, 0.12)',
  },
  components: {
    Layout: {
      headerBg: palette.surface,
      headerHeight: 60,
      headerPadding: '0 16px',
      siderBg: palette.ink,
      bodyBg: palette.canvas,
    },
    Menu: {
      darkItemBg: palette.ink,
      darkSubMenuItemBg: palette.ink,
      darkItemSelectedBg: 'rgba(20, 103, 90, 0.55)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
      itemMarginInline: 10,
      itemBorderRadius: 8,
      itemHeight: 40,
    },
    Card: { paddingLG: 18 },
    Table: {
      headerBg: palette.canvas,
      headerColor: palette.textMuted,
      rowHoverBg: '#e7f1ee',
      borderColor: palette.line,
    },
    Drawer: { paddingLG: 20 },
    Modal: { titleFontSize: 16 },
    Tabs: { titleFontSize: 14 },
    Statistic: { titleFontSize: 12, contentFontSize: 24 },
    Segmented: { itemSelectedBg: palette.surface },
    Tag: { defaultBg: palette.canvas },
  },
};
