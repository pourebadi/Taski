import { useEffect, useState } from 'react';
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  App as AntApp,
} from 'antd';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { options, labelDual } from '../lib/terms';
import { useAuth } from '../lib/auth-store';
import { toJalali, faDigits } from '../lib/date';
import CommitmentModal from './CommitmentModal';
import TrackedChangeModal, { TrackedChange } from './TrackedChangeModal';
import FieldLabel from './FieldLabel';
import DriftRibbon from './DriftRibbon';
import { HealthBadge, PriorityBadge, StateBadge, WorkKey } from './Badges';
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
    healthNote?: string | null;
    requiresReview: boolean;
    requiresQa: boolean;
    reviewerId?: string | null;
  };
  commitments: Commitment[];
  changes: ChangeRecord[];
  activities: {
    id: string;
    action: string;
    fromValue?: string | null;
    toValue?: string | null;
    createdAt: string;
    actor?: { fullName: string } | null;
  }[];
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
  OWNER: 'مسئول',
  REVIEWER: 'تأییدکننده',
  CANCEL: 'لغو کار',
};

const ACTION_LABEL: Record<string, string> = {
  CREATED: 'ساخته شد',
  STATE_CHANGED: 'مرحله عوض شد',
  HEALTH_CHANGED: 'سلامت عوض شد',
  ETA_CHANGED: 'تاریخ تحویل عوض شد',
  PRIORITY_CHANGED: 'اولویت عوض شد',
  ASSIGNEE_CHANGED: 'مجری عوض شد',
  OWNER_CHANGED: 'مسئول عوض شد',
  DUE_DATE_CHANGED: 'مهلت عوض شد',
};

/** گذارهای مجاز — با جدول سرور یکی است تا کاربر گزینه‌ی بن‌بست نبیند. */
const ALLOWED_NEXT: Record<string, string[]> = {
  INBOX: ['BACKLOG', 'CANCELLED'],
  BACKLOG: ['READY', 'IN_PROGRESS', 'CANCELLED'],
  READY: ['IN_PROGRESS', 'BACKLOG', 'CANCELLED'],
  IN_PROGRESS: ['IN_REVIEW', 'IN_QA', 'DONE', 'BACKLOG', 'CANCELLED'],
  IN_REVIEW: ['IN_PROGRESS', 'IN_QA', 'DONE', 'CANCELLED'],
  IN_QA: ['IN_PROGRESS', 'DONE', 'CANCELLED'],
  DONE: ['IN_PROGRESS'],
  CANCELLED: ['BACKLOG'],
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
  const [posting, setPosting] = useState(false);
  const [healthDraft, setHealthDraft] = useState<{ health: string; note: string } | null>(null);
  const [tracked, setTracked] = useState<TrackedChange | null>(null);
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [siblings, setSiblings] = useState<{ id: string; key: string; title: string }[]>([]);
  const [sendBack, setSendBack] = useState<{ reasonType?: string; reasonText: string } | null>(null);
  const user = useAuth((s) => s.user);
  const { message } = AntApp.useApp();

  const load = () => {
    if (!id) return;
    api<Detail>(`/work-items/${id}`).then(setData).catch(() => setData(null));
  };

  // با عوض شدن کار، داده‌ی قبلی باید پاک شود؛ وگرنه لحظه‌ای مشخصات کار
  // قبلی روی کار جدید نشان داده می‌شد.
  useEffect(() => {
    setData(null);
    setComment('');
    load();
  }, [id]);

  useEffect(() => {
    if (!open) return;
    api<any[]>('/users').then(setUsers).catch(() => setUsers([]));
    // کارهای فعالِ دیگر — برای فیلد «کدام کار عقب می‌افتد؟» موقع بالابردن اولویت (FE-4)
    api<any[]>('/work-items')
      .then((all) =>
        setSiblings(
          all
            .filter((w) => w.id !== id && ['READY', 'IN_PROGRESS', 'IN_REVIEW', 'IN_QA'].includes(w.workflowState))
            .map((w) => ({ id: w.id, key: w.key, title: w.title })),
        ),
      )
      .catch(() => setSiblings([]));
  }, [open, id]);

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

  const changeState = async (next: string, reason?: { reasonType: string; reasonText?: string }) => {
    // لغو باید علت داشته باشد، پس از مسیر مودال ردیابی‌شده می‌رود
    if (next === 'CANCELLED') {
      setTracked('CANCEL');
      return;
    }
    // نرم، نه مانع: برای شروع کار باید تعهد داده باشی. به‌جای خطا، مودال تعهد
    // باز می‌شود تا همان‌جا پرش کنی. (تصمیم D-UX-1، بدون باتل‌نک)
    if (next === 'IN_PROGRESS' && data?.item && !data.item.currentEta) {
      message.info('برای شروع، اول تخمین و تاریخ تحویل را ثبت کن.');
      setEtaOpen(true);
      return;
    }
    try {
      await api(`/work-items/${id}/state`, {
        method: 'PATCH',
        body: JSON.stringify({ state: next, ...(reason ?? {}) }),
      });
      message.success(`به «${labelDual('state', next)}» منتقل شد.`);
      load();
      onChanged();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  // تأیید فقط برای تأییدکننده‌ی تعیین‌شده یا نقش مدیریتی (هم‌راستا با گارد سرور)
  const canReview =
    !!data?.item &&
    (user?.id === data.item.reviewerId || ['ORG_OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(user?.role ?? ''));

  const approve = () => changeState(data?.item.requiresQa ? 'IN_QA' : 'DONE');

  const submitComment = async () => {
    if (!comment.trim()) return;
    // بدون try/catch، خطای سرور به‌صورت unhandled rejection در کنسول می‌افتاد
    // و کاربر هیچ بازخوردی نمی‌گرفت.
    setPosting(true);
    try {
      await api(`/work-items/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: comment }),
      });
      setComment('');
      load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  // شرط قبلی فقط !data را می‌گرفت. اگر سرور چیزی برمی‌گرداند که item ندارد
  // — پاسخ ناقص، شکل غیرمنتظره، یا بدنه‌ی خالی — همین‌جا کل صفحه سفید می‌شد.
  if (!data?.item) {
    return (
      <Drawer open={open} onClose={onClose} width={760}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Drawer>
    );
  }

  const item = data.item;
  const metrics = data.metrics ?? {
    etaShiftCount: 0,
    lastShiftWorkingDays: null,
    cumulativeMovementWorkingDays: 0,
    driftFromFirstBaseline: null,
  };
  const commitments: Commitment[] = data.commitments ?? [];
  const changes: ChangeRecord[] = data.changes ?? [];
  const activities: Detail['activities'] = data.activities ?? [];
  const comments: Detail['comments'] = data.comments ?? [];
  const nextStates = ALLOWED_NEXT[item.workflowState] ?? [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={760}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingInlineEnd: 12 }}>
          <WorkKey value={item.key} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>{item.title}</span>
        </div>
      }
    >
      {/* نوار تأیید — وقتی این کار منتظر تأیید توست، جای تأیید صریح و جلوی چشم است */}
      {item.workflowState === 'IN_REVIEW' && canReview && (
        <div className="review-bar">
          <span className="review-bar-text">این کار منتظر تأیید توست.</span>
          <Space>
            <Button type="primary" onClick={approve}>
              تأیید {item.requiresQa ? '→ ارسال به تست' : 'و بستن'}
            </Button>
            <Button onClick={() => setSendBack({ reasonText: '' })}>برگشت با توضیح</Button>
          </Space>
        </div>
      )}
      {item.workflowState === 'IN_REVIEW' && !canReview && (
        <div className="review-bar" data-tone="muted">
          <span className="review-bar-text">
            منتظر تأیید {users.find((u) => u.id === item.reviewerId)?.fullName ?? 'تأییدکننده'} است.
          </span>
        </div>
      )}

      {/* نوار عمل — همه‌ی کارهایی که روی این آیتم می‌شود کرد، یک‌جا */}
      <Space wrap style={{ marginBottom: 18 }}>
        <Select
          value={item.workflowState}
          style={{ width: 160 }}
          aria-label="تغییر مرحله"
          onChange={(v) => changeState(v)}
          options={[
            { value: item.workflowState, label: `${labelDual('state', item.workflowState)} (فعلی)`, disabled: true },
            ...nextStates.map((s) => ({ value: s, label: labelDual('state', s) })),
          ]}
        />
        <Button type="primary" onClick={() => setEtaOpen(true)}>
          {t('eta.change')}
        </Button>
        <Button onClick={() => setTracked('PRIORITY')}>اولویت</Button>
        <Button onClick={() => setTracked('ASSIGNEE')}>مجری</Button>
        <Button onClick={() => setTracked('OWNER')}>مسئول</Button>
        <Button onClick={() => setTracked('DUE_DATE')}>مهلت</Button>
        {item.workflowState !== 'CANCELLED' && (
          <Button danger onClick={() => setTracked('CANCEL')}>
            لغو
          </Button>
        )}
      </Space>

      {/* امضای بصری: انحراف تعهد، بالای همه‌چیز */}
      {item.firstCommittedEta && item.currentEta && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            جابه‌جایی تعهد
          </div>
          <DriftRibbon
            baseline={item.firstCommittedEta}
            current={item.currentEta}
            driftDays={metrics.driftFromFirstBaseline}
          />
          <div style={{ display: 'flex', gap: 22, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>
              دفعات جابه‌جایی: <strong className="tabular">{faDigits(metrics.etaShiftCount)}</strong>
            </span>
            <span>
              مجموع حرکت:{' '}
              <strong className="tabular">{faDigits(metrics.cumulativeMovementWorkingDays)}</strong>{' '}
              {t('common.days')}
            </span>
          </div>
        </div>
      )}

      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered style={{ marginBottom: 16 }}>
        {/* برچسب باید اسم فیلد باشد، نه مقدارش */}
        <Descriptions.Item label="مرحله">
          <StateBadge state={item.workflowState} />
        </Descriptions.Item>
        <Descriptions.Item label={<FieldLabel label="سلامت تحویل" helpKey="deliveryHealth" />}>
          {/* دو محور مستقل: تغییر سلامت وضعیت اجرا را عوض نمی‌کند */}
          <Select
            size="small"
            value={item.deliveryHealth}
            style={{ width: 140 }}
            aria-label="تغییر سلامت تحویل"
            onChange={changeHealth}
            options={options('health')}
          />
        </Descriptions.Item>
        <Descriptions.Item label="اولویت">
          <PriorityBadge priority={item.priority} />
        </Descriptions.Item>
        <Descriptions.Item label="جریان کاری">{t(`stream.${item.workStream}`)}</Descriptions.Item>
        <Descriptions.Item label={<FieldLabel label={t('eta.baseline')} helpKey="baseline" />}>
          <span className="tabular">{faDigits(toJalali(item.firstCommittedEta))}</span>
        </Descriptions.Item>
        <Descriptions.Item label={t('eta.current')}>
          <span className="tabular">{faDigits(toJalali(item.currentEta))}</span>
        </Descriptions.Item>
        <Descriptions.Item label="مهلت">
          <span className="tabular">{faDigits(toJalali(item.dueDate))}</span>
        </Descriptions.Item>
        <Descriptions.Item label={t('eta.estimateHours')}>
          {item.estimateHours ? faDigits(item.estimateHours) : '—'}
        </Descriptions.Item>
        <Descriptions.Item label={<FieldLabel label="نیاز به تأیید" helpKey="requiresReview" />}>
          {item.requiresReview ? 'بله' : 'خیر'}
        </Descriptions.Item>
        <Descriptions.Item label={<FieldLabel label="نیاز به تست" helpKey="requiresQa" />}>
          {item.requiresQa ? 'بله' : 'خیر'}
        </Descriptions.Item>
      </Descriptions>

      {item.healthNote && (
        <div
          style={{
            background: 'var(--warn-soft)',
            border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <span className="eyebrow" style={{ color: 'var(--warn)' }}>
            یادداشت سلامت
          </span>
          <div style={{ marginTop: 4 }}>{item.healthNote}</div>
        </div>
      )}

      {item.description && (
        <div style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            توضیح
          </div>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {item.description}
          </Typography.Paragraph>
        </div>
      )}

      <Tabs
        items={[
          {
            key: 'commitments',
            label: `تاریخچه تعهد (${faDigits(commitments.length)})`,
            children: commitments.length ? (
              <Table<Commitment>
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 560 }}
                dataSource={commitments}
                columns={[
                  { title: 'نسخه', dataIndex: 'versionNo', width: 64, render: (v) => faDigits(v) },
                  {
                    title: 'از',
                    dataIndex: 'previousEta',
                    render: (v) => <span className="tabular">{faDigits(toJalali(v))}</span>,
                  },
                  {
                    title: 'به',
                    dataIndex: 'newEta',
                    render: (v) => <span className="tabular">{faDigits(toJalali(v))}</span>,
                  },
                  {
                    title: t('common.days'),
                    dataIndex: 'deltaWorkingDays',
                    width: 90,
                    render: (v: number | null) =>
                      v == null ? (
                        '—'
                      ) : (
                        <span className="tabular" style={{ color: v > 0 ? 'var(--danger)' : 'var(--ok)' }}>
                          {v > 0 ? '+' : ''}
                          {faDigits(v)}
                        </span>
                      ),
                  },
                  { title: t('eta.reason'), dataIndex: 'reasonType', render: (r) => t(`reason.${r}`) },
                  { title: 'توضیح', dataIndex: 'reasonText', render: (v) => v ?? '—' },
                  { title: 'ثبت‌کننده', dataIndex: ['changedBy', 'fullName'], width: 110 },
                ]}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="هنوز تاریخ تحویلی ثبت نشده. با «تغییر تعهد» اولین تاریخ را بگذارید."
              />
            ),
          },
          {
            key: 'changes',
            label: `دفتر تغییرات (${faDigits(changes.length)})`,
            children: changes.length ? (
              <Table<ChangeRecord>
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 560 }}
                dataSource={changes}
                columns={[
                  { title: 'چه چیزی', dataIndex: 'field', width: 90, render: (f) => FIELD_LABEL[f] ?? f },
                  { title: 'از', dataIndex: 'fromValue', render: (v) => v ?? '—' },
                  { title: 'به', dataIndex: 'toValue', render: (v) => v ?? '—' },
                  { title: 'چرا', dataIndex: 'reasonType', width: 110, render: (r) => t(`reason.${r}`) },
                  { title: 'توضیح', dataIndex: 'reasonText', render: (v) => v ?? '—' },
                  { title: 'کی', dataIndex: ['changedBy', 'fullName'], width: 110 },
                ]}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="هنوز اولویت، مهلت یا مجری این کار عوض نشده."
              />
            ),
          },
          {
            key: 'comments',
            label: `دیدگاه‌ها (${faDigits(comments.length)})`,
            children: (
              <>
                {comments.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="هنوز دیدگاهی ثبت نشده." />
                ) : (
                  <Timeline
                    style={{ marginTop: 8 }}
                    items={comments.map((c) => ({
                      color: 'gray',
                      children: (
                        <>
                          <Typography.Text strong>{c.author.fullName}</Typography.Text>{' '}
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {faDigits(toJalali(c.createdAt, 'YYYY/MM/DD HH:mm'))}
                          </Typography.Text>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
                        </>
                      ),
                    }))}
                  />
                )}
                <Space.Compact style={{ width: '100%', marginTop: 12 }}>
                  <Input
                    value={comment}
                    aria-label="متن دیدگاه"
                    placeholder="چیزی بنویسید که سه ماه بعد هم به کار بیاید."
                    onChange={(e) => setComment(e.target.value)}
                    onPressEnter={submitComment}
                  />
                  <Button type="primary" onClick={submitComment} loading={posting}>
                    ثبت
                  </Button>
                </Space.Compact>
              </>
            ),
          },
          {
            key: 'activity',
            label: 'فعالیت',
            children: (
              <Timeline
                style={{ marginTop: 8 }}
                items={activities.map((a) => ({
                  color: 'gray',
                  children: (
                    <>
                      <Typography.Text>{a.actor?.fullName ?? 'سیستم'}</Typography.Text>{' '}
                      <Tag>{ACTION_LABEL[a.action] ?? a.action}</Tag>
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
        <p>
          برای «{healthDraft ? t(`health.${healthDraft.health}`) : ''}» باید بگویید ماجرا چیست. بدون
          توضیح فقط یک رنگ قرمز بی‌فایده است.
        </p>
        <Input.TextArea
          rows={3}
          aria-label="توضیح وضعیت سلامت"
          value={healthDraft?.note ?? ''}
          onChange={(e) => setHealthDraft((d) => (d ? { ...d, note: e.target.value } : d))}
          placeholder="مثلاً: منتظر پاسخ پشتیبانی بانک"
        />
      </Modal>

      <Modal
        open={!!sendBack}
        title="برگشت برای اصلاح"
        okText="برگشت بده"
        cancelText={t('common.cancel')}
        onCancel={() => setSendBack(null)}
        okButtonProps={{ disabled: !sendBack?.reasonType }}
        onOk={async () => {
          if (!sendBack?.reasonType) return;
          await changeState('IN_PROGRESS', { reasonType: sendBack.reasonType, reasonText: sendBack.reasonText });
          setSendBack(null);
        }}
      >
        <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
          کار به «در حال انجام» برمی‌گردد. بگو چه چیزی باید درست شود تا در تاریخچه بماند.
        </p>
        <Select
          style={{ width: '100%', marginBottom: 10 }}
          placeholder="علت برگشت"
          options={options('reason')}
          value={sendBack?.reasonType}
          onChange={(v) => setSendBack((s) => (s ? { ...s, reasonType: v } : s))}
        />
        <Input.TextArea
          rows={3}
          aria-label="توضیح برگشت"
          placeholder="مثلاً: تست‌ها را اضافه کن و لبه‌ی مبلغ صفر را هم پوشش بده."
          value={sendBack?.reasonText ?? ''}
          onChange={(e) => setSendBack((s) => (s ? { ...s, reasonText: e.target.value } : s))}
        />
      </Modal>

      {id && tracked && (
        <TrackedChangeModal
          key={`${id}-${tracked}`}
          open={!!tracked}
          kind={tracked}
          workItemId={id}
          users={users}
          siblings={siblings}
          onClose={() => setTracked(null)}
          onSaved={() => {
            load();
            onChanged();
          }}
        />
      )}

      {id && (
        <CommitmentModal
          key={`${id}-${item.currentEta ?? 'none'}`}
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
