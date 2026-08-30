import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import faIR from 'antd/locale/fa_IR';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { theme } from './theme';
import './styles.css';

// دیگر هیچ پلاگین تقویمی روی dayjs سوار نمی‌شود. تبدیل شمسی در
// lib/jalali.ts روی Intl انجام می‌شود، پس تضاد پلاگین‌ها ممکن نیست.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* RTL و لوکال فارسی رسمی antd — چیدمان، آیکون‌ها و متن‌های داخلی همه معکوس/فارسی می‌شوند */}
    <ConfigProvider direction="rtl" locale={faIR} theme={theme}>
            <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
