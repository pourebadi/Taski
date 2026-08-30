import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { toJalali, faDigits } from '../lib/date';
import WorkItemDrawer from '../components/WorkItemDrawer';
import CreateWorkItemModal from '../components/CreateWorkItemModal';
import type { WorkItem } from '../components/WorkItemCard';

const HEALTH_COLOR: Record<string, string> = {
  ON_TRACK: 'green',
  AT_RISK: 'orange',
  BLOCKED: 'red',
  UNKNOWN: 'default',
};

export default function WorkList() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    // جست‌وجو ورودی کاربر را نرمال می‌کند؛ «كاربر» و «کاربر» یک نتیجه می‌دهند. (PM-D3)
    const path = query.trim()
      ? `/work-items/search?q=${encodeURIComponent(query.trim())}`
      : `/work-items${projectId ? `?projectId=${projectId}` : ''}`;
    api<WorkItem[]>(path)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [query, projectId]);

  useEffect(load, [load]);
  useEffect(() => {
    api<any[]>('/projects').then(setProjects).catch(() => setProjects([]));
  }, []);

  return (
    <>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>فهرست کارها</Typography.Title>
        <Space wrap>
          <Input
            placeholder="جست‌وجو در عنوان یا کلید"
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
            allowClear
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select
            allowClear
            placeholder="پروژه"
            style={{ width: 180 }}
            onChange={setProjectId}
            options={[
              { value: 'none', label: t('common.noProject') },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            کار جدید
          </Button>
        </Space>
      </Space>

      <Table<WorkItem>
        rowKey="id"
        loading={loading}
        dataSource={items}
        onRow={(row) => ({ onClick: () => setOpenId(row.id), style: { cursor: 'pointer' } })}
        pagination={{ pageSize: 25, showSizeChanger: false }}
        columns={[
          { title: 'کلید', dataIndex: 'key', width: 100, render: (v) => <span dir="ltr">{v}</span> },
          { title: 'عنوان', dataIndex: 'title' },
          { title: 'اولویت', dataIndex: 'priority', width: 90, render: (p) => <Tag>{p}</Tag> },
          {
            title: 'مرحله',
            dataIndex: 'workflowState',
            width: 120,
            render: (s) => t(`state.${s}`),
          },
          {
            title: 'سلامت',
            dataIndex: 'deliveryHealth',
            width: 110,
            render: (h) => <Tag color={HEALTH_COLOR[h]}>{t(`health.${h}`)}</Tag>,
          },
          {
            title: t('eta.current'),
            dataIndex: 'currentEta',
            width: 120,
            render: (v) => faDigits(toJalali(v)),
          },
        ]}
      />

      <CreateWorkItemModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <WorkItemDrawer id={openId} open={!!openId} onClose={() => setOpenId(null)} onChanged={load} />
    </>
  );
}
