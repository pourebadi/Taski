import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  App as AntApp,
} from 'antd';
import { DeleteOutlined, MoreOutlined, PlusOutlined, RollbackOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { options } from '../lib/terms';
import FieldLabel from '../components/FieldLabel';
import { Pill } from '../components/Badges';
import { faDigits } from '../lib/date';

type User = {
  id: string;
  fullName: string;
  username?: string | null;
  jobTitle?: string | null;
  role: string;
  status: string;
  weeklyCapacityHours?: number;
};

type Team = { id: string; name: string };

type DeletionQueueItem = {
  id: string;
  key: string;
  title: string;
  deletionReason: string | null;
  deletionReasonText: string | null;
  deletionRequestedById: string | null;
  previousState: string | null;
  lastActivityAt: string;
  project: { id: string; name: string } | null;
};

const STATUS: Record<string, { label: string; tone: 'ok' | 'warn' | 'unknown' }> = {
  ACTIVE: { label: 'فعال', tone: 'ok' },
  SUSPENDED: { label: 'معلق', tone: 'warn' },
  DISABLED: { label: 'غیرفعال', tone: 'unknown' },
};

export default function Admin() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offboarding, setOffboarding] = useState<User | null>(null);
  const [impact, setImpact] = useState<{ openOwned: number; openAssigned: number; pendingReviews: number } | null>(
    null,
  );
  const [reassignTo, setReassignTo] = useState<string | undefined>();
  const [queue, setQueue] = useState<DeletionQueueItem[]>([]);
  const [rejectTarget, setRejectTarget] = useState<DeletionQueueItem | null>(null);
  const [rejectText, setRejectText] = useState('');
  const [form] = Form.useForm();
  const { message, modal } = AntApp.useApp();

  const load = useCallback(() => {
    api<User[]>('/users').then(setUsers).catch(() => setUsers([]));
    api<Team[]>('/teams').then(setTeams).catch(() => setTeams([]));
    api<DeletionQueueItem[]>('/work-items/deletion-queue').then((r) => setQueue(r ?? [])).catch(() => setQueue([]));
  }, []);

  useEffect(load, [load]);

  const createUser = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await api<{ temporaryPassword: string }>('/users', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      // بدون SMTP: رمز موقت به ادمین نشان داده می‌شود تا دستی تحویل دهد. (D-003)
      modal.info({
        title: 'کاربر ساخته شد',
        content: (
          <div>
            <p style={{ marginTop: 0 }}>
              این رمز موقت را خودتان به او بدهید. اولین باری که وارد شود، مجبور است عوضش کند.
            </p>
            <Typography.Text code copyable dir="ltr" style={{ fontSize: 15 }}>
              {res.temporaryPassword}
            </Typography.Text>
          </div>
        ),
      });
      setOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await api(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      message.success(status === 'ACTIVE' ? 'حساب فعال شد.' : 'حساب غیرفعال شد.');
      load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const changeCapacity = async (id: string, hours: number | null) => {
    if (hours == null) return;
    try {
      await api(`/users/${id}/capacity`, { method: 'PATCH', body: JSON.stringify({ weeklyCapacityHours: hours }) });
      load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      await api(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      message.success('نقش عوض شد.');
      load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const resetPassword = async (row: User) => {
    try {
      const res = await api<{ temporaryPassword: string }>(`/users/${row.id}/reset-password`, {
        method: 'POST',
      });
      modal.info({
        title: `رمز تازه برای ${row.fullName}`,
        content: (
          <div>
            <p style={{ marginTop: 0 }}>نشست‌های باز این کاربر بسته شدند. رمز تازه را به او بدهید.</p>
            <Typography.Text code copyable dir="ltr" style={{ fontSize: 15 }}>
              {res.temporaryPassword}
            </Typography.Text>
          </div>
        ),
      });
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const openOffboarding = async (row: User) => {
    setOffboarding(row);
    setImpact(null);
    setReassignTo(undefined);
    try {
      setImpact(await api(`/users/${row.id}/offboarding-impact`));
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const doReassign = async () => {
    if (!offboarding || !reassignTo) return;
    try {
      await api(`/users/${offboarding.id}/reassign-to/${reassignTo}`, { method: 'POST' });
      message.success('همه‌ی کارها منتقل شد و در تاریخچه‌ی هر کار ثبت ماند.');
      setOffboarding(null);
      load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const confirmDeleteUser = (row: User) => {
    modal.confirm({
      title: t('deletion.deleteUser'),
      content: t('deletion.confirmDeleteUser'),
      okText: t('deletion.deleteUser'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await api(`/users/${row.id}`, { method: 'DELETE' });
          message.success('کاربر حذف شد.');
          load();
        } catch (e) {
          message.error((e as Error).message);
        }
      },
    });
  };

  const approveDelete = async (item: DeletionQueueItem) => {
    try {
      await api(`/work-items/${item.id}`, { method: 'DELETE' });
      message.success(`«${item.key}» حذف شد.`);
      load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const doRejectDelete = async () => {
    if (!rejectTarget || !rejectText.trim()) return;
    try {
      await api(`/work-items/${rejectTarget.id}/reject-delete`, {
        method: 'POST',
        body: JSON.stringify({ explanation: rejectText.trim() }),
      });
      message.success('درخواست حذف رد شد و کار برگردانده شد.');
      setRejectTarget(null);
      setRejectText('');
      load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('nav.admin')}</h1>
          <p className="page-subtitle">
            {users ? `${faDigits(users.length)} کاربر` : 'در حال بارگذاری…'}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          کاربر جدید
        </Button>
      </div>

      <Tabs
        items={[
          {
            key: 'users',
            label: t('deletion.users'),
            children: (
              <>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="سمت سازمانی هیچ دسترسی‌ای نمی‌دهد؛ فقط نقش نرم‌افزاری تعیین‌کننده است."
                />
                <Card styles={{ body: { padding: 0 } }}>
        {!users ? (
          <div style={{ padding: 20 }}>
            <Skeleton active />
          </div>
        ) : (
          <Table<User>
            rowKey="id"
            dataSource={users}
            pagination={false}
            scroll={{ x: 700 }}
            columns={[
              {
                title: 'نام',
                dataIndex: 'fullName',
                render: (v, row) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-faint)', direction: 'ltr', textAlign: 'start' }}>
                      @{row.username}
                    </div>
                  </div>
                ),
              },
              {
                title: 'سمت سازمانی',
                dataIndex: 'jobTitle',
                width: 160,
                render: (v) => v ?? '—',
              },
              {
                title: 'نقش نرم‌افزاری',
                dataIndex: 'role',
                width: 170,
                render: (role, row) => (
                  <Select
                    size="small"
                    variant="borderless"
                    value={role}
                    style={{ width: 150 }}
                    aria-label={`نقش ${row.fullName}`}
                    onChange={(next) => changeRole(row.id, next)}
                    options={options('role')}
                  />
                ),
              },
              {
                title: <FieldLabel label="ظرفیت (ساعت/هفته)" helpKey="weeklyCapacity" />,
                dataIndex: 'weeklyCapacityHours',
                width: 130,
                render: (h, row) => (
                  <InputNumber
                    size="small"
                    min={0}
                    max={80}
                    defaultValue={h ?? 40}
                    style={{ width: 72 }}
                    aria-label={`ظرفیت ${row.fullName}`}
                    onBlur={(e) => {
                      const v = Number((e.target as HTMLInputElement).value);
                      if (Number.isFinite(v) && v !== (h ?? 40)) changeCapacity(row.id, v);
                    }}
                  />
                ),
              },
              {
                title: 'وضعیت',
                dataIndex: 'status',
                width: 100,
                render: (s) => <Pill tone={STATUS[s]?.tone ?? 'unknown'}>{STATUS[s]?.label ?? s}</Pill>,
              },
              {
                title: <span className="sr-only">عملیات</span>,
                width: 56,
                render: (_, row) => (
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'reset', label: 'رمز تازه بساز', onClick: () => resetPassword(row) },
                        { key: 'offboard', label: 'انتقال همه کارها (خروج از تیم)', onClick: () => openOffboarding(row) },
                        { type: 'divider' },
                        row.status === 'ACTIVE'
                          ? {
                              key: 'disable',
                              danger: true,
                              label: 'غیرفعال کردن حساب',
                              onClick: () => changeStatus(row.id, 'DISABLED'),
                            }
                          : { key: 'enable', label: 'فعال کردن حساب', onClick: () => changeStatus(row.id, 'ACTIVE') },
                        { type: 'divider' },
                        {
                          key: 'delete',
                          danger: true,
                          label: t('deletion.deleteUser'),
                          onClick: () => confirmDeleteUser(row),
                        },
                      ],
                    }}
                  >
                    <Button type="text" icon={<MoreOutlined />} aria-label={`عملیات ${row.fullName}`} />
                  </Dropdown>
                ),
              },
            ]}
          />
        )}
      </Card>
              </>
            ),
          },
          {
            key: 'deletion-queue',
            label: <Badge count={queue.length} offset={[8, 0]} size="small">{t('deletion.queue')}</Badge>,
            children: queue.length === 0 ? (
              <Empty description={t('deletion.noItems')} />
            ) : (
              <Card styles={{ body: { padding: 0 } }}>
                <Table<DeletionQueueItem>
                  rowKey="id"
                  dataSource={queue}
                  pagination={false}
                  columns={[
                    {
                      title: 'کار',
                      render: (_, row) => (
                        <div>
                          <Tag>{row.key}</Tag> {row.title}
                        </div>
                      ),
                    },
                    {
                      title: 'پروژه',
                      width: 140,
                      render: (_, row) => row.project?.name ?? t('common.noProject'),
                    },
                    {
                      title: t('deletion.reason'),
                      width: 160,
                      render: (_, row) => (
                        <div>
                          <div>{t(`deletion.reason.${row.deletionReason}`)}</div>
                          {row.deletionReasonText && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{row.deletionReasonText}</div>
                          )}
                        </div>
                      ),
                    },
                    {
                      title: 'وضعیت قبلی',
                      dataIndex: 'previousState',
                      width: 130,
                      render: (v) => v ? t(`state.${v}`) : '—',
                    },
                    {
                      title: <span className="sr-only">عملیات</span>,
                      width: 180,
                      render: (_, row) => (
                        <Space>
                          <Button
                            type="primary"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => approveDelete(row)}
                          >
                            {t('deletion.approve')}
                          </Button>
                          <Button
                            size="small"
                            icon={<RollbackOutlined />}
                            onClick={() => { setRejectTarget(row); setRejectText(''); }}
                          >
                            {t('deletion.reject')}
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* واگذاری پیش از خروج — API از قبل بود ولی هیچ دکمه‌ای نداشت */}
      <Modal
        open={!!offboarding}
        title={`انتقال همه کارهای ${offboarding?.fullName ?? ''}`}
        onCancel={() => setOffboarding(null)}
        onOk={doReassign}
        okButtonProps={{ disabled: !reassignTo, danger: true }}
        okText="انتقال بده"
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        {!impact ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <>
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 14 }}
              message="این کار برای وقتی است که کسی از تیم می‌رود یا مرخصی طولانی دارد."
              description="همه‌ی کارهای باز این نفر یک‌جا به فرد دیگری منتقل می‌شود و در دفتر تغییرات هر کار ثبت می‌ماند. می‌خواهید فقط یک کار را واگذار کنید؟ آن کار را باز کنید و «مجری» را بزنید."
            />
            <Space size="large" style={{ marginBottom: 16 }}>
              <span>
                مالکِ <strong className="tabular">{faDigits(impact.openOwned)}</strong> کار باز
              </span>
              <span>
                مجریِ <strong className="tabular">{faDigits(impact.openAssigned)}</strong> کار باز
              </span>
              <span>
                <strong className="tabular">{faDigits(impact.pendingReviews)}</strong> بازبینی معلق
              </span>
            </Space>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="همه به این نفر واگذار شود"
              aria-label="گیرنده‌ی کارها"
              value={reassignTo}
              onChange={setReassignTo}
              options={(users ?? [])
                .filter((u) => u.id !== offboarding?.id && u.status === 'ACTIVE')
                .map((u) => ({ value: u.id, label: u.fullName }))}
            />
          </>
        )}
      </Modal>

      <Modal
        open={open}
        title="کاربر جدید"
        onCancel={() => setOpen(false)}
        onOk={createUser}
        confirmLoading={saving}
        destroyOnClose
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="fullName"
            label={<FieldLabel label="نام و نام خانوادگی" help="همان‌طور که در تیم صدایش می‌کنید." />}
            rules={[{ required: true, message: 'نام را وارد کنید.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="username"
            label={t('auth.username')}
            rules={[
              { required: true, message: 'نام‌کاربری را وارد کنید.' },
              { pattern: /^[^\s@]{3,30}$/, message: '۳ تا ۳۰ نویسه، بدون فاصله و @.' },
            ]}
          >
            <Input dir="ltr" placeholder="ali" />
          </Form.Item>
          <Form.Item name="jobTitle" label={<FieldLabel label="سمت سازمانی" helpKey="jobTitle" />}>
            <Input placeholder="مثلاً هد بک‌اند" />
          </Form.Item>
          <Form.Item
            name="role"
            label={<FieldLabel label="نقش نرم‌افزاری" helpKey="appRole" />}
            rules={[{ required: true }]}
            initialValue="CONTRIBUTOR"
          >
            <Select options={options('role')} />
          </Form.Item>
          <Form.Item name="primaryTeamId" label={<FieldLabel label="تیم اصلی" helpKey="primaryTeam" />}>
            <Select allowClear options={teams.map((team) => ({ value: team.id, label: team.name }))} />
          </Form.Item>
          <Form.Item
            name="weeklyCapacityHours"
            label={<FieldLabel label="ظرفیت هفتگی (ساعت)" helpKey="weeklyCapacity" />}
            initialValue={40}
          >
            <InputNumber min={0} max={80} style={{ width: '100%' }} addonAfter="ساعت در هفته" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!rejectTarget}
        title={`${t('deletion.reject')}: ${rejectTarget?.key ?? ''}`}
        onCancel={() => setRejectTarget(null)}
        onOk={doRejectDelete}
        okButtonProps={{ disabled: !rejectText.trim() }}
        okText={t('deletion.reject')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <p style={{ marginTop: 0 }}>{t('deletion.rejectExplanation')}</p>
        <Input.TextArea
          rows={3}
          value={rejectText}
          onChange={(e) => setRejectText(e.target.value)}
          placeholder={t('deletion.rejectExplanation')}
        />
      </Modal>
    </>
  );
}
