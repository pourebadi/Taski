import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { Button, Select, Space, Tooltip, App as AntApp } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { options, priorityOptions, label as termLabel, labelDual } from '../lib/terms';
import { faDigits, hoursToWorkingDays } from '../lib/date';
import DraggableCard from '../components/DraggableCard';
import WorkItemCard from '../components/WorkItemCard';
import CreateWorkItemModal from '../components/CreateWorkItemModal';
import CommitmentModal from '../components/CommitmentModal';
import WorkItemDrawer from '../components/WorkItemDrawer';
import type { WorkItem } from '../components/WorkItemCard';

// «ورودی (Inbox)» قبلاً جا افتاده بود و کارهای تازه‌رسیده از بورد نامرئی بودند. (FE-1)
const COLUMNS = ['INBOX', 'BACKLOG', 'READY', 'IN_PROGRESS', 'IN_REVIEW', 'IN_QA', 'DONE'] as const;

function Column({
  state,
  items,
  onOpen,
  nameOf,
}: {
  state: string;
  items: WorkItem[];
  onOpen: (id: string) => void;
  nameOf: (id?: string | null) => string | undefined;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: state });

  // جمع تخمین کارهای این ستون — نشان می‌دهد چقدر کار اینجا نشسته
  const estHours = items.reduce((s, i) => s + (i.estimateHours ?? 0), 0);
  const estDays = Math.round(hoursToWorkingDays(estHours) * 10) / 10;

  return (
    <section className="board-column" aria-label={`${termLabel('state', state)} — ${items.length} کار`}>
      <header className="board-column-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{labelDual('state', state)}</span>
          {estHours > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }} className="tabular">
              ≈ {faDigits(estDays)} روز کاری
            </span>
          )}
        </div>
        <span className="board-count" aria-hidden="true">
          {faDigits(items.length)}
        </span>
      </header>
      <div ref={setNodeRef} className="board-column-body" data-over={isOver}>
        {items.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center', padding: '24px 8px' }}>
            خالی
          </p>
        ) : (
          items.map((i) => (
            <DraggableCard
              key={i.id}
              item={i}
              onOpen={() => onOpen(i.id)}
              assigneeName={nameOf(i.primaryAssigneeId)}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default function Board() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [filters, setFilters] = useState<{ workStream?: string; priority?: string; assigneeId?: string }>({});
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [commitFor, setCommitFor] = useState<WorkItem | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<WorkItem | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const { message } = AntApp.useApp();

  // KeyboardSensor نبود، پس بورد با کیبورد اصلاً قابل استفاده نبود.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const load = useCallback(() => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v) as [string, string][],
    ).toString();
    api<WorkItem[]>(`/work-items${qs ? `?${qs}` : ''}`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [filters]);

  useEffect(load, [load]);
  useEffect(() => {
    api<any[]>('/users').then(setUsers).catch(() => setUsers([]));
  }, []);

  const nameOf = useCallback(
    (id?: string | null) => users.find((u) => u.id === id)?.fullName,
    [users],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, WorkItem[]>(COLUMNS.map((c) => [c, []]));
    for (const i of items) map.get(i.workflowState)?.push(i);
    return map;
  }, [items]);

  const onDragStart = (e: DragStartEvent) => {
    setDragging(items.find((i) => i.id === String(e.active.id)) ?? null);
  };

  /** کشیدن کارت وضعیت را عوض می‌کند؛ گذار غیرمجاز کارت را برمی‌گرداند. (PM-D1) */
  const onDragEnd = async (e: DragEndEvent) => {
    setDragging(null);
    const id = String(e.active.id);
    const next = e.over?.id ? String(e.over.id) : null;
    if (!next) return;

    const current = items.find((i) => i.id === id);
    if (!current || current.workflowState === next) return;

    // نرم، نه مانع: شروع کار بدون تعهد → مودال تعهد باز می‌شود. (D-UX-1)
    if (next === 'IN_PROGRESS' && !current.currentEta) {
      setCommitFor(current);
      message.info('برای شروع، اول تخمین و تاریخ تحویل را ثبت کن.');
      return;
    }

    const previous = items;
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, workflowState: next } : i)));

    try {
      await api(`/work-items/${id}/state`, { method: 'PATCH', body: JSON.stringify({ state: next }) });
      // نتیجه‌ی جابه‌جایی برای کاربر صفحه‌خوان هم اعلام می‌شود
      setAnnouncement(`${current.key} به ${termLabel('state', next)} منتقل شد.`);
    } catch (err) {
      setItems(previous); // بازگشت خوش‌بینانه
      setAnnouncement(`جابه‌جایی ${current.key} انجام نشد.`);
      message.error((err as Error).message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('nav.board')}</h1>
          <p className="page-subtitle">کارت را بکشید تا مرحله عوض شود. گذار غیرمجاز برگردانده می‌شود.</p>
        </div>
        <Space wrap>
          <Select
            allowClear
            placeholder="جریان کاری"
            aria-label="فیلتر جریان کاری"
            style={{ width: 148 }}
            value={filters.workStream}
            onChange={(workStream) => setFilters((f) => ({ ...f, workStream }))}
            options={options('stream')}
          />
          <Select
            allowClear
            placeholder="اولویت"
            aria-label="فیلتر اولویت"
            style={{ width: 112 }}
            value={filters.priority}
            onChange={(priority) => setFilters((f) => ({ ...f, priority }))}
            options={priorityOptions()}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="مجری"
            aria-label="فیلتر مجری"
            style={{ width: 160 }}
            value={filters.assigneeId}
            onChange={(assigneeId) => setFilters((f) => ({ ...f, assigneeId }))}
            options={users.map((u) => ({ value: u.id, label: u.fullName }))}
          />
          <Tooltip title="بارگذاری دوباره">
            <Button icon={<ReloadOutlined />} onClick={load} aria-label="بارگذاری دوباره" />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            کار جدید
          </Button>
        </Space>
      </div>

      {/* اعلان‌های زنده برای صفحه‌خوان — دیده نمی‌شود، خوانده می‌شود */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {/* در RTL ستون‌ها خودکار از راست چیده می‌شوند */}
        <div className="board-scroll">
          {COLUMNS.map((c) => (
            <Column key={c} state={c} items={grouped.get(c) ?? []} onOpen={setOpenId} nameOf={nameOf} />
          ))}
        </div>

        <DragOverlay>
          {dragging ? (
            <div style={{ width: 260, cursor: 'grabbing' }}>
              <WorkItemCard item={dragging} assigneeName={nameOf(dragging.primaryAssigneeId)} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CreateWorkItemModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      {commitFor && (
        <CommitmentModal
          open={!!commitFor}
          item={commitFor}
          onClose={() => setCommitFor(null)}
          onSaved={() => {
            setCommitFor(null);
            load();
          }}
        />
      )}
      <WorkItemDrawer id={openId} open={!!openId} onClose={() => setOpenId(null)} onChanged={load} />
    </>
  );
}
