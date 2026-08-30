import { useEffect, useState } from 'react';
import { Drawer, Button, Switch, Input, Tooltip, App as AntApp } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { labelDual } from '../lib/terms';
import {
  type BoardColumn,
  PRESETS,
  columnsFromPreset,
  effectiveColumns,
  defaultColumns,
  type Preset,
} from '../lib/board-config';

export default function BoardSettings({
  open,
  columns,
  onClose,
  onSaved,
}: {
  open: boolean;
  columns: BoardColumn[] | null;
  onClose: () => void;
  onSaved: (cols: BoardColumn[]) => void;
}) {
  const [draft, setDraft] = useState<BoardColumn[]>(defaultColumns());
  const [saving, setSaving] = useState(false);
  const { message } = AntApp.useApp();

  useEffect(() => {
    if (open) setDraft(effectiveColumns(columns));
  }, [open, columns]);

  const move = (i: number, dir: -1 | 1) => {
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const toggle = (i: number) => setDraft((d) => d.map((c, idx) => (idx === i ? { ...c, visible: !c.visible } : c)));
  const rename = (i: number, v: string) =>
    setDraft((d) => d.map((c, idx) => (idx === i ? { ...c, label: v.trim() ? v : null } : c)));
  const applyPreset = (p: Preset) => setDraft(columnsFromPreset(p));

  const visibleCount = draft.filter((c) => c.visible).length;

  const save = async () => {
    if (visibleCount === 0) {
      message.error('حداقل یک ستون باید نمایش داده شود.');
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ columns: BoardColumn[] }>('/organization/board-config', {
        method: 'PATCH',
        body: JSON.stringify({ columns: draft }),
      });
      message.success('چیدمان بورد برای همه‌ی تیم ذخیره شد.');
      onSaved(res.columns ?? draft);
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="تنظیم بورد"
      width={440}
      styles={{ body: { paddingTop: 12 } }}
      extra={
        <Button type="primary" loading={saving} onClick={save}>
          ذخیره برای همه
        </Button>
      }
    >
      <p style={{ marginTop: 0, color: 'var(--text-muted)', fontSize: 13 }}>
        یک مدل آماده را انتخاب کن یا ستون‌ها را دستی تنظیم کن. این چیدمان فقط <b>نمایش</b> بورد را عوض می‌کند؛ مرحله‌ی
        واقعی کارها دست‌نخورده می‌ماند.
      </p>

      <div className="form-section-label">مدل‌های آماده</div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
        {PRESETS.map((p) => (
          <button key={p.key} type="button" className="preset-card" onClick={() => applyPreset(p)}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{p.hint}</div>
          </button>
        ))}
      </div>

      <div className="form-section-label">ستون‌ها ({visibleCount} نمایان)</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {draft.map((col, i) => (
          <div key={col.state} className="col-row" data-off={!col.visible}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Tooltip title="بالا">
                <button
                  type="button"
                  className="col-move"
                  aria-label={`${labelDual('state', col.state)} بالاتر`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <UpOutlined />
                </button>
              </Tooltip>
              <Tooltip title="پایین">
                <button
                  type="button"
                  className="col-move"
                  aria-label={`${labelDual('state', col.state)} پایین‌تر`}
                  disabled={i === draft.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <DownOutlined />
                </button>
              </Tooltip>
            </div>
            <Input
              size="small"
              value={col.label ?? ''}
              placeholder={labelDual('state', col.state)}
              onChange={(e) => rename(i, e.target.value)}
              aria-label={`نام ستون ${labelDual('state', col.state)}`}
            />
            <Switch
              size="small"
              checked={col.visible}
              onChange={() => toggle(i)}
              aria-label={`نمایش ${labelDual('state', col.state)}`}
            />
          </div>
        ))}
      </div>

      <Button block style={{ marginTop: 16 }} onClick={() => setDraft(defaultColumns())}>
        بازگشت به پیش‌فرض
      </Button>
    </Drawer>
  );
}
