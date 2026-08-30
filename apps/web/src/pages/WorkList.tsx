import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Select, Space, Table, Tooltip, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { toJalali, faDigits } from '../lib/date';
import WorkItemDrawer from '../components/WorkItemDrawer';
import CreateWorkItemModal from '../components/CreateWorkItemModal';
import { HealthBadge, PriorityBadge, StateBadge, WorkKey } from '../components/Badges';
import type { WorkItem } from '../components/WorkItemCard';

export default function WorkList() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [query, setQuery] = useState('');
  // هر حرفِ تایپ‌شده یک درخواست می‌فرستاد و پاسخ‌های قدیمی‌تر گاهی
  // روی نتیجه‌ی جدید می‌نشستند.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const requestId = useRef(0);

  const [projectId, setProjectId] = useState<string | undefined>();
  const [priority, setPriority] = useState<string | undefined>();
  const [health, setHealth] = useState<string | undefined>();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(() => {
    setLoading(true);
    const mine = ++requestId.current;

    let path: string;
    if (debouncedQuery.trim()) {
      // جست‌وجو ورودی کاربر را نرمال می‌کند؛ «كاربر» و «کاربر» یک نتیجه می‌دهند. (PM-D3)
      path = `/work-items/search?q=${encodeURIComponent(debouncedQuery.trim())}`;
    } else {
      const qs = new URLSearchParams();
      if (projectId) qs.set('projectId', projectId);
      if (priority) qs.set('priority', priority);
      if (health) qs.set('deliveryHealth', health);
      path = `/work-items${qs.toString() ? `?${qs}` : ''}`;
    }

    api<WorkItem[]>(path)
      .then((rows) => {
        if (mine === requestId.current) setItems(rows);
      })
      .catch(() => {
        if (mine === requestId.current) setItems([]);
      })
      .finally(() => {
        if (mine === requestId.current) setLoading(false);
      });
  }, [debouncedQuery, projectId, priority, health]);

  useEffect(load, [load]);
  useEffect(() => {
    api<any[]>('/projects').then(setProjects).catch(() => setProjects([]));
    api<any[]>('/users').then(setUsers).catch(() => setUsers([]));
  }, []);

  const searching = !!debouncedQuery.trim();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">فهرست کارها</h1>
          <p className="page-subtitle">
            {loading ? 'در حال بارگذاری…' : `${faDigits(items.length)} کار`}
            {searching && ' — نتیجه‌ی جست‌وجو'}
          </p>
        </div>
        <Space wrap>
          <Input
            placeholder="جست‌وجو در عنوان یا کلید"
            aria-label="جست‌وجو در کارها"
            prefix={<SearchOutlined aria-hidden="true" />}
            style={{ width: 240 }}
            allowClear
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select
            allowClear
            placeholder="پروژه"
            aria-label="فیلتر پروژه"
            style={{ width: 168 }}
            disabled={searching}
            value={projectId}
            onChange={setProjectId}
            options={[
              { value: 'none', label: t('common.noProject') },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <Select
            allowClear
            placeholder="اولویت"
            aria-label="فیلتر اولویت"
            style={{ width: 112 }}
            disabled={searching}
            value={priority}
            onChange={setPriority}
            options={['P0', 'P1', 'P2', 'P3'].map((p) => ({ value: p, label: p }))}
          />
          <Select
            allowClear
            placeholder="سلامت"
            aria-label="فیلتر سلامت تحویل"
            style={{ width: 130 }}
            disabled={searching}
            value={health}
            onChange={setHealth}
            options={['ON_TRACK', 'AT_RISK', 'BLOCKED', 'UNKNOWN'].map((h) => ({
              value: h,
              label: t(`health.${h}`),
            }))}
          />
          <Tooltip title="بارگذاری دوباره">
            <Button icon={<ReloadOutlined />} onClick={load} aria-label="بارگذاری دوباره" />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            کار جدید
          </Button>
        </Space>
      </div>

      {searching && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          هنگام جست‌وجو، فیلترها اعمال نمی‌شوند. برای فیلتر کردن، کادر جست‌وجو را خالی کنید.
        </Typography.Text>
      )}

      <Table<WorkItem>
        rowKey="id"
        loading={loading}
        dataSource={items}
        rowClassName="row-clickable"
        scroll={{ x: 720 }}
        onRow={(row) => ({
          onClick: () => setOpenId(row.id),
          style: { cursor: 'pointer' },
        })}
        locale={{
          emptyText: (
            <div className="empty-state" style={{ border: 0, background: 'transparent' }}>
              <span>{searching ? 'چیزی با این عبارت پیدا نشد.' : 'هنوز کاری ثبت نشده.'}</span>
              {!searching && (
                <Button type="primary" size="small" onClick={() => setCreateOpen(true)}>
                  اولین کار را بسازید
                </Button>
              )}
            </div>
          ),
        }}
        pagination={{ pageSize: 25, showSizeChanger: false, hideOnSinglePage: true }}
        columns={[
          {
            title: 'کلید',
            dataIndex: 'key',
            width: 96,
            render: (v) => <WorkKey value={v} />,
          },
          {
            title: 'عنوان',
            dataIndex: 'title',
            render: (v, row) => (
              <div>
                <div style={{ fontWeight: 500 }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t(`stream.${row.workStream}`)}</div>
              </div>
            ),
          },
          {
            title: 'اولویت',
            dataIndex: 'priority',
            width: 90,
            sorter: (a, b) => a.priority.localeCompare(b.priority),
            render: (p) => <PriorityBadge priority={p} />,
          },
          {
            title: 'مرحله',
            dataIndex: 'workflowState',
            width: 118,
            render: (s) => <StateBadge state={s} />,
          },
          {
            title: 'سلامت',
            dataIndex: 'deliveryHealth',
            width: 118,
            render: (h) => <HealthBadge health={h} />,
          },
          {
            title: 'مجری',
            dataIndex: 'primaryAssigneeId',
            width: 120,
            render: (id) => users.find((u) => u.id === id)?.fullName ?? '—',
          },
          {
            title: t('eta.current'),
            dataIndex: 'currentEta',
            width: 118,
            sorter: (a, b) => (a.currentEta ?? '').localeCompare(b.currentEta ?? ''),
            render: (v) => <span className="tabular">{faDigits(toJalali(v))}</span>,
          },
        ]}
      />

      <CreateWorkItemModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <WorkItemDrawer id={openId} open={!!openId} onClose={() => setOpenId(null)} onChanged={load} />
    </>
  );
}
