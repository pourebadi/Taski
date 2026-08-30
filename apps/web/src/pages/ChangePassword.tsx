import { useState } from 'react';
import { Alert, Button, Card, Form, Input, App as AntApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { t } from '../lib/i18n';

/**
 * دو حالت: اجباری (اولین ورود) و داوطلبانه (از منوی حساب کاربری).
 * در حالت اجباری هیچ راه فراری نیست؛ در حالت داوطلبانه دکمه‌ی انصراف هست.
 */
export default function ChangePassword({ forced = false }: { forced?: boolean }) {
  const { user, setSession, accessToken } = useAuth();
  const { message } = AntApp.useApp();
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { currentPassword: string; newPassword: string }) => {
    setSaving(true);
    setError(null);
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify(values) });
      setSession(accessToken!, { ...user!, mustChangePassword: false });
      message.success('رمز عبور عوض شد.');
      if (!forced) nav('/my-work');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <>
      {forced && (
        <Alert type="warning" showIcon message={t('auth.mustChange')} style={{ marginBottom: 16 }} />
      )}
      <div aria-live="polite">
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      </div>
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="currentPassword"
          label="رمز فعلی"
          rules={[{ required: true, message: 'رمز فعلی را وارد کنید.' }]}
        >
          <Input.Password dir="ltr" autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="رمز جدید"
          extra="حداقل ۱۰ کاراکتر، شامل حرف و عدد."
          rules={[
            { required: true, message: 'رمز جدید را وارد کنید.' },
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
          label="تکرار رمز جدید"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'رمز جدید را دوباره وارد کنید.' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('newPassword') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error('دو رمز یکی نیستند.')),
            }),
          ]}
        >
          <Input.Password dir="ltr" autoComplete="new-password" />
        </Form.Item>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" htmlType="submit" loading={saving} block>
            {t('common.save')}
          </Button>
          {!forced && (
            <Button onClick={() => nav(-1)} block>
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </Form>
    </>
  );

  // در حالت اجباری صفحه‌ی مستقل است، چون هنوز داخل پوسته‌ی برنامه نیستیم.
  if (forced) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <div className="auth-mark" aria-hidden="true">
            اج
          </div>
          <h1 style={{ fontSize: 19, margin: '0 0 18px' }}>{t('auth.changePassword')}</h1>
          {body}
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('auth.changePassword')}</h1>
          <p className="page-subtitle">بعد از تغییر رمز، نشست‌های دیگر شما بسته می‌شوند.</p>
        </div>
      </div>
      <Card style={{ maxWidth: 460 }}>{body}</Card>
    </>
  );
}
