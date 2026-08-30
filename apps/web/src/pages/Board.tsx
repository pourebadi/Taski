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
import { PlusOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { options, priorityOptions, label as termLabel } from '../lib/terms';
import { faDigits, hoursToWorkingDays } from '../lib/date';
import { useAuth } from '../lib/auth-store';
import { type BoardColumn, FLOW_STATES, effectiveColumns, columnLabel } from '../lib/board-config';
import DraggableCard from '../components/DraggableCard';
import WorkItemCard from '../components/WorkItemCard';
import CreateWorkItemModal from '../components/CreateWorkItemModal';
import CommitmentModal from '../components/CommitmentModal';
import WorkItemDrawer from '../components/WorkItemDrawer';
import BoardSettings from '../components/BoardSettings';
import type { WorkItem } from '../components/WorkItemCard';

function Column({
  state,
  label,
  items,
  onOpen,
  nameOf,
}: {
  state: string;
  label: string;
  items: WorkItem[];
  onOpen: (id: string) => void;
  nameOf: (id?: string | null) => string | undefined;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: state });

  // جمع تخمین کارهای این ستون — نشان می‌دهد چقدر کار اینجا نشسته
  const estHours = items.reduce((s, i) => s + (i.estimateHours ?? 0), 0);
  const estDays = Math.round(hoursToWorkingDays(estHours) * 10) / 10;

  return (
    <section className="board-column" aria-label={`${label} — ${items.length} کار`}>
      <header className="board-column-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{label}</span>
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
  const [boardCols, setBoardCols] = useState<BoardColumn[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const role = useAuth((s) => s.user?.role);
  const canConfigure = ['ORG_OWNER', 'ADMIN'].includes(role ?? '');
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
    // چیدمان بورد که مدیر تنظیم کرده (per-org)؛ null یعنی پیش‌فرض
    api<{ columns: BoardColumn[] | null }>('/organization/board-config')
      .then((r) => setBoardCols(r.columns))
      .catch(() => setBoardCols(null));
  }, []);

  // ستون‌های نمایان به ترتیب و با نامِ تنظیم‌شده
  const visibleColumns = useMemo(() => effectiveColumns(boardCols).filter((c) => c.visible), [boardCols]);

  const nameOf = useCallback(
    (id?: string | null) => users.find((u) => u.id === id)?.fullName,
    [users],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, WorkItem[]>(FLOW_STATES.map((c) => [c, []]));
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
          {canConfigure && (
            <Tooltip title="تنظیم بورد (ستون‌ها)">
              <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} aria-label="تنظیم بورد" />
            </Tooltip>
          )}
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
          {visibleColumns.map((col) => (
            <Column
              key={col.state}
              state={col.state}
              label={columnLabel(col)}
              items={grouped.get(col.state) ?? []}
              onOpen={setOpenId}
              nameOf={nameOf}
            />
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
      {canConfigure && (
        <BoardSettings
          open={settingsOpen}
          columns={boardCols}
          onClose={() => setSettingsOpen(false)}
          onSaved={(cols) => setBoardCols(cols)}
        />
      )}
    </>
  );
}
