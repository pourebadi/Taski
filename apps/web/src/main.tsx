import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import faIR from 'antd/locale/fa_IR';
import { JalaliLocaleListener } from 'antd-jalali-plus';
import { BrowserRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import jalaliday from 'jalaliday';
import App from './App';
import { theme } from './theme';
import './styles.css';

// تقویم جلالی سراسری. ذخیره‌سازی همیشه UTC می‌ماند. (D-002، D-010)
dayjs.extend(jalaliday);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* RTL و لوکال فارسی رسمی antd — چیدمان، آیکون‌ها و متن‌های داخلی همه معکوس/فارسی می‌شوند */}
    <ConfigProvider direction="rtl" locale={faIR} theme={theme}>
      <JalaliLocaleListener />
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
