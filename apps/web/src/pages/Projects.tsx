import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  App as AntApp,
} from 'antd';
import JalaliDatePicker from '../components/JalaliDatePicker';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import FieldLabel from '../components/FieldLabel';
import { Pill, StateBadge } from '../components/Badges';
import { toJalali, faDigits } from '../lib/date';

type Project = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  status: string;
  targetDate?: string | null;
};

type ProjectDetail = Project & {
  members: { id: string; userId: string; role: string }[];
  stateCounts: { workflowState: string; _count: number }[];
};

const STATUS: Record<string, { label: string; tone: 'ok' | 'warn' | 'danger' | 'unknown' | 'brand' }> = {
  ACTIVE: { label: 'فعال', tone: 'brand' },
  ON_HOLD: { label: 'متوقف', tone: 'warn' },
  DONE: { label: 'تمام‌شده', tone: 'ok' },
  CANCELLED: { label: 'لغو شده', tone: 'unknown' },
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

  const load = useCallback(() => {
    api<Project[]>('/projects').then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(load, [load]);
  useEffect(() => {
    api<any[]>('/users').then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    setDetail(null);
    if (!detailId) return;
    api<ProjectDetail>(`/projects/${detailId}`).then(setDetail).catch(() => setDetail(null));
  }, [detailId]);

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await api('/projects', {
        method: 'POST',
        body: JSON.stringify({
          ...v,
          targetDate: v.targetDate ? v.targetDate.toDate().toISOString() : null,
        }),
      });
      message.success('پروژه ساخته شد.');
      form.resetFields();
      setOpen(false);
      load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const doneRatio = (d: ProjectDetail) => {
    const total = d.stateCounts.reduce((s, c) => s + c._count, 0);
    const done = d.stateCounts.find((c) => c.workflowState === 'DONE')?._count ?? 0;
    return total ? Math.round((done / total) * 100) : 0;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('nav.projects')}</h1>
          <p className="page-subtitle">کلید پروژه، پیشوند کلید کارهای آن پروژه می‌شود.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          پروژه جدید
        </Button>
      </div>

      {!projects ? (
        <Skeleton active />
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <span>هنوز پروژه‌ای نساخته‌اید.</span>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            کار بدون پروژه هم مجاز است، ولی پروژه کمک می‌کند کارها را گروه‌بندی کنید.
          </span>
          <Button type="primary" onClick={() => setOpen(true)}>
            اولین پروژه را بسازید
          </Button>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {projects.map((p) => (
            <Col key={p.id} xs={24} md={12} xl={8}>
              <Card
                hoverable
                onClick={() => setDetailId(p.id)}
                styles={{ body: { padding: 18 } }}
                style={{ height: '100%', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className="key-tag" style={{ fontWeight: 700, color: 'var(--brand)' }}>
                    {p.key}
                  </span>
                  <span style={{ flex: 1 }} />
                  <Pill tone={STATUS[p.status]?.tone ?? 'unknown'}>
                    {STATUS[p.status]?.label ?? p.status}
                  </Pill>
                </div>

                <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>{p.name}</h2>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    margin: 0,
                    minHeight: 40,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {p.description || 'بدون توضیح'}
                </p>

                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--line)',
                    fontSize: 12,
                    color: 'var(--text-faint)',
                  }}
                >
                  تاریخ هدف: <span className="tabular">{faDigits(toJalali(p.targetDate))}</span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Drawer
        open={!!detailId}
        onClose={() => setDetailId(null)}
        width={460}
        title={detail ? `${detail.key} — ${detail.name}` : 'پروژه'}
      >
        {!detail ? (
          <Skeleton active />
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                پیشرفت
              </div>
              <Progress percent={doneRatio(detail)} strokeColor="var(--brand)" />
            </div>

            <div style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                کارها در هر مرحله
              </div>
              {detail.stateCounts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>هنوز کاری در این پروژه نیست.</p>
              ) : (
                <Space wrap>
                  {detail.stateCounts.map((c) => (
                    <span key={c.workflowState} style={{ display: 'inline-flex', gap: 5 }}>
                      <StateBadge state={c.workflowState} />
                      <span className="board-count">{faDigits(c._count)}</span>
                    </span>
                  ))}
                </Space>
              )}
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                اعضا
              </div>
              {detail.members.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>عضوی ثبت نشده.</p>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {detail.members.map((m) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>{users.find((u) => u.id === m.userId)?.fullName ?? m.userId}</span>
                      <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>
                        {m.role === 'PROJECT_LEAD' ? 'سرپرست پروژه' : 'عضو'}
                      </span>
                    </div>
                  ))}
                </Space>
              )}
            </div>
          </>
        )}
      </Drawer>

      <Modal
        open={open}
        title="پروژه جدید"
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        destroyOnClose
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="key"
            label="کلید پروژه"
            extra="پیشوند کلید کارها، مثلاً BE برای بک‌اند. بعداً قابل تغییر نیست."
            rules={[
              { required: true, message: 'کلید پروژه را وارد کنید.' },
              { pattern: /^[A-Za-z]{2,6}$/, message: '۲ تا ۶ حرف انگلیسی، مثل IPX.' },
            ]}
          >
            <Input dir="ltr" placeholder="BE" />
          </Form.Item>
          <Form.Item
            name="name"
            label={<FieldLabel label="نام پروژه" help="اسمی که تیم با آن صدایش می‌کند." />}
            rules={[{ required: true, message: 'نام پروژه را وارد کنید.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="ownerId" label={<FieldLabel label="مالک پروژه" helpKey="owner" />}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="اگر خالی بماند، خودتان مالک می‌شوید"
              options={users.map((u) => ({ value: u.id, label: u.fullName }))}
            />
          </Form.Item>
          <Form.Item name="description" label="توضیح">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="targetDate" label={<FieldLabel label="تاریخ هدف" helpKey="projectTarget" />}>
            <JalaliDatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
