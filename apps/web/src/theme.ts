import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    fontFamily: 'Vazirmatn, IRANSans, system-ui, sans-serif',
    colorPrimary: '#1c6758',
    borderRadius: 8,
    fontSize: 14,
  },
  components: {
    Layout: { headerBg: '#ffffff', siderBg: '#0f1f1b' },
    Menu: { darkItemBg: '#0f1f1b' },
  },
};
