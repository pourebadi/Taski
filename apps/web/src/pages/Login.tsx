import { useState } from 'react';
import { Button, Card, Form, Input, Typography, App as AntApp } from 'antd';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { t } from '../lib/i18n';
import type { CurrentUser } from '../lib/auth-store';

export default function Login() {
  const setSession = useAuth((s) => s.setSession);
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await api<{ accessToken: string; user: CurrentUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSession(res.accessToken, res.user);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={4} style={{ textAlign: 'center' }}>
          {t('app.title')}
        </Typography.Title>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="email" label={t('auth.email')} rules={[{ required: true, message: 'ایمیل را وارد کنید.' }]}>
            <Input type="email" dir="ltr" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label={t('auth.password')} rules={[{ required: true, message: 'رمز عبور را وارد کنید.' }]}>
            <Input.Password dir="ltr" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {t('auth.login')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
