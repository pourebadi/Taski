import { Tooltip } from 'antd';
import { ClockCircleOutlined, UserOutlined, WarningFilled } from '@ant-design/icons';
import { t } from '../lib/i18n';
import { toJalali, faDigits } from '../lib/date';
import { HealthBadge, PriorityBadge, WorkKey, priorityColor } from './Badges';
import DriftRibbon from './DriftRibbon';

export type WorkItem = {
  id: string;
  key: string;
  title: string;
  priority: string;
  workflowState: string;
  deliveryHealth: string;
  workStream: string;
  currentEta?: string | null;
  firstCommittedEta?: string | null;
  estimateHours?: number | null;
  primaryAssigneeId?: string | null;
  driftWorkingDays?: number | null;
};

const isOverdue = (item: WorkItem) =>
  !!item.currentEta &&
  new Date(item.currentEta) < new Date() &&
  !['DONE', 'CANCELLED'].includes(item.workflowState);

export default function WorkItemCard({
  item,
  onClick,
  assigneeName,
  handle,
}: {
  item: WorkItem;
  onClick?: () => void;
  assigneeName?: string;
  /** دستگیره‌ی جابه‌جایی، اگر کارت روی بورد باشد */
  handle?: React.ReactNode;
}) {
  const overdue = isOverdue(item);

  return (
    <article className="card-interactive" style={{ marginBottom: 8, overflow: 'hidden' }}>
      <span className="priority-rail" style={{ background: priorityColor(item.priority) }} aria-hidden="true" />

      <div style={{ padding: '10px 12px 10px 14px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <WorkKey value={item.key} />
          <span style={{ flex: 1 }} />
          {overdue && (
            <Tooltip title="تاریخ تحویل گذشته است">
              <WarningFilled style={{ color: 'var(--danger)', fontSize: 13 }} aria-label="از مهلت گذشته" />
            </Tooltip>
          )}
          {handle}
        </header>

        {/* کل کارت کلیک‌پذیر نیست؛ یک دکمه‌ی واقعی است تا با کیبورد و
            صفحه‌خوان هم کار کند و با dnd هم تداخل نداشته باشد. */}
        <button
          type="button"
          onClick={onClick}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'start',
            background: 'none',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            font: 'inherit',
            color: 'var(--text)',
            fontWeight: 500,
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          {item.title}
        </button>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <PriorityBadge priority={item.priority} />
          <HealthBadge health={item.deliveryHealth} />
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t(`stream.${item.workStream}`)}</span>
        </div>

        {(item.currentEta || assigneeName) && (
          <footer
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 9,
              paddingTop: 8,
              borderTop: '1px solid var(--line)',
              fontSize: 11.5,
              color: overdue ? 'var(--danger)' : 'var(--text-muted)',
            }}
          >
            {item.currentEta && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ClockCircleOutlined aria-hidden="true" />
                <span className="tabular">{faDigits(toJalali(item.currentEta))}</span>
                <span className="sr-only">تاریخ تحویل فعلی</span>
              </span>
            )}
            {assigneeName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <UserOutlined aria-hidden="true" />
                {assigneeName}
                <span className="sr-only">مجری</span>
              </span>
            )}
          </footer>
        )}

        {item.driftWorkingDays != null && item.driftWorkingDays !== 0 && (
          <div style={{ marginTop: 8 }}>
            <DriftRibbon
              baseline={item.firstCommittedEta}
              current={item.currentEta}
              driftDays={item.driftWorkingDays}
              compact
            />
          </div>
        )}
      </div>
    </article>
  );
}
