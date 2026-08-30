import { useState } from 'react';
import { Alert, Button, Form, Input, Typography, App as AntApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { t } from '../lib/i18n';
import type { CurrentUser } from '../lib/auth-store';

export default function Register() {
  const setSession = useAuth((s) => s.setSession);
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { fullName: string; username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ accessToken: string; user: CurrentUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSession(res.accessToken, res.user);
    } catch (e) {
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
          {t('auth.register')}
        </Typography.Title>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 22px' }}>
          {t('app.title')}
        </p>

        <div aria-live="polite">
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        </div>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
          <Form.Item
            name="fullName"
            label="نام و نام خانوادگی"
            rules={[{ required: true, message: 'نام خود را وارد کنید.' }]}
          >
            <Input autoFocus placeholder="مثلاً: علی محمدی" />
          </Form.Item>
          <Form.Item
            name="username"
            label={t('auth.username')}
            rules={[
              { required: true, message: 'نام‌کاربری را وارد کنید.' },
              { pattern: /^[^\s@]{3,30}$/, message: '۳ تا ۳۰ نویسه، بدون فاصله و @.' },
            ]}
          >
            <Input dir="ltr" autoComplete="username" placeholder="مثلاً: ali" />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('auth.password')}
            extra="حداقل ۱۰ کاراکتر، شامل حرف و عدد."
            rules={[
              { required: true, message: 'رمز عبور را وارد کنید.' },
              { min: 10, message: 'رمز باید حداقل ۱۰ کاراکتر باشد.' },
              {
                pattern: /^(?=.*[a-zA-Z])(?=.*[0-9]).+$/,
                message: 'رمز باید هم حرف داشته باشد هم عدد.',
              },
            ]}
          >
            <Input.Password dir="ltr" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="تکرار رمز عبور"
            dependencies={['password']}
            rules={[
              { required: true, message: 'رمز عبور را دوباره وارد کنید.' },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  !value || getFieldValue('password') === value
                    ? Promise.resolve()
                    : Promise.reject(new Error('دو رمز یکی نیستند.')),
              }),
            ]}
          >
            <Input.Password dir="ltr" autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {t('auth.register')}
          </Button>
        </Form>

        <p style={{ color: 'var(--text-faint)', fontSize: 12, margin: '18px 0 0', textAlign: 'center' }}>
          {t('auth.haveAccount')}{' '}
          <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => nav('/login')}>
            {t('auth.login')}
          </Button>
        </p>
      </div>
    </main>
  );
}
