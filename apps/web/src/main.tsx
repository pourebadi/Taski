import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider, initThemeSync } from './theme/ThemeProvider';
import './styles.css';

// دیگر هیچ پلاگین تقویمی روی dayjs سوار نمی‌شود. تبدیل شمسی در
// lib/jalali.ts روی Intl انجام می‌شود، پس تضاد پلاگین‌ها ممکن نیست.

// تم را پیش از اولین رنگ‌آمیزی اعمال می‌کنیم تا پرشِ روشن‌به‌تیره رخ ندهد.
initThemeSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* RTL، لوکال فارسی رسمی antd و تمِ روشن/تیره همه در ThemeProvider */}
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
