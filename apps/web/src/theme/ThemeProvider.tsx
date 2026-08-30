import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import faIR from 'antd/locale/fa_IR';
import { buildAntdTheme, themeVarBlock, type ThemeMode } from './tokens';

const STORAGE_KEY = 'taski:theme';

type ThemePref = ThemeMode | 'system';

type ThemeContextValue = {
  /** ترجیح کاربر: روشن، تیره یا پیروی از سیستم */
  pref: ThemePref;
  /** تمِ واقعیِ اعمال‌شده پس از حل «system» */
  mode: ThemeMode;
  setPref: (pref: ThemePref) => void;
  /** چرخه‌ی سریع بین روشن و تیره */
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemMode(): ThemeMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* localStorage ممکن است در حالت خصوصی خطا بدهد */
  }
  return 'system';
}

function resolve(pref: ThemePref): ThemeMode {
  return pref === 'system' ? systemMode() : pref;
}

/** اعمال تم روی ریشه‌ی سند — data-theme متغیرهای CSS را در styles.css فعال می‌کند. */
function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
}

/**
 * پیش از رندر React صدا زده می‌شود (در main.tsx) تا اولین رنگ‌آمیزی درست باشد
 * و پرشِ روشن‌به‌تیره رخ ندهد. علاوه بر data-theme، متغیرها را هم یک‌بار
 * به‌صورت inline تزریق می‌کند تا حتی پیش از پارس‌شدن styles.css رنگ درست باشد.
 */
export function initThemeSync() {
  const mode = resolve(readPref());
  applyMode(mode);
  const style = document.createElement('style');
  style.id = 'taski-theme-preboot';
  style.textContent = `:root{${themeVarBlock(mode)}}`;
  document.head.appendChild(style);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => readPref());
  const [mode, setMode] = useState<ThemeMode>(() => resolve(pref));

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* بی‌اهمیت */
    }
    setMode(resolve(next));
  }, []);

  const toggle = useCallback(() => {
    setPref(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setPref]);

  // وقتی ترجیح «system» است و کاربر تمِ سیستم را عوض می‌کند، همراهش برویم
  useEffect(() => {
    if (pref !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setMode(systemMode());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  // اعمال روی سند + پاک‌کردن استایل preboot که دیگر لازم نیست
  useEffect(() => {
    applyMode(mode);
    document.getElementById('taski-theme-preboot')?.remove();
  }, [mode]);

  const antdTheme = useMemo(() => buildAntdTheme(mode), [mode]);

  const ctx = useMemo<ThemeContextValue>(() => ({ pref, mode, setPref, toggle }), [pref, mode, setPref, toggle]);

  return (
    <ThemeContext.Provider value={ctx}>
      <ConfigProvider direction="rtl" locale={faIR} theme={antdTheme}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode باید داخل ThemeProvider استفاده شود');
  return ctx;
}
