import { useEffect, useState } from 'react';
import {
  Button,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  App as AntApp,
} from 'antd';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { toJalali, faDigits } from '../lib/date';
import CommitmentModal from './CommitmentModal';
import TrackedChangeModal, { TrackedChange } from './TrackedChangeModal';
import FieldLabel from './FieldLabel';
import type { WorkItem } from './WorkItemCard';

type Commitment = {
  id: string;
  versionNo: number;
  changeKind: string;
  previousEta?: string | null;
  newEta?: string | null;
  deltaWorkingDays?: number | null;
  reasonType: string;
  reasonText?: string | null;
  createdAt: string;
  changedBy: { fullName: string };
};

type ChangeRecord = {
  id: string;
  field: string;
  fromValue?: string | null;
  toValue?: string | null;
  reasonType: string;
  reasonText?: string | null;
  createdAt: string;
  changedBy: { fullName: string };
};

type Detail = {
  item: WorkItem & {
    description?: string | null;
    firstCommittedEta?: string | null;
    activeBaselineEta?: string | null;
    etaConfidence?: string | null;
    etaAssumptions?: string | null;
    dueDate?: string | null;
    requiresReview: boolean;
  };
  commitments: Commitment[];
  changes: ChangeRecord[];
  activities: { id: string; action: string; fromValue?: string | null; toValue?: string | null; createdAt: string; actor?: { fullName: string } | null }[];
  comments: { id: string; body: string; createdAt: string; author: { fullName: string } }[];
  metrics: {
    etaShiftCount: number;
    lastShiftWorkingDays: number | null;
    cumulativeMovementWorkingDays: number;
    driftFromFirstBaseline: number | null;
  };
};


const FIELD_LABEL: Record<string, string> = {
  PRIORITY: 'اولویت',
  DUE_DATE: 'مهلت',
  ASSIGNEE: 'مجری',
  OWNER: 'مالک',
  REVIEWER: 'بازبین',
  CANCEL: 'لغو کار',
};

export default function WorkItemDrawer({
  id,
  open,
  onClose,
  onChanged,
}: {
  id: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [etaOpen, setEtaOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [healthDraft, setHealthDraft] = useState<{ health: string; note: string } | null>(null);
  const [tracked, setTracked] = useState<TrackedChange | null>(null);
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const { message } = AntApp.useApp();

  const load = () => {
    if (!id) return;
    api<Detail>(`/work-items/${id}`).then(setData).catch(() => setData(null));
  };
  useEffect(load, [id]);
  useEffect(() => {
    api<any[]>('/users').then(setUsers).catch(() => setUsers([]));
  }, []);

  // برای «در خطر» و «مسدود» سرور توضیح اجباری می‌خواهد؛ با مودال می‌گیریم نه prompt مرورگر
  const changeHealth = (health: string) => {
    if (health === 'AT_RISK' || health === 'BLOCKED') {
      setHealthDraft({ health, note: '' });
      return;
    }
    void submitHealth(health);
  };

  const submitHealth = async (health: string, note?: string) => {
    try {
      await api(`/work-items/${id}/health`, { method: 'PATCH', body: JSON.stringify({ health, note }) });
      setHealthDraft(null);
      load();
      onChanged();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    await api(`/work-items/${id}/comments`, { method: 'POST', body: JSON.stringify({ body: comment }) });
    setComment('');
    load();
  };

  if (!data) return <Drawer open={open} onClose={onClose} width={720} />;
  const { item, metrics } = data;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={
        <Space>
          <Typography.Text type="secondary" dir="ltr">{item.key}</Typography.Text>
          <span>{item.title}</span>
        </Space>
      }
      extra={
        <Space>
          <Button onClick={() => setTracked('PRIORITY')}>اولویت</Button>
          <Button onClick={() => setTracked('ASSIGNEE')}>واگذاری</Button>
          <Button danger onClick={() => setTracked('CANCEL')}>لغو</Button>
          <Button type="primary" onClick={() => setEtaOpen(true)}>
            {t('eta.change')}
          </Button>
        </Space>
      }
    >
      <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label={t('state.' + item.workflowState)}>
          <Tag>{t(`state.${item.workflowState}`)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={<FieldLabel label="سلامت تحویل" helpKey="deliveryHealth" />}>
          {/* دو محور مستقل: تغییر سلامت وضعیت اجرا را عوض نمی‌کند */}
          <Select
            size="small"
            value={item.deliveryHealth}
            style={{ width: 130 }}
            onChange={changeHealth}
            options={['ON_TRACK', 'AT_RISK', 'BLOCKED', 'UNKNOWN'].map((h) => ({
              value: h,
              label: t(`health.${h}`),
            }))}
          />
        </Descriptions.Item>
        <Descriptions.Item label={<FieldLabel label={t('eta.baseline')} helpKey="baseline" />}>
          {faDigits(toJalali(item.firstCommittedEta))}
        </Descriptions.Item>
        <Descriptions.Item label={t('eta.current')}>
          {faDigits(toJalali(item.currentEta))}
        </Descriptions.Item>
        <Descriptions.Item label={t('eta.estimateHours')}>
          {item.estimateHours ? faDigits(item.estimateHours) : '—'}
        </Descriptions.Item>
        <Descriptions.Item label={<FieldLabel label="نیاز به بازبینی" helpKey="requiresReview" />}>
          {item.requiresReview ? 'بله' : 'خیر'}
        </Descriptions.Item>
      </Descriptions>

      <Space size="large" style={{ marginBottom: 16 }}>
        <Statistic title={<FieldLabel label={t('eta.shiftCount')} helpKey="shiftCount" />} value={metrics.etaShiftCount} />
        <Statistic
          title={<FieldLabel label={t('eta.drift')} helpKey="drift" />}
          value={metrics.driftFromFirstBaseline ?? 0}
          suffix={t('common.days')}
          valueStyle={{ color: (metrics.driftFromFirstBaseline ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
        />
        <Statistic
          title={<FieldLabel label="مجموع جابه‌جایی" helpKey="cumulativeMovement" />}
          value={metrics.cumulativeMovementWorkingDays}
          suffix={t('common.days')}
        />
      </Space>

      <Tabs
        items={[
          {
            key: 'commitments',
            label: 'تاریخچه تعهد',
            children: (
              <Table<Commitment>
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={data.commitments}
                columns={[
                  { title: 'نسخه', dataIndex: 'versionNo', render: (v) => faDigits(v) },
                  { title: 'از', dataIndex: 'previousEta', render: (v) => faDigits(toJalali(v)) },
                  { title: 'به', dataIndex: 'newEta', render: (v) => faDigits(toJalali(v)) },
                  {
                    title: t('common.days'),
                    dataIndex: 'deltaWorkingDays',
                    render: (v: number | null) =>
                      v == null ? '—' : <Tag color={v > 0 ? 'red' : 'green'}>{faDigits(v)}</Tag>,
                  },
                  { title: t('eta.reason'), dataIndex: 'reasonType', render: (r) => t(`reason.${r}`) },
                  { title: 'ثبت‌کننده', dataIndex: ['changedBy', 'fullName'] },
                ]}
              />
            ),
          },
          {
            key: 'changes',
            label: 'دفتر تغییرات',
            children: data.changes?.length ? (
              <Table<ChangeRecord>
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={data.changes}
                columns={[
                  { title: 'چه چیزی', dataIndex: 'field', render: (f) => FIELD_LABEL[f] ?? f },
                  { title: 'از', dataIndex: 'fromValue', render: (v) => v ?? '—' },
                  { title: 'به', dataIndex: 'toValue', render: (v) => v ?? '—' },
                  { title: 'چرا', dataIndex: 'reasonType', render: (r) => t(`reason.${r}`) },
                  { title: 'توضیح', dataIndex: 'reasonText', render: (v) => v ?? '—' },
                  { title: 'کی', dataIndex: ['changedBy', 'fullName'] },
                ]}
              />
            ) : (
              <Typography.Text type="secondary">
                هنوز اولویت، مهلت یا مجری این کار عوض نشده.
              </Typography.Text>
            ),
          },
          {
            key: 'comments',
            label: 'دیدگاه‌ها',
            children: (
              <>
                <Timeline
                  items={data.comments.map((c) => ({
                    children: (
                      <>
                        <Typography.Text strong>{c.author.fullName}</Typography.Text>{' '}
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {faDigits(toJalali(c.createdAt, 'YYYY/MM/DD HH:mm'))}
                        </Typography.Text>
                        <div>{c.body}</div>
                      </>
                    ),
                  }))}
                />
                <Space.Compact style={{ width: '100%' }}>
                  <Input value={comment} onChange={(e) => setComment(e.target.value)} onPressEnter={submitComment} />
                  <Button type="primary" onClick={submitComment}>ثبت</Button>
                </Space.Compact>
              </>
            ),
          },
          {
            key: 'activity',
            label: 'فعالیت',
            children: (
              <Timeline
                items={data.activities.map((a) => ({
                  children: (
                    <>
                      <Typography.Text>{a.actor?.fullName ?? 'سیستم'}</Typography.Text>{' '}
                      <Tag>{a.action}</Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {faDigits(toJalali(a.createdAt, 'YYYY/MM/DD HH:mm'))}
                      </Typography.Text>
                    </>
                  ),
                }))}
              />
            ),
          },
        ]}
      />

      <Modal
        open={!!healthDraft}
        title="ثبت وضعیت سلامت"
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        onCancel={() => setHealthDraft(null)}
        okButtonProps={{ disabled: !healthDraft?.note.trim() }}
        onOk={() => healthDraft && submitHealth(healthDraft.health, healthDraft.note)}
      >
        <p>برای «{healthDraft ? t(`health.${healthDraft.health}`) : ''}» باید بگویی ماجرا چیست. بدون توضیح فقط یک رنگ قرمز بی‌فایده است.</p>
        <Input.TextArea
          rows={3}
          value={healthDraft?.note ?? ''}
          onChange={(e) => setHealthDraft((d) => (d ? { ...d, note: e.target.value } : d))}
          placeholder="مثلاً: منتظر پاسخ پشتیبانی بانک"
        />
      </Modal>

      {id && tracked && (
        <TrackedChangeModal
          open={!!tracked}
          kind={tracked}
          workItemId={id}
          users={users}
          onClose={() => setTracked(null)}
          onSaved={() => {
            load();
            onChanged();
          }}
        />
      )}

      {id && (
        <CommitmentModal
          open={etaOpen}
          onClose={() => setEtaOpen(false)}
          onSaved={() => {
            load();
            onChanged();
          }}
          item={{ ...item, id }}
        />
      )}
    </Drawer>
  );
}
