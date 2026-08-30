import { Alert, Button, Card, Form, Input, App as AntApp } from 'antd';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { t } from '../lib/i18n';

export default function ChangePassword() {
  const { user, setSession, accessToken } = useAuth();
  const { message } = AntApp.useApp();

  const onFinish = async (values: { currentPassword: string; newPassword: string }) => {
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify(values) });
      setSession(accessToken!, { ...user!, mustChangePassword: false });
      message.success('رمز عبور تغییر کرد.');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <Card style={{ width: 420 }} title={t('auth.changePassword')}>
        <Alert type="warning" showIcon message={t('auth.mustChange')} style={{ marginBottom: 16 }} />
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="currentPassword" label="رمز فعلی" rules={[{ required: true }]}>
            <Input.Password dir="ltr" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="رمز جدید"
            rules={[{ required: true, min: 10, message: 'رمز باید حداقل ۱۰ کاراکتر باشد.' }]}
          >
            <Input.Password dir="ltr" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>{t('common.save')}</Button>
        </Form>
      </Card>
    </div>
  );
}
