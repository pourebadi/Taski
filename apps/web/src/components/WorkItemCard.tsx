import { Card, Tag, Typography, Tooltip } from 'antd';
import { t } from '../lib/i18n';
import { toJalali, faDigits } from '../lib/date';

export type WorkItem = {
  id: string;
  key: string;
  title: string;
  priority: string;
  workflowState: string;
  deliveryHealth: string;
  workStream: string;
  currentEta?: string | null;
  estimateHours?: number | null;
};

const HEALTH_COLOR: Record<string, string> = {
  ON_TRACK: 'green',
  AT_RISK: 'orange',
  BLOCKED: 'red',
  UNKNOWN: 'default',
};

const PRIORITY_COLOR: Record<string, string> = { P0: 'red', P1: 'volcano', P2: 'blue', P3: 'default' };

export default function WorkItemCard({ item, onClick }: { item: WorkItem; onClick?: () => void }) {
  return (
    <Card size="small" hoverable onClick={onClick} style={{ marginBottom: 8 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }} dir="ltr">
        {item.key}
      </Typography.Text>
      <div style={{ margin: '4px 0 8px', fontWeight: 500 }}>{item.title}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Tag color={PRIORITY_COLOR[item.priority]}>{item.priority}</Tag>
        {/* سلامت تحویل مستقل از مرحله اجراست — دو محور جدا. (PRD 7.2) */}
        <Tag color={HEALTH_COLOR[item.deliveryHealth]}>{t(`health.${item.deliveryHealth}`)}</Tag>
        <Tag>{t(`stream.${item.workStream}`)}</Tag>
      </div>
      {item.currentEta && (
        <Tooltip title={t('eta.current')}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {faDigits(toJalali(item.currentEta))}
          </Typography.Text>
        </Tooltip>
      )}
    </Card>
  );
}
