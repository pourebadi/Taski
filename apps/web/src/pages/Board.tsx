import { useCallback, useEffect, useState } from 'react';
import { DndContext, DragEndEvent, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Badge, Button, Card, Select, Space, Typography, App as AntApp } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { faDigits } from '../lib/date';
import DraggableCard from '../components/DraggableCard';
import CreateWorkItemModal from '../components/CreateWorkItemModal';
import WorkItemDrawer from '../components/WorkItemDrawer';
import type { WorkItem } from '../components/WorkItemCard';

const COLUMNS = ['BACKLOG', 'READY', 'IN_PROGRESS', 'IN_REVIEW', 'IN_QA', 'DONE'] as const;
const STREAMS = ['PRODUCT', 'TECH_DEBT', 'SUPPORT', 'INFRASTRUCTURE'];

function Column({ state, items, onOpen }: { state: string; items: WorkItem[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: state });

  return (
    <div ref={setNodeRef} style={{ minWidth: 270, flex: 1 }}>
      <Card
        size="small"
        title={
          <Space>
            {t(`state.${state}`)}
            <Badge count={faDigits(items.length)} showZero color="#1c6758" />
          </Space>
        }
        styles={{ body: { background: isOver ? '#eef6f4' : '#fafafa', minHeight: 420, padding: 8 } }}
      >
        {items.map((i) => (
          <DraggableCard key={i.id} item={i} onOpen={() => onOpen(i.id)} />
        ))}
      </Card>
    </div>
  );
}

export default function Board() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [filters, setFilters] = useState<{ workStream?: string; priority?: string; assigneeId?: string }>({});
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { message } = AntApp.useApp();

  // کشیدن فقط بعد از ۵ پیکسل حرکت شروع شود تا کلیک روی کارت هم کار کند
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(() => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v) as [string, string][],
    ).toString();
    api<WorkItem[]>(`/work-items${qs ? `?${qs}` : ''}`).then(setItems).catch(() => setItems([]));
  }, [filters]);

  useEffect(load, [load]);
  useEffect(() => {
    api<any[]>('/users').then(setUsers).catch(() => setUsers([]));
  }, []);

  /** کشیدن کارت وضعیت را عوض می‌کند؛ گذار غیرمجاز کارت را برمی‌گرداند. (PM-D1) */
  const onDragEnd = async (e: DragEndEvent) => {
    const id = String(e.active.id);
    const next = e.over?.id ? String(e.over.id) : null;
    if (!next) return;

    const current = items.find((i) => i.id === id);
    if (!current || current.workflowState === next) return;

    const previous = items;
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, workflowState: next } : i)));

    try {
      await api(`/work-items/${id}/state`, { method: 'PATCH', body: JSON.stringify({ state: next }) });
    } catch (err) {
      setItems(previous); // بازگشت خوش‌بینانه
      message.error((err as Error).message);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('nav.board')}</Typography.Title>
        <Space wrap>
          <Select
            allowClear
            placeholder="جریان کاری"
            style={{ width: 150 }}
            onChange={(workStream) => setFilters((f) => ({ ...f, workStream }))}
            options={STREAMS.map((s) => ({ value: s, label: t(`stream.${s}`) }))}
          />
          <Select
            allowClear
            placeholder="اولویت"
            style={{ width: 110 }}
            onChange={(priority) => setFilters((f) => ({ ...f, priority }))}
            options={['P0', 'P1', 'P2', 'P3'].map((p) => ({ value: p, label: p }))}
          />
          <Select
            allowClear
            placeholder="مجری"
            style={{ width: 160 }}
            onChange={(assigneeId) => setFilters((f) => ({ ...f, assigneeId }))}
            options={users.map((u) => ({ value: u.id, label: u.fullName }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            کار جدید
          </Button>
        </Space>
      </Space>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {/* در RTL ستون‌ها خودکار از راست چیده می‌شوند */}
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {COLUMNS.map((c) => (
            <Column key={c} state={c} items={items.filter((i) => i.workflowState === c)} onOpen={setOpenId} />
          ))}
        </div>
      </DndContext>

      <CreateWorkItemModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <WorkItemDrawer id={openId} open={!!openId} onClose={() => setOpenId(null)} onChanged={load} />
    </>
  );
}
