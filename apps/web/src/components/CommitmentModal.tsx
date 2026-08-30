import { useState } from 'react';
import { Alert, Button, Descriptions, Form, InputNumber, Input, Modal, Segmented, Select, App as AntApp } from 'antd';
import JalaliDatePicker from './JalaliDatePicker';
import dayjs from 'dayjs';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { toJalali, toJalaliLong, faDigits, hoursToWorkingDays, workingDeliveryDate } from '../lib/date';
import { options, CONFIDENCES } from '../lib/terms';
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

const HOURS_PER_DAY = 8;

/**
 * ورودی تخمین — یک کنترل فرمِ سفارشی که مقدار را به «ساعت» نگه می‌دارد
 * (چون بک‌اند ساعت می‌خواهد) ولی به کاربر اجازه می‌دهد به روز یا ساعت بدهد.
 * چون value/onChange می‌گیرد، داخل Form.Item درست ثبت می‌شود و useWatch می‌بیندش.
 */
function EstimateInput({ value, onChange }: { value?: number | null; onChange?: (v: number | null) => void }) {
  const [unit, setUnit] = useState<'day' | 'hour'>(value != null && value % HOURS_PER_DAY !== 0 ? 'hour' : 'day');
  const display = value == null ? null : unit === 'day' ? Math.round((value / HOURS_PER_DAY) * 100) / 100 : value;
  const change = (val: number | null) => onChange?.(val == null ? null : unit === 'day' ? val * HOURS_PER_DAY : val);
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Segmented
        value={unit}
        onChange={(v) => setUnit(v as 'day' | 'hour')}
        options={[
          { value: 'day', label: 'روز کاری' },
          { value: 'hour', label: 'ساعت' },
        ]}
      />
      <InputNumber
        min={0}
        step={unit === 'day' ? 0.5 : 1}
        value={display}
        onChange={change}
        style={{ flex: 1 }}
        placeholder={unit === 'day' ? 'مثلاً ۲' : 'مثلاً ۱۶'}
        addonAfter={unit === 'day' ? 'روز' : 'ساعت'}
      />
    </div>
  );
}

/**
 * تنها راه تغییر ETA و تخمین در کل رابط کاربری.
 * علت اجباری است و سرور هم مستقلاً آن را الزام می‌کند. (PM-C6)
 *
 * تجربه‌ی تخمین: کاربر «چقدر کار می‌برد» را به روز یا ساعت می‌دهد و همان لحظه
 * می‌بیند «یعنی تحویل حدود فلان تاریخ» (با تقویم کاری شنبه–پنجشنبه). یک کلیک
 * همان تاریخ را در تاریخ تحویل می‌گذارد — ولی تاریخ همچنان دستی قابل‌تغییر است،
 * چون گاهی وابستگی یا صف، تحویل را جلوتر/عقب‌تر از تلاشِ خالص می‌برد.
 */
export default function CommitmentModal({ open, onClose, onSaved, item }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = AntApp.useApp();

  const estimateHours = Form.useWatch('newEstimateHours', form) as number | null | undefined;

  const days = estimateHours ? hoursToWorkingDays(estimateHours, HOURS_PER_DAY) : 0;
  const roundedDays = Math.round(days * 10) / 10;
  const delivery = estimateHours && estimateHours > 0 ? workingDeliveryDate(new Date(), days) : null;

  const applyDeliveryToEta = () => {
    if (delivery) form.setFieldValue('newEta', dayjs(delivery));
  };

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
        {/* ── چقدر کار می‌برد؟ ── ورودی روز/ساعت با تبدیل زنده به تاریخ ── */}
        <Form.Item
          name="newEstimateHours"
          label={<FieldLabel label="چقدر کار می‌برد؟" helpKey="estimateHours" />}
          style={{ marginBottom: delivery ? 10 : undefined }}
        >
          <EstimateInput />
        </Form.Item>

        {delivery && (
          <div className="estimate-preview">
            <span>
              ≈ {faDigits(roundedDays)} روز کاری — با شروع از امروز، تحویل حدود{' '}
              <strong>{toJalaliLong(delivery)}</strong>
            </span>
            <Button type="link" size="small" onClick={applyDeliveryToEta} style={{ padding: 0, height: 'auto' }}>
              همین تاریخ را ثبت کن ↩
            </Button>
          </div>
        )}

        {/* ── تاریخ تحویل ── قابل ویرایش دستی، جدا از تلاشِ خالص ── */}
        <Form.Item name="newEta" label={<FieldLabel label="تاریخ تحویل (ETA)" helpKey="currentEta" />}>
          <JalaliDatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="confidence"
          label={<FieldLabel label="چقدر به این تاریخ مطمئنی؟" helpKey="etaConfidence" />}
          rules={[{ required: true, message: 'بگو چقدر مطمئنی. تاریخ بدون سطح اطمینان ثبت نمی‌شود.' }]}
        >
          <Segmented block options={CONFIDENCES.map((c) => ({ value: c.value, label: c.fa }))} />
        </Form.Item>

        <Form.Item
          name="reasonType"
          label={<FieldLabel label={t('eta.reason')} helpKey="reasonType" />}
          rules={[{ required: true, message: 'بدون علت نمی‌شود تاریخ را عوض کرد.' }]}
        >
          <Select options={options('reason')} placeholder="چرا دارد عوض می‌شود؟" />
        </Form.Item>

        <Form.Item name="reasonText" label={<FieldLabel label="توضیح" helpKey="reasonText" />}>
          <Input.TextArea rows={2} placeholder="سه ماه بعد کسی این را می‌خواند؛ کاری کن بفهمد چه شد." />
        </Form.Item>

        <Form.Item name="assumptions" label={<FieldLabel label={t('eta.assumptions')} helpKey="etaAssumptions" />}>
          <Input.TextArea rows={2} placeholder="این تاریخ به چه شرطی درست است؟ مثلاً «اگر محیط تست بانک تا شنبه آماده شود»." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
