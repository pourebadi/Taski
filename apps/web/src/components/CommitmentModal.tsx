import { useState } from 'react';
import { Alert, Descriptions, Form, InputNumber, Input, Modal, Select, App as AntApp } from 'antd';
import JalaliDatePicker from './JalaliDatePicker';
import dayjs from 'dayjs';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { toJalali, faDigits } from '../lib/date';
import { options } from '../lib/terms';
import FieldLabel from './FieldLabel';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: {
    id: string;
    currentEta?: string | null;
    firstCommittedEta?: string | null;
    estimateHours?: number | null;
    etaConfidence?: string | null;
    etaAssumptions?: string | null;
  };
};

/**
 * تنها راه تغییر ETA و تخمین در کل رابط کاربری.
 * علت اجباری است و سرور هم مستقلاً آن را الزام می‌کند. (PM-C6)
 */
export default function CommitmentModal({ open, onClose, onSaved, item }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = AntApp.useApp();

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await api(`/work-items/${item.id}/commitment`, {
        method: 'PATCH',
        body: JSON.stringify({
          newEta: values.newEta ? values.newEta.toDate().toISOString() : null,
          newEstimateHours: values.newEstimateHours ?? null,
          confidence: values.confidence,
          assumptions: values.assumptions,
          reasonType: values.reasonType,
          reasonText: values.reasonText,
        }),
      });
      message.success('ثبت شد. تاریخ قبلی و علتش در تاریخچه ماند.');
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
      title={t('eta.change')}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      destroyOnClose
      okText={t('common.save')}
      cancelText={t('common.cancel')}
    >
      {item.firstCommittedEta && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <Descriptions size="small" column={1}>
              <Descriptions.Item label={t('eta.baseline')}>
                {faDigits(toJalali(item.firstCommittedEta))}
              </Descriptions.Item>
              <Descriptions.Item label={t('eta.current')}>
                {faDigits(toJalali(item.currentEta))}
              </Descriptions.Item>
            </Descriptions>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          newEta: item.currentEta ? dayjs(item.currentEta) : null,
          newEstimateHours: item.estimateHours ?? null,
          confidence: item.etaConfidence ?? 'MEDIUM',
          assumptions: item.etaAssumptions ?? '',
        }}
      >
        {/* تقویم شمسی داخلی — ذخیره‌سازی همچنان UTC است */}
        <Form.Item name="newEta" label={<FieldLabel label={t('eta.current')} helpKey="currentEta" />}>
          <JalaliDatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="newEstimateHours" label={<FieldLabel label={t('eta.estimateHours')} helpKey="estimateHours" />}>
          <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="confidence"
          label={<FieldLabel label={t('eta.confidence')} helpKey="etaConfidence" />}
          rules={[{ required: true, message: 'بگو چقدر مطمئنی. تاریخ بدون سطح اطمینان ثبت نمی‌شود.' }]}
        >
          <Select options={options('confidence')} />
        </Form.Item>

        <Form.Item
          name="reasonType"
          label={<FieldLabel label={t('eta.reason')} helpKey="reasonType" />}
          rules={[{ required: true, message: 'بدون علت نمی‌شود تاریخ را عوض کرد.' }]}
        >
          <Select options={options('reason')} />
        </Form.Item>

        <Form.Item name="reasonText" label={<FieldLabel label="توضیح" helpKey="reasonText" />}>
          <Input.TextArea rows={2} placeholder="سه ماه بعد کسی این را می‌خواند؛ کاری کن بفهمد چه شد." />
        </Form.Item>

        <Form.Item name="assumptions" label={<FieldLabel label={t('eta.assumptions')} helpKey="etaAssumptions" />}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
