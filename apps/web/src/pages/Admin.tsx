import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography, App as AntApp, Alert } from 'antd';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import FieldLabel from '../components/FieldLabel';

type User = {
  id: string;
  fullName: string;
  email: string;
  jobTitle?: string | null;
  role: string;
  status: string;
};

type Team = { id: string; name: string };

const ROLE_LABEL: Record<string, string> = {
  ORG_OWNER: 'مالک سازمان',
  ADMIN: 'مدیر سیستم',
  PROJECT_MANAGER: 'مدیر پروژه',
  TEAM_LEAD: 'سرپرست تیم',
  CONTRIBUTOR: 'عضو اجرایی',
  REQUESTER: 'درخواست‌دهنده',
  VIEWER: 'مشاهده‌گر',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'فعال',
  SUSPENDED: 'معلق',
  DISABLED: 'غیرفعال',
};

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { message, modal } = AntApp.useApp();

  const load = () => {
    api<User[]>('/users').then(setUsers).catch(() => setUsers([]));
    api<Team[]>('/teams').then(setTeams).catch(() => setTeams([]));
  };
  useEffect(load, []);

  const createUser = async () => {
    const values = await form.validateFields();
    try {
      const res = await api<{ temporaryPassword: string; email: string }>('/users', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      // بدون SMTP: رمز موقت به ادمین نشان داده می‌شود تا دستی تحویل دهد. (D-003)
      modal.info({
        title: 'کاربر ساخته شد',
        content: (
          <div>
            <p>این رمز موقت را خودت دستی به او بده. اولین باری که وارد شود، مجبور است عوضش کند.</p>
            <Typography.Text code copyable dir="ltr">{res.temporaryPassword}</Typography.Text>
          </div>
        ),
      });
      setOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await api(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('nav.admin')}</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>کاربر جدید</Button>
      </Space>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="سمت سازمانی هیچ دسترسی‌ای نمی‌دهد؛ فقط نقش نرم‌افزاری تعیین‌کننده است."
      />

      <Table<User>
        rowKey="id"
        dataSource={users}
        pagination={false}
        columns={[
          { title: 'نام', dataIndex: 'fullName' },
          { title: 'ایمیل', dataIndex: 'email', render: (v) => <span dir="ltr">{v}</span> },
          { title: 'سمت سازمانی', dataIndex: 'jobTitle', render: (v) => v ?? '—' },
          { title: 'نقش نرم‌افزاری', dataIndex: 'role', render: (r) => <Tag>{ROLE_LABEL[r] ?? r}</Tag> },
          {
            title: 'وضعیت',
            dataIndex: 'status',
            render: (s) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{STATUS_LABEL[s] ?? s}</Tag>,
          },
          {
            title: '',
            render: (_, row) => (
              <Space>
                {row.status === 'ACTIVE' ? (
                  <Button size="small" danger onClick={() => changeStatus(row.id, 'DISABLED')}>
                    غیرفعال
                  </Button>
                ) : (
                  <Button size="small" onClick={() => changeStatus(row.id, 'ACTIVE')}>فعال</Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title="کاربر جدید"
        onCancel={() => setOpen(false)}
        onOk={createUser}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="fullName" label={<FieldLabel label="نام و نام خانوادگی" help="همان‌طور که در تیم صدایش می‌کنید." />} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label={t('auth.email')} rules={[{ required: true, type: 'email' }]}>
            <Input dir="ltr" />
          </Form.Item>
          <Form.Item name="jobTitle" label={<FieldLabel label="سمت سازمانی" helpKey="jobTitle" />}>
            <Input placeholder="مثلاً هد بک‌اند" />
          </Form.Item>
          <Form.Item name="role" label={<FieldLabel label="نقش نرم‌افزاری" helpKey="appRole" />} rules={[{ required: true }]} initialValue="CONTRIBUTOR">
            <Select options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="primaryTeamId" label={<FieldLabel label="تیم اصلی" helpKey="primaryTeam" />}>
            <Select allowClear options={teams.map((t) => ({ value: t.id, label: t.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
