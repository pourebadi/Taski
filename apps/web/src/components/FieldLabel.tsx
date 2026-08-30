import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { HELP } from '../lib/help';

/**
 * برچسب فیلد با آیکون راهنما.
 * متن راهنما از یک جای واحد می‌آید تا همه‌جا یکسان باشد. (lib/help.ts)
 */
export default function FieldLabel({ label, helpKey, help }: { label: string; helpKey?: string; help?: string }) {
  const text = help ?? (helpKey ? HELP[helpKey] : undefined);
  if (!text) return <>{label}</>;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {label}
      <Tooltip title={text} overlayStyle={{ maxWidth: 340 }}>
        <InfoCircleOutlined style={{ color: 'var(--text-faint)', cursor: 'help', fontSize: 13 }} />
      </Tooltip>
    </span>
  );
}
