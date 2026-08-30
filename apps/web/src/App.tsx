import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { App as AntApp, Spin } from 'antd';
import { useAuth } from './lib/auth-store';
import { api } from './lib/api';
import { t } from './lib/i18n';
import type { CurrentUser } from './lib/auth-store';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Register from './pages/Register';
import ChangePassword from './pages/ChangePassword';
import MyWork from './pages/MyWork';
import Board from './pages/Board';
import Admin from './pages/Admin';
import Projects from './pages/Projects';
import WorkList from './pages/WorkList';
import Insights from './pages/Insights';

export default function App() {
  const user = useAuth((s) => s.user);
  const setSession = useAuth((s) => s.setSession);
  const [booting, setBooting] = useState(true);
  const prevUser = useRef<CurrentUser | null>(null);
  const { notification } = AntApp.useApp();

  /**
   * access token فقط در حافظه است، پس با هر رفرش صفحه از بین می‌رفت و کاربر
   * با وجود کوکی معتبر به صفحه ورود پرت می‌شد. اینجا یک بار نشست بازسازی می‌شود.
   */
  useEffect(() => {
    let cancelled = false;
    api<{ accessToken: string; user: CurrentUser }>('/auth/refresh', { method: 'POST' })
      .then((res) => {
        if (!cancelled && res?.accessToken && res.user) setSession(res.accessToken, res.user);
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  useEffect(() => {
    if (!booting && user && !prevUser.current) {
      notification.success({
        message: `${user.fullName}، ${t('auth.welcome')}!`,
        placement: 'topRight',
        duration: 4,
      });
    }
    prevUser.current = user;
  }, [user, booting, notification]);

  if (booting) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" aria-label="در حال بارگذاری" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // تغییر رمز اجباری، بقیه مسیرها را مسدود می‌کند. (PM-A4)
  if (user.mustChangePassword) {
    return (
      <Routes>
        <Route path="*" element={<ChangePassword forced />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/my-work" replace />} />
        <Route path="/my-work" element={<MyWork />} />
        <Route path="/board" element={<Board />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/work" element={<WorkList />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/admin" element={<Admin />} />
        {/* تغییر رمز داوطلبانه از منوی حساب کاربری */}
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="*" element={<Navigate to="/my-work" replace />} />
      </Routes>
    </AppShell>
  );
}
