import { useEffect, useState } from 'react';
import { Checkbox, Form, Input, Modal, Select, Grid, App as AntApp } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import JalaliDatePicker from './JalaliDatePicker';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { options, priorityOptions, dual, PEOPLE_ROLES } from '../lib/terms';
import FieldLabel from './FieldLabel';

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
  const [showDetails, setShowDetails] = useState(false);
  const { message } = AntApp.useApp();
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    if (!open) return;
    setShowDetails(false); // هر بار باز شدن، جزئیات بسته باشد تا فرم کوتاه بماند
    api<any[]>('/users').then(setUsers).catch(() => setUsers([]));
    api<any[]>('/projects').then(setProjects).catch(() => setProjects([]));
  }, [open]);

  const userOptions = users.map((u) => ({ value: u.id, label: u.fullName }));

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
      okText="ثبت کار"
      cancelText={t('common.cancel')}
      width={screens.sm ? 640 : undefined}
      style={{ maxWidth: '96vw' }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark
        initialValues={{ priority: 'P2', workType: 'TASK' }}
      >
        {/* ── الزامی ── همیشه دیده می‌شود، کوتاه و دوستونه ── */}
        <div className="form-section-label">اطلاعات لازم</div>

        <Form.Item
          name="title"
          label={<FieldLabel label="عنوان" helpKey="title" />}
          rules={[{ required: true, message: 'یک عنوان بنویس تا بعداً بشود پیدایش کرد.' }]}
        >
          <Input placeholder="مثلاً: رفع باگ درگاه پرداخت هنگام مبلغ صفر" autoFocus />
        </Form.Item>

        <div className="form-grid-2">
          <Form.Item name="workType" label={<FieldLabel label={dual('نوع کار', 'Type')} helpKey="workType" />} rules={[{ required: true }]}>
            <Select options={options('workType')} />
          </Form.Item>
          <Form.Item
            name="workStream"
            label={<FieldLabel label={dual('جریان کاری', 'Stream')} helpKey="workStream" />}
            rules={[{ required: true, message: 'بگو ظرفیت کجا خرج می‌شود.' }]}
          >
            <Select options={options('stream')} placeholder="انتخاب کنید" />
          </Form.Item>
          <Form.Item name="priority" label={<FieldLabel label={dual('اولویت', 'Priority')} helpKey="priority" />} rules={[{ required: true }]}>
            <Select options={priorityOptions()} />
          </Form.Item>
          <Form.Item
            name="ownerId"
            label={<FieldLabel label={dual(PEOPLE_ROLES.owner.fa, PEOPLE_ROLES.owner.en)} helpKey="owner" />}
            rules={[{ required: true, message: 'هر کاری باید یک نفر پاسخگو داشته باشد.' }]}
          >
            <Select showSearch optionFilterProp="label" placeholder="چه کسی پاسخگوست؟" options={userOptions} />
          </Form.Item>
        </div>

        {/* ── دکمه‌ی باز/بسته کردن جزئیات ── تا کاربر با ۱۳ فیلد اورلود نشود ── */}
        <div className="form-divider" />
        <button type="button" className="form-expand" onClick={() => setShowDetails((s) => !s)} aria-expanded={showDetails}>
          {showDetails ? <UpOutlined /> : <DownOutlined />}
          {showDetails ? 'بستن جزئیات' : 'جزئیات بیشتر (اختیاری)'}
        </button>

        {/* بخش اختیاری همیشه mount است (display:none) تا مقدارها حفظ شوند */}
        <div style={{ display: showDetails ? 'block' : 'none' }}>
          <Form.Item name="projectId" label={<FieldLabel label="پروژه" helpKey="project" />}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('common.noProject')}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>

          <Form.Item name="description" label={<FieldLabel label="توضیح" helpKey="description" />}>
            <Input.TextArea rows={3} placeholder="زمینه، لینک، تصمیم‌های قبلی — هر چیزی که بعداً کمک کند." />
          </Form.Item>

          <div className="form-grid-2">
            <Form.Item name="primaryAssigneeId" label={<FieldLabel label={dual(PEOPLE_ROLES.assignee.fa, PEOPLE_ROLES.assignee.en)} helpKey="assignee" />}>
              <Select allowClear showSearch optionFilterProp="label" placeholder="کسی که کار می‌کند" options={userOptions} />
            </Form.Item>
            <Form.Item name="reviewerId" label={<FieldLabel label={dual(PEOPLE_ROLES.reviewer.fa, PEOPLE_ROLES.reviewer.en)} helpKey="reviewer" />}>
              <Select allowClear showSearch optionFilterProp="label" placeholder="کسی که تأیید می‌کند" options={userOptions} />
            </Form.Item>
          </div>

          <Form.Item name="dueDate" label={<FieldLabel label="مهلت" helpKey="dueDate" />}>
            <JalaliDatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="acceptanceCriteria" label={<FieldLabel label="معیار پذیرش" helpKey="acceptanceCriteria" />}>
            <Input.TextArea rows={2} placeholder="کار کِی «تمام» حساب می‌شود؟" />
          </Form.Item>

          <Form.Item name="requiresReview" valuePropName="checked" style={{ marginBottom: 8 }}>
            <Checkbox>
              این کار باید پیش از پایان تأیید شود <FieldLabel label="" helpKey="requiresReview" />
            </Checkbox>
          </Form.Item>
          <Form.Item name="requiresQa" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>
              این کار باید تست شود <FieldLabel label="" helpKey="requiresQa" />
            </Checkbox>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
