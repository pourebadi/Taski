import { useState } from 'react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { t } from '../lib/i18n';
import type { CurrentUser } from '../lib/auth-store';

export default function Login() {
  const setSession = useAuth((s) => s.setSession);
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ accessToken: string; user: CurrentUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSession(res.accessToken, res.user);
    } catch (e) {
      // خطا داخل صفحه می‌ماند نه در یک toast گذرا، چون کاربر باید بتواند
      // بخواندش و دوباره تلاش کند. aria-live آن را برای صفحه‌خوان اعلام می‌کند.
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-mark" aria-hidden="true">
          اج
        </div>
        <Typography.Title level={3} style={{ margin: 0, fontSize: 21, letterSpacing: '-0.01em' }}>
          {t('app.title')}
        </Typography.Title>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 22px' }}>
          برای دیدن کارها و تعهدهای تیم وارد شوید.
        </p>

        <div aria-live="polite">
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        </div>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
          <Form.Item
            name="username"
            label="نام‌کاربری"
            rules={[{ required: true, message: 'نام‌کاربری را وارد کنید.' }]}
          >
            <Input dir="ltr" autoComplete="username" autoFocus placeholder="مثلاً: ali" />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('auth.password')}
            rules={[{ required: true, message: 'رمز عبور را وارد کنید.' }]}
          >
            <Input.Password dir="ltr" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {t('auth.login')}
          </Button>
        </Form>

        <p style={{ color: 'var(--text-faint)', fontSize: 12, margin: '18px 0 0', textAlign: 'center' }}>
          {t('auth.noAccount')}{' '}
          <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => nav('/register')}>
            {t('auth.register')}
          </Button>
        </p>
      </div>
    </main>
  );
}
