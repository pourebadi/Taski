import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Progress, Row, Space, Tag, Typography, App as AntApp } from 'antd';
import { DatePicker } from 'antd-jalali-plus';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import FieldLabel from '../components/FieldLabel';
import { toJalali, faDigits } from '../lib/date';

type Project = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  status: string;
  targetDate?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'فعال',
  ON_HOLD: 'متوقف',
  DONE: 'تمام‌شده',
  CANCELLED: 'لغو شده',
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

  const load = () => {
    api<Project[]>('/projects').then(setProjects).catch(() => setProjects([]));
  };
  useEffect(load, []);

  const submit = async () => {
    const v = await form.validateFields();
    try {
      await api('/projects', {
        method: 'POST',
        body: JSON.stringify({ ...v, targetDate: v.targetDate ? v.targetDate.toDate().toISOString() : null }),
      });
      message.success('پروژه ساخته شد.');
      form.resetFields();
      setOpen(false);
      load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('nav.projects')}</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          پروژه جدید
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        {projects.map((p) => (
          <Col key={p.id} xs={24} md={12} lg={8}>
            <Card
              title={
                <Space>
                  <Tag dir="ltr">{p.key}</Tag>
                  {p.name}
                </Space>
              }
              extra={<Tag color={p.status === 'ACTIVE' ? 'green' : 'default'}>{STATUS_LABEL[p.status]}</Tag>}
            >
              <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
                {p.description ?? '—'}
              </Typography.Paragraph>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                تاریخ هدف: {faDigits(toJalali(p.targetDate))}
              </Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        open={open}
        title="پروژه جدید"
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="key"
            label="کلید پروژه"
            tooltip="پیشوند کلید کارها، مثلاً BE برای بک‌اند"
            rules={[{ required: true, pattern: /^[A-Za-z]{2,6}$/, message: '۲ تا ۶ حرف انگلیسی، مثل IPX.' }]}
          >
            <Input dir="ltr" placeholder="BE" />
          </Form.Item>
          <Form.Item name="name" label={<FieldLabel label="نام پروژه" help="اسمی که تیم با آن صدایش می‌کند." />} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="توضیح">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="targetDate" label={<FieldLabel label="تاریخ هدف" helpKey="projectTarget" />}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
