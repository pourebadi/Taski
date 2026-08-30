import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Input, Empty, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { PriorityBadge, StateBadge, WorkKey } from './Badges';
import type { WorkItem } from './WorkItemCard';

/**
 * پرش سریع با Ctrl+K.
 *
 * در یک ابزار اجرا، آدم معمولاً کلید کار را می‌داند («BE-142 چی شد؟») ولی
 * برای رسیدن به آن باید صفحه عوض کند، فیلتر بزند و بگردد. این کار را به
 * دو کلید تبدیل می‌کند. کاملاً با کیبورد کار می‌کند و برای صفحه‌خوان هم
 * تعداد نتایج را اعلام می‌کند.
 */
export default function CommandPalette({
  onOpenItem,
}: {
  onOpenItem: (id: string) => void;
}) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const reqId = useRef(0);

  const PAGES = useMemo(
    () => [
      { key: '/my-work', label: 'کارهای من' },
      { key: '/board', label: 'بورد' },
      { key: '/work', label: 'فهرست کارها' },
      { key: '/insights', label: 'تصویر کلی' },
      { key: '/projects', label: 'پروژه‌ها' },
    ],
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open || !debounced.trim()) {
      setItems([]);
      return;
    }
    const mine = ++reqId.current;
    setLoading(true);
    api<WorkItem[]>(`/work-items/search?q=${encodeURIComponent(debounced.trim())}`)
      .then((rows) => {
        if (mine === reqId.current) setItems(rows.slice(0, 8));
      })
      .catch(() => {
        if (mine === reqId.current) setItems([]);
      })
      .finally(() => {
        if (mine === reqId.current) setLoading(false);
      });
  }, [debounced, open]);

  useEffect(() => setCursor(0), [debounced, open]);

  const pageMatches = query.trim()
    ? PAGES.filter((p) => p.label.includes(query.trim()))
    : PAGES;
  const rows: { kind: 'page' | 'item'; id: string; node: React.ReactNode }[] = [
    ...pageMatches.map((p) => ({
      kind: 'page' as const,
      id: p.key,
      node: <span style={{ fontWeight: 500 }}>{p.label}</span>,
    })),
    ...items.map((i) => ({
      kind: 'item' as const,
      id: i.id,
      node: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <WorkKey value={i.key} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {i.title}
          </span>
          <PriorityBadge priority={i.priority} />
          <StateBadge state={i.workflowState} />
        </span>
      ),
    })),
  ];

  const choose = (row: (typeof rows)[number]) => {
    setOpen(false);
    setQuery('');
    if (row.kind === 'page') nav(row.id);
    else onOpenItem(row.id);
  };

  return (
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      closable={false}
      width={560}
      styles={{ body: { padding: 0 } }}
      destroyOnClose
      aria-label="پرش سریع"
    >
      <Input
        size="large"
        autoFocus
        variant="borderless"
        prefix={<SearchOutlined aria-hidden="true" style={{ color: 'var(--text-faint)' }} />}
        placeholder="نام کار، کلید مثل BE-12، یا نام صفحه"
        aria-label="جست‌وجوی سریع"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, rows.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === 'Enter' && rows[cursor]) {
            e.preventDefault();
            choose(rows[cursor]);
          }
        }}
        style={{ borderBottom: '1px solid var(--line)', borderRadius: 0, padding: '12px 16px' }}
      />

      <div className="sr-only" aria-live="polite">
        {loading ? 'در حال جست‌وجو' : `${rows.length} نتیجه`}
      </div>

      <div style={{ maxHeight: 340, overflowY: 'auto', padding: 6 }} role="listbox">
        {loading && rows.length === 0 && (
          <div style={{ display: 'grid', placeItems: 'center', padding: 28 }}>
            <Spin />
          </div>
        )}
        {!loading && rows.length === 0 && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="چیزی پیدا نشد." style={{ padding: 20 }} />
        )}
        {rows.map((r, i) => (
          <button
            key={`${r.kind}-${r.id}`}
            type="button"
            role="option"
            aria-selected={i === cursor}
            onMouseEnter={() => setCursor(i)}
            onClick={() => choose(r)}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              gap: 8,
              padding: '9px 12px',
              border: 0,
              borderRadius: 'var(--radius-sm)',
              background: i === cursor ? 'var(--brand-soft)' : 'transparent',
              cursor: 'pointer',
              font: 'inherit',
              textAlign: 'start',
              color: 'var(--text)',
            }}
          >
            {r.node}
          </button>
        ))}
      </div>

      <div
        style={{
          borderTop: '1px solid var(--line)',
          padding: '8px 14px',
          fontSize: 11.5,
          color: 'var(--text-faint)',
          display: 'flex',
          gap: 14,
        }}
      >
        <span>↑↓ حرکت</span>
        <span>Enter باز کردن</span>
        <span>Esc بستن</span>
      </div>
    </Modal>
  );
}
