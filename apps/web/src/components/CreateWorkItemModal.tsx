import { useEffect, useState } from 'react';
import { Checkbox, Form, Input, Modal, Select, App as AntApp } from 'antd';
import JalaliDatePicker from './JalaliDatePicker';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import FieldLabel from './FieldLabel';

const STREAMS = ['PRODUCT', 'TECH_DEBT', 'SUPPORT', 'INFRASTRUCTURE'];
const TYPES = [
  { value: 'FEATURE', label: 'قابلیت' },
  { value: 'BUG', label: 'باگ' },
  { value: 'TASK', label: 'تسک' },
  { value: 'SUPPORT', label: 'پشتیبانی' },
  { value: 'TECH_DEBT', label: 'بدهی فنی' },
  { value: 'INFRA', label: 'زیرساخت' },
];

export default function CreateWorkItemModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const { message } = AntApp.useApp();

  useEffect(() => {
    if (!open) return;
    api<any[]>('/users').then(setUsers).catch(() => setUsers([]));
    api<any[]>('/projects').then(setProjects).catch(() => setProjects([]));
  }, [open]);

  const submit = async () => {
    const v = await form.validateFields();
    try {
      await api('/work-items', {
        method: 'POST',
        body: JSON.stringify({
          ...v,
          projectId: v.projectId ?? null, // کار بدون پروژه مجاز است
          dueDate: v.dueDate ? v.dueDate.toDate().toISOString() : null,
        }),
      });
      message.success('ثبت شد.');
      form.resetFields();
      onCreated();
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <Modal
      open={open}
      title="کار جدید"
      onCancel={onClose}
      onOk={submit}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      width={620}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ priority: 'P2', workType: 'TASK' }}>
        <Form.Item name="title" label={<FieldLabel label="عنوان" helpKey="title" />} rules={[{ required: true, message: 'یک عنوان بنویس تا بعداً بشود پیدایش کرد.' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label={<FieldLabel label="توضیح" helpKey="description" />}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="projectId" label={<FieldLabel label="پروژه" helpKey="project" />}>
          {/* خالی گذاشتن یعنی کار مستقل */}
          <Select allowClear placeholder={t('common.noProject')} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
        </Form.Item>
        <Form.Item name="workType" label={<FieldLabel label="نوع کار" helpKey="workType" />} rules={[{ required: true }]}>
          <Select options={TYPES} />
        </Form.Item>
        <Form.Item name="workStream" label={<FieldLabel label="جریان کاری" helpKey="workStream" />} rules={[{ required: true, message: 'بگو ظرفیت کجا خرج می‌شود؛ محصول، پشتیبانی، بدهی فنی یا زیرساخت.' }]}>
          <Select options={STREAMS.map((s) => ({ value: s, label: t(`stream.${s}`) }))} />
        </Form.Item>
        <Form.Item name="priority" label={<FieldLabel label="اولویت" helpKey="priority" />} rules={[{ required: true }]}>
          <Select options={['P0', 'P1', 'P2', 'P3'].map((p) => ({ value: p, label: p }))} />
        </Form.Item>
        <Form.Item name="ownerId" label={<FieldLabel label="مالک" helpKey="owner" />} rules={[{ required: true, message: 'هر کاری باید یک نفر پاسخگو داشته باشد.' }]}>
          <Select options={users.map((u) => ({ value: u.id, label: u.fullName }))} />
        </Form.Item>
        <Form.Item name="primaryAssigneeId" label={<FieldLabel label="مجری" helpKey="assignee" />}>
          <Select allowClear options={users.map((u) => ({ value: u.id, label: u.fullName }))} />
        </Form.Item>
        <Form.Item name="reviewerId" label={<FieldLabel label="بازبین" helpKey="reviewer" />}>
          <Select allowClear options={users.map((u) => ({ value: u.id, label: u.fullName }))} />
        </Form.Item>
        <Form.Item name="dueDate" label={<FieldLabel label="مهلت" helpKey="dueDate" />}>
          <JalaliDatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="acceptanceCriteria" label={<FieldLabel label="معیار پذیرش" helpKey="acceptanceCriteria" />}>
          <Input.TextArea rows={2} />
        </Form.Item>
        {/* بازبینی اختیاری است و سازنده تعیین می‌کند */}
        <Form.Item name="requiresReview" valuePropName="checked">
          <Checkbox>این کار باید بازبینی شود <FieldLabel label="" helpKey="requiresReview" /></Checkbox>
        </Form.Item>
        <Form.Item name="requiresQa" valuePropName="checked">
          <Checkbox>این کار باید تست شود <FieldLabel label="" helpKey="requiresQa" /></Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
