import { useState } from 'react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { t } from '../lib/i18n';
import type { CurrentUser } from '../lib/auth-store';

export default function Register() {
  const setSession = useAuth((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { fullName: string; username: string; password: string; confirm: string }) => {
    if (values.password !== values.confirm) {
      setError('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ accessToken: string; user: CurrentUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: values.fullName,
          username: values.username,
          password: values.password,
        }),
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
          یک حساب کاربری برای خودتان بسازید.
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
            <Input autoFocus placeholder="مثلاً: علی احمدی" />
          </Form.Item>
          <Form.Item
            name="username"
            label={t('auth.username')}
            rules={[
              { required: true, message: 'نام‌کاربری را وارد کنید.' },
              { min: 3, message: 'نام‌کاربری حداقل ۳ نویسه.' },
              { max: 30, message: 'نام‌کاربری حداکثر ۳۰ نویسه.' },
              { pattern: /^[^\s@]+$/, message: 'نام‌کاربری نباید فاصله یا @ داشته باشد.' },
            ]}
          >
            <Input dir="ltr" autoComplete="username" placeholder="مثلاً: ali" />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('auth.password')}
            rules={[
              { required: true, message: 'رمز عبور را وارد کنید.' },
              { min: 10, message: 'رمز عبور باید حداقل ۱۰ کاراکتر باشد.' },
            ]}
          >
            <Input.Password dir="ltr" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="تکرار رمز عبور"
            dependencies={['password']}
            rules={[
              { required: true, message: 'تکرار رمز عبور را وارد کنید.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('رمز عبور و تکرار آن یکسان نیستند.'));
                },
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
          {t('auth.haveAccount')} <Link to="/login">{t('auth.login')}</Link>
        </p>
      </div>
    </main>
  );
}
