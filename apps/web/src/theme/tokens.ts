import { theme as antdAlgorithms, type ThemeConfig } from 'antd';

/**
 * تک منبع حقیقتِ رنگ برای کل برنامه.
 *
 * پیش‌تر رنگ‌ها در سه جای ناسازگار تعریف شده بودند (theme.ts، styles.css و
 * رنگ‌های هاردکد نمودار) و همین باعث می‌شد رابط «سرهم‌بندی‌شده» دیده شود.
 * حالا هر رنگ فقط اینجا تعریف می‌شود:
 *   • تم AntD مستقیماً از همین‌جا ساخته می‌شود (buildAntdTheme).
 *   • متغیرهای CSS در styles.css باید عیناً برابر همین مقادیر باشند؛
 *     تست theme-sync.test.ts این برابری را تضمین می‌کند (اگر واگرا شوند، قرمز می‌شود).
 *
 * مقادیرِ روشن با WCAG 2.1 AA سنجیده شده‌اند (contrast.test.ts). تیره برای
 * سطوح تیره تنظیم شده و جداسازی را با ارتفاع/سایه انجام می‌دهد نه با خط پررنگ.
 */

export type ThemeMode = 'light' | 'dark';

/** کلیدهای رنگی مشترک بین هر دو تم. ترتیب و نام‌ها با styles.css یکی است. */
export const COLOR_TOKENS: Record<ThemeMode, Record<string, string>> = {
  light: {
    // سطوح
    ink: '#0f1a18',
    'sider-bg': '#0f1a18',
    'sider-text': '#eaf1ee',
    surface: '#ffffff',
    'surface-sunken': '#f4f7f6',
    elevated: '#ffffff',
    canvas: '#e9eeec',
    // خطوط: line با AA سازگار است (۳:۱)، line-soft برای جداکننده‌های نرمِ بصری
    line: '#6f7f79',
    'line-soft': '#dbe2df',
    'line-strong': '#5f6e69',
    // متن
    text: '#14211d',
    'text-muted': '#55635e',
    'text-faint': '#5c6a65',
    'text-invert': '#f4f7f6',
    // برند
    brand: '#0f6b5b',
    'brand-hover': '#0b5447',
    'brand-soft': '#ddeee9',
    'brand-line': '#7fb3a6',
    focus: '#0a6b8f',
    // سیگنال‌ها
    ok: '#0f6b52',
    'ok-soft': '#dff2ea',
    warn: '#8a4a00',
    'warn-soft': '#fbeedb',
    danger: '#a4231a',
    'danger-soft': '#fdeae7',
    unknown: '#4c5b56',
    'unknown-soft': '#e6ebe9',
    // اولویت
    p0: '#a4231a',
    p1: '#8a4a00',
    p2: '#0f6b5b',
    p3: '#4c5b56',
  },
  dark: {
    ink: '#0b1210',
    'sider-bg': '#0b1210',
    'sider-text': '#eaf1ee',
    surface: '#151e1b',
    'surface-sunken': '#101917',
    elevated: '#1b2723',
    canvas: '#0e1614',
    line: '#2b3833',
    'line-soft': '#243430',
    'line-strong': '#3a4a44',
    text: '#e8efec',
    'text-muted': '#a4b3ad',
    'text-faint': '#84948e',
    'text-invert': '#0e1614',
    brand: '#3fbfa9',
    'brand-hover': '#57cdb8',
    'brand-soft': '#122f29',
    'brand-line': '#2a4f47',
    focus: '#5cc7ec',
    ok: '#37b98f',
    'ok-soft': '#123a30',
    warn: '#d99236',
    'warn-soft': '#3a2a12',
    danger: '#f0685a',
    'danger-soft': '#3a1c19',
    unknown: '#93a29c',
    'unknown-soft': '#23302c',
    p0: '#f0685a',
    p1: '#d99236',
    p2: '#3fbfa9',
    p3: '#93a29c',
  },
};

/** سایه‌ها تمی‌اند: تیره به سایه‌ی عمیق‌تر نیاز دارد تا ارتفاع دیده شود. */
export const SHADOW_TOKENS: Record<ThemeMode, Record<string, string>> = {
  light: {
    'shadow-1': '0 1px 2px rgba(16, 33, 29, 0.06)',
    'shadow-2': '0 4px 16px rgba(16, 33, 29, 0.08), 0 1px 3px rgba(16, 33, 29, 0.06)',
    'shadow-3': '0 24px 48px -12px rgba(16, 33, 29, 0.22)',
  },
  dark: {
    'shadow-1': '0 1px 2px rgba(0, 0, 0, 0.45)',
    'shadow-2': '0 6px 18px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.45)',
    'shadow-3': '0 28px 56px -12px rgba(0, 0, 0, 0.7)',
  },
};

/** بخش انتخاب‌شده‌ی منوی سایدبار (سایدبار در هر دو تم تیره است). */
const MENU_SELECTED: Record<ThemeMode, string> = {
  light: 'rgba(63, 191, 169, 0.20)',
  dark: 'rgba(63, 191, 169, 0.20)',
};

/**
 * رنگ‌های حالت‌های تعاملی که AntD به‌صورت مقدار مشخص می‌خواهد (نمی‌تواند
 * var(--x) بخواند). اینها hover/active/focus/disabled را در هر دو تم یکدست
 * می‌کنند: هاله‌ی فوکوس برند، پس‌زمینه‌ی hover گزینه‌ها، حالت غیرفعال.
 */
const INTERACT: Record<ThemeMode, {
  glow: string; itemHover: string; itemActive: string;
  disabledBg: string; hoverFill: string;
}> = {
  light: {
    glow: 'rgba(15, 107, 91, 0.14)',
    itemHover: '#e7f2ee',
    itemActive: '#d6ebe4',
    disabledBg: '#f0f3f2',
    hoverFill: 'rgba(16, 33, 29, 0.04)',
  },
  dark: {
    glow: 'rgba(63, 191, 169, 0.22)',
    itemHover: '#18342e',
    itemActive: '#1f4239',
    disabledBg: '#161f1c',
    hoverFill: 'rgba(255, 255, 255, 0.05)',
  },
};

/** ساخت پیکربندی تم AntD از همان توکن‌ها. */
export function buildAntdTheme(mode: ThemeMode): ThemeConfig {
  const c = COLOR_TOKENS[mode];
  const s = SHADOW_TOKENS[mode];
  const x = INTERACT[mode];
  return {
    algorithm: mode === 'dark' ? antdAlgorithms.darkAlgorithm : antdAlgorithms.defaultAlgorithm,
    token: {
      fontFamily: 'Vazirmatn, IRANSans, system-ui, sans-serif',
      colorPrimary: c.brand,
      colorLink: c.brand,
      colorLinkHover: c['brand-hover'],
      colorSuccess: c.ok,
      colorWarning: c.warn,
      colorError: c.danger,
      colorInfo: c.brand,
      colorText: c.text,
      colorTextSecondary: c['text-muted'],
      colorTextTertiary: c['text-faint'],
      colorTextQuaternary: c['text-faint'],
      colorBorder: c['line-soft'],
      colorBorderSecondary: c['line-soft'],
      colorBgLayout: c.canvas,
      colorBgContainer: c.surface,
      colorBgElevated: c.elevated,
      colorBgSpotlight: mode === 'dark' ? '#25332e' : '#1f2a27',
      // حالت‌های تعاملی مشترک: hover گزینه‌ها، فوکوس، غیرفعال
      controlItemBgHover: x.itemHover,
      controlItemBgActive: x.itemActive,
      controlItemBgActiveHover: x.itemActive,
      controlOutline: x.glow,
      controlOutlineWidth: 3,
      colorBgTextHover: x.hoverFill,
      colorBgTextActive: x.itemActive,
      colorBgContainerDisabled: x.disabledBg,
      borderRadius: 10,
      borderRadiusLG: 14,
      borderRadiusSM: 6,
      fontSize: 14,
      controlHeight: 36,
      wireframe: false,
      boxShadow: s['shadow-2'],
      boxShadowSecondary: s['shadow-3'],
    },
    components: {
      Layout: {
        headerBg: c.surface,
        headerHeight: 60,
        headerPadding: '0 16px',
        siderBg: c['sider-bg'],
        bodyBg: c.canvas,
      },
      Menu: {
        // منوی سایدبار (تیره در هر دو تم)
        darkItemBg: c['sider-bg'],
        darkSubMenuItemBg: c['sider-bg'],
        darkItemColor: 'rgba(234, 241, 238, 0.72)',
        darkItemSelectedBg: MENU_SELECTED[mode],
        darkItemSelectedColor: '#ffffff',
        darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
        // منوهای روشن (Dropdown)
        itemHoverBg: x.itemHover,
        itemSelectedBg: c['brand-soft'],
        itemSelectedColor: c.brand,
        itemActiveBg: x.itemActive,
        itemMarginInline: 10,
        itemBorderRadius: 8,
        itemHeight: 40,
      },
      Button: {
        fontWeight: 500,
        primaryShadow: mode === 'dark' ? 'none' : '0 1px 2px rgba(15, 107, 91, 0.18)',
        defaultShadow: 'none',
        dangerShadow: 'none',
        defaultHoverColor: c.brand,
        defaultHoverBorderColor: c['brand-line'],
        defaultActiveColor: c['brand-hover'],
        defaultActiveBorderColor: c.brand,
        colorPrimaryHover: c['brand-hover'],
        colorPrimaryActive: c['brand-hover'],
        controlHeight: 36,
        paddingInline: 16,
      },
      Input: {
        hoverBorderColor: c['brand-line'],
        activeBorderColor: c.brand,
        activeShadow: `0 0 0 3px ${x.glow}`,
        controlHeight: 36,
        colorBgContainer: c.surface,
      },
      InputNumber: {
        hoverBorderColor: c['brand-line'],
        activeBorderColor: c.brand,
        activeShadow: `0 0 0 3px ${x.glow}`,
        controlHeight: 36,
      },
      Select: {
        optionActiveBg: x.itemHover,
        optionSelectedBg: c['brand-soft'],
        optionSelectedColor: mode === 'dark' ? c.text : c.brand,
        optionSelectedFontWeight: 600,
        hoverBorderColor: c['brand-line'],
        activeBorderColor: c.brand,
        activeOutlineColor: x.glow,
        controlHeight: 36,
        colorBgElevated: c.elevated,
      },
      DatePicker: {
        hoverBorderColor: c['brand-line'],
        activeBorderColor: c.brand,
        activeShadow: `0 0 0 3px ${x.glow}`,
        colorBgElevated: c.elevated,
        controlHeight: 36,
      },
      Checkbox: { controlInteractiveSize: 18 },
      Radio: { buttonCheckedBg: c['brand-soft'] },
      Card: { paddingLG: 18, colorBorderSecondary: c['line-soft'] },
      Table: {
        headerBg: c['surface-sunken'],
        headerColor: c['text-muted'],
        headerSplitColor: 'transparent',
        rowHoverBg: c['brand-soft'],
        borderColor: c['line-soft'],
        cellPaddingBlock: 12,
        colorBgContainer: c.surface,
      },
      Drawer: { paddingLG: 20, colorBgElevated: c.surface },
      Modal: { titleFontSize: 16, contentBg: c.elevated, headerBg: c.elevated },
      Popover: { colorBgElevated: c.elevated },
      Dropdown: { colorBgElevated: c.elevated, controlItemBgHover: x.itemHover },
      Tabs: {
        titleFontSize: 14,
        inkBarColor: c.brand,
        itemColor: c['text-muted'],
        itemHoverColor: c.brand,
        itemSelectedColor: c.text,
        itemActiveColor: c['brand-hover'],
      },
      Statistic: { titleFontSize: 12, contentFontSize: 24 },
      Segmented: {
        itemSelectedBg: c.surface,
        itemHoverBg: x.itemHover,
        itemSelectedColor: c.brand,
        itemColor: c['text-muted'],
        trackBg: c['surface-sunken'],
      },
      Tag: { defaultBg: c['surface-sunken'], defaultColor: c['text-muted'] },
      Tooltip: { colorBgSpotlight: mode === 'dark' ? '#25332e' : '#1f2a27' },
      Alert: { colorInfoBg: c['brand-soft'], colorInfoBorder: c['brand-line'] },
      Skeleton: { colorFill: x.itemHover },
      Switch: { colorPrimary: c.brand },
      Message: { colorBgElevated: c.elevated },
      Notification: { colorBgElevated: c.elevated },
    },
  };
}

/** رشته‌ی متغیرهای CSS برای یک تم — برای تزریق اولیه پیش از رندر (بدون FOUC). */
export function themeVarBlock(mode: ThemeMode): string {
  const c = COLOR_TOKENS[mode];
  const s = SHADOW_TOKENS[mode];
  return [
    ...Object.entries(c).map(([k, v]) => `--${k}: ${v};`),
    ...Object.entries(s).map(([k, v]) => `--${k}: ${v};`),
  ].join(' ');
}
