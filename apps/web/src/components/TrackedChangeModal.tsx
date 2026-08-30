import { useState } from 'react';
import { Alert, Form, Input, Modal, Select, App as AntApp } from 'antd';
import JalaliDatePicker from './JalaliDatePicker';
import dayjs from 'dayjs';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import FieldLabel from './FieldLabel';

const REASONS = [
  'SCOPE_CHANGE', 'BLOCKER', 'DEPENDENCY', 'PRIORITY_CHANGE',
  'SUPPORT_INTERRUPT', 'RE_ESTIMATION', 'EXTERNAL',
];

export type TrackedChange = 'PRIORITY' | 'DUE_DATE' | 'ASSIGNEE' | 'OWNER' | 'CANCEL';

const TITLES: Record<TrackedChange, string> = {
  PRIORITY: 'تغییر اولویت',
  DUE_DATE: 'تغییر مهلت',
  ASSIGNEE: 'تغییر مجری',
  OWNER: 'تغییر مالک',
  CANCEL: 'لغو کار',
};

const NOTES: Record<TrackedChange, string> = {
  PRIORITY: 'وقتی چیزی جلو می‌افتد، معمولاً چیز دیگری عقب می‌رود. اگر می‌دانی کدام، ثبتش کن.',
  DUE_DATE: 'مهلت یعنی «کِی لازم است». اگر خودت داری تخمینت را عوض می‌کنی، به‌جای این از «تغییر تعهد» استفاده کن.',
  ASSIGNEE: 'واگذاری کار به نفر دیگر معمولاً روی زمان تحویل اثر می‌گذارد.',
  OWNER: 'مالک یعنی پاسخگوی نتیجه. عوض کردنش یعنی مسئولیت جابه‌جا شده.',
  CANCEL: 'کارهای لغوشده پاک نمی‌شوند؛ فقط از فهرست‌ها کنار می‌روند. بعداً می‌شود فهمید چرا رهایشان کردیم.',
};

type Props = {
  open: boolean;
  kind: TrackedChange;
  workItemId: string;
  users?: { id: string; fullName: string }[];
  siblings?: { id: string; key: string; title: string }[];
  onClose: () => void;
  onSaved: () => void;
};

/**
 * هر تغییری که بعداً کسی می‌پرسد «چرا این‌طور شد؟» باید از اینجا رد شود.
 * سرور هم مستقلاً علت را الزام می‌کند؛ این فرم فقط جلوی رفت‌وبرگشت را می‌گیرد.
 */
export default function TrackedChangeModal({
  open, kind, workItemId, users = [], siblings = [], onClose, onSaved,
}: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = AntApp.useApp();

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (kind === 'CANCEL') {
        await api(`/work-items/${workItemId}/state`, {
          method: 'PATCH',
          body: JSON.stringify({ state: 'CANCELLED', reasonType: v.reasonType, reasonText: v.reasonText }),
        });
      } else {
        const payload: Record<string, unknown> = {
          reasonType: v.reasonType,
          reasonText: v.reasonText,
          displacedWorkItemId: v.displacedWorkItemId ?? null,
        };
        if (kind === 'PRIORITY') payload.priority = v.priority;
        if (kind === 'DUE_DATE') payload.dueDate = v.dueDate ? v.dueDate.toDate().toISOString() : null;
        if (kind === 'ASSIGNEE') payload.primaryAssigneeId = v.userId ?? null;
        if (kind === 'OWNER') payload.ownerId = v.userId;

        await api(`/work-items/${workItemId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      message.success('ثبت شد. علتش هم در تاریخچه ماند.');
      form.resetFields();
      onSaved();
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={TITLES[kind]}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      destroyOnClose
      okText={t('common.save')}
      cancelText={t('common.cancel')}
    >
      <Alert type="info" showIcon message={NOTES[kind]} style={{ marginBottom: 16 }} />

      <Form form={form} layout="vertical" requiredMark={false}>
        {kind === 'PRIORITY' && (
          <Form.Item
            name="priority"
            label={<FieldLabel label="اولویت جدید" helpKey="priority" />}
            rules={[{ required: true }]}
          >
            <Select options={['P0', 'P1', 'P2', 'P3'].map((p) => ({ value: p, label: p }))} />
          </Form.Item>
        )}

        {/* مقدار اولیه از طریق Form داده می‌شود؛ defaultValue روی کنترل داخلِ
            Form.Item توسط antd نادیده گرفته می‌شود و فقط هشدار کنسول می‌دهد. */}
        {kind === 'DUE_DATE' && (
          <Form.Item name="dueDate" label={<FieldLabel label="مهلت جدید" helpKey="dueDate" />} initialValue={dayjs()}>
            <JalaliDatePicker style={{ width: '100%' }} />
          </Form.Item>
        )}

        {(kind === 'ASSIGNEE' || kind === 'OWNER') && (
          <Form.Item
            name="userId"
            label={<FieldLabel label={kind === 'OWNER' ? 'مالک جدید' : 'مجری جدید'} helpKey={kind === 'OWNER' ? 'owner' : 'assignee'} />}
            rules={[{ required: kind === 'OWNER', message: 'یک نفر را انتخاب کن.' }]}
          >
            <Select allowClear options={users.map((u) => ({ value: u.id, label: u.fullName }))} />
          </Form.Item>
        )}

        <Form.Item
          name="reasonType"
          label={<FieldLabel label="چرا؟" helpKey="reasonType" />}
          rules={[{ required: true, message: 'بدون علت ثبت نمی‌شود.' }]}
        >
          <Select options={REASONS.map((r) => ({ value: r, label: t(`reason.${r}`) }))} />
        </Form.Item>

        <Form.Item name="reasonText" label={<FieldLabel label="توضیح" helpKey="reasonText" />}>
          <Input.TextArea rows={2} placeholder="سه ماه بعد کسی این را می‌خواند؛ کاری کن بفهمد چه شد." />
        </Form.Item>

        {kind === 'PRIORITY' && siblings.length > 0 && (
          <Form.Item
            name="displacedWorkItemId"
            label={<FieldLabel label="کدام کار عقب می‌افتد؟" helpKey="displacedWork" />}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="اگر می‌دانی، انتخاب کن"
              options={siblings.map((s) => ({ value: s.id, label: `${s.key} — ${s.title}` }))}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
