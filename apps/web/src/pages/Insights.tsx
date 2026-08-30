import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Segmented, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { HELP } from '../lib/help';
import { faDigits } from '../lib/date';
import { useAuth } from '../lib/auth-store';

const HEALTH_COLORS: Record<string, string> = {
  ON_TRACK: '#52c41a', AT_RISK: '#faad14', BLOCKED: '#f5222d', UNKNOWN: '#bfbfbf',
};
const STREAM_COLORS = ['#1c6758', '#3d8361', '#a0c49d', '#d6efc7'];

type Overview = {
  totals: Record<string, number>;
  workStreamShare: { stream: string; hours: number; percent: number }[];
  healthDistribution: { name: string; count: number }[];
  stateDistribution: { name: string; count: number }[];
  priorityDistribution: { name: string; count: number }[];
  commitmentAccuracy: {
    measured: number; onTime: number; onTimePercent: number | null;
    averageDelayWorkingDays: number | null; worstDelayWorkingDays: number | null;
  };
  blockedRatioPercent: number;
};

type Stability = { id: string; key: string; title: string; shifts: number; movement: number }[];
type Reasons = { byReason: { reason: string; count: number; totalDays: number }[]; byChangedField: { field: string; count: number }[] };
type Workload = { userId: string; fullName: string; capacityHours: number; openItems: number; estimatedHours: number; blocked: number; p0: number; inReviewQueue: number }[];

const FIELD_LABEL: Record<string, string> = {
  PRIORITY: 'اولویت', DUE_DATE: 'مهلت', ASSIGNEE: 'مجری',
  OWNER: 'مالک', CANCEL: 'لغو', REVIEWER: 'بازبین',
};

function Help({ k }: { k: string }) {
  return (
    <Tooltip title={HELP[k]} overlayStyle={{ maxWidth: 340 }}>
      <InfoCircleOutlined style={{ color: '#8c8c8c', marginInlineStart: 4, fontSize: 13, cursor: 'help' }} />
    </Tooltip>
  );
}

export default function Insights() {
  const role = useAuth((s) => s.user?.role);
  const canSeeTeam = ['ORG_OWNER', 'ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'].includes(role ?? '');

  const [tab, setTab] = useState<string>('سازمان');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stability, setStability] = useState<Stability>([]);
  const [reasons, setReasons] = useState<Reasons | null>(null);
  const [workload, setWorkload] = useState<Workload>([]);
  const [throughput, setThroughput] = useState<{ weekStart: string; count: number }[]>([]);

  useEffect(() => {
    api<Overview>('/analytics/overview').then(setOverview).catch(() => setOverview(null));
    api<Stability>('/analytics/schedule-stability').then(setStability).catch(() => setStability([]));
    api<Reasons>('/analytics/delay-reasons').then(setReasons).catch(() => setReasons(null));
    api<any[]>('/analytics/throughput').then(setThroughput).catch(() => setThroughput([]));
    if (canSeeTeam) api<Workload>('/analytics/team-workload').then(setWorkload).catch(() => setWorkload([]));
  }, [canSeeTeam]);

  if (!overview) return <Empty description="هنوز داده‌ای برای نمایش نیست. چند کار ثبت کنید تا نمودارها پر شوند." />;

  const { totals, commitmentAccuracy: acc } = overview;

  return (
    <>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>تصویر کلی</Typography.Title>
        <Segmented
          value={tab}
          onChange={(v) => setTab(String(v))}
          options={canSeeTeam ? ['سازمان', 'برنامه‌ریزی', 'تیم'] : ['سازمان', 'برنامه‌ریزی']}
        />
      </Space>

      {tab === 'سازمان' && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {[
              ['کار در جریان', totals.active, null],
              ['مسدود', totals.blocked, 'blockedRatio'],
              ['در خطر', totals.atRisk, null],
              ['از مهلت گذشته', totals.overdue, null],
              ['بی‌خبر', totals.stale, 'staleItems'],
              ['بدون مجری', totals.unassigned, null],
            ].map(([label, value, help]) => (
              <Col key={String(label)} xs={12} md={4}>
                <Card size="small">
                  <Statistic
                    title={<>{label}{help ? <Help k={String(help)} /> : null}</>}
                    value={faDigits(Number(value))}
                    valueStyle={{
                      color: Number(value) > 0 && ['مسدود', 'از مهلت گذشته'].includes(String(label)) ? '#cf1322' : undefined,
                    }}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {totals.blocked > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`${faDigits(totals.blocked)} کار الان مسدود است. اینها اول از همه به تصمیم نیاز دارند، نه به زمان بیشتر.`}
            />
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card size="small" title={<>ظرفیت کجا خرج می‌شود<Help k="workStream" /></>}>
                {overview.workStreamShare.some((s) => s.hours > 0) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={overview.workStreamShare.filter((s) => s.hours > 0)}
                        dataKey="hours"
                        nameKey="stream"
                        outerRadius={90}
                        label={(e: any) => `${t(`stream.${e.stream}`)} ${faDigits(e.percent)}٪`}
                      >
                        {overview.workStreamShare.map((_, i) => (
                          <Cell key={i} fill={STREAM_COLORS[i % STREAM_COLORS.length]} />
                        ))}
                      </Pie>
                      <RTooltip formatter={(v: any, n: any) => [`${v} ساعت`, t(`stream.${n}`)]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="برای این نمودار باید روی کارها تخمین ساعت ثبت شود." />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title={<>سلامت کارهای باز<Help k="deliveryHealth" /></>}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={overview.healthDistribution}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      label={(e: any) => `${t(`health.${e.name}`)} (${faDigits(e.count)})`}
                    >
                      {overview.healthDistribution.map((h, i) => (
                        <Cell key={i} fill={HEALTH_COLORS[h.name] ?? '#d9d9d9'} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v: any, n: any) => [v, t(`health.${n}`)]} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title="کارها در هر مرحله">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={overview.stateDistribution.map((s) => ({ ...s, label: t(`state.${s.name}`) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} reversed />
                    <YAxis orientation="right" allowDecimals={false} />
                    <RTooltip />
                    <Bar dataKey="count" name="تعداد" fill="#1c6758" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title="کارهای بسته‌شده در هر هفته">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={throughput}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} reversed />
                    <YAxis orientation="right" allowDecimals={false} />
                    <RTooltip />
                    <Line type="monotone" dataKey="count" name="تحویل" stroke="#1c6758" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {tab === 'برنامه‌ریزی' && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title={<>سر وقت رسیدند<Help k="commitmentAccuracy" /></>}
                  value={acc.onTimePercent === null ? '—' : faDigits(acc.onTimePercent)}
                  suffix={acc.onTimePercent === null ? '' : '٪'}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="میانگین تأخیر"
                  value={acc.averageDelayWorkingDays === null ? '—' : faDigits(acc.averageDelayWorkingDays)}
                  suffix={acc.averageDelayWorkingDays === null ? '' : ' روز کاری'}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="بدترین تأخیر" value={acc.worstDelayWorkingDays === null ? '—' : faDigits(acc.worstDelayWorkingDays)} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="کار اندازه‌گیری‌شده" value={faDigits(acc.measured)} />
              </Card>
            </Col>
          </Row>

          {acc.measured === 0 && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="هنوز کاری با تعهد اولیه تمام نشده. وقتی چند کار بسته شد، اینجا معلوم می‌شود برآوردهایمان چقدر دقیق‌اند."
            />
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card size="small" title="تاریخ‌ها به چه دلیلی عوض شدند">
                {reasons?.byReason.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      layout="vertical"
                      data={reasons.byReason.map((r) => ({ ...r, label: t(`reason.${r.reason}`) }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" orientation="top" allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={95} tick={{ fontSize: 11 }} orientation="right" />
                      <RTooltip />
                      <Legend />
                      <Bar dataKey="totalDays" name="روز کاری عقب‌افتادگی" fill="#f5222d" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="count" name="دفعات" fill="#1c6758" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="هنوز تغییر تاریخی ثبت نشده." />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title="چه چیزهایی بیشتر جابه‌جا می‌شوند">
                {reasons?.byChangedField.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={reasons.byChangedField.map((f) => ({ ...f, label: FIELD_LABEL[f.field] ?? f.field }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" reversed tick={{ fontSize: 11 }} />
                      <YAxis orientation="right" allowDecimals={false} />
                      <RTooltip />
                      <Bar dataKey="count" name="دفعات تغییر" fill="#faad14" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="هنوز تغییری در اولویت یا مهلت ثبت نشده." />
                )}
              </Card>
            </Col>

            <Col xs={24}>
              <Card size="small" title={<>بی‌ثبات‌ترین برنامه‌ها<Help k="cumulativeMovement" /></>}>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={stability}
                  locale={{ emptyText: 'هنوز کاری تاریخش را عوض نکرده. خبر خوبی است.' }}
                  columns={[
                    { title: 'کلید', dataIndex: 'key', width: 100, render: (v) => <span dir="ltr">{v}</span> },
                    { title: 'عنوان', dataIndex: 'title' },
                    { title: 'دفعات جابه‌جایی', dataIndex: 'shifts', width: 130, render: (v) => faDigits(v) },
                    {
                      title: 'مجموع حرکت (روز کاری)',
                      dataIndex: 'movement',
                      width: 180,
                      render: (v) => <Tag color={v > 5 ? 'red' : v > 2 ? 'orange' : 'default'}>{faDigits(v)}</Tag>,
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {tab === 'تیم' && canSeeTeam && (
        <Card size="small" title="بار کاری اعضا">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="این جدول برای برنامه‌ریزی ظرفیت است، نه ارزیابی افراد. عدد بالا لزوماً یعنی پرکارتر نیست؛ یعنی کار بیشتری روی دوشش است."
          />
          <Table
            rowKey="userId"
            size="small"
            pagination={false}
            dataSource={workload}
            columns={[
              { title: 'نام', dataIndex: 'fullName' },
              { title: 'کار باز', dataIndex: 'openItems', render: (v) => faDigits(v) },
              {
                title: <>ساعت تخمینی<Help k="estimateHours" /></>,
                dataIndex: 'estimatedHours',
                render: (v: number, row: any) => (
                  <Tag color={v > row.capacityHours ? 'red' : 'default'}>
                    {faDigits(v)} از {faDigits(row.capacityHours)}
                  </Tag>
                ),
              },
              { title: 'P0', dataIndex: 'p0', render: (v) => (v ? <Tag color="red">{faDigits(v)}</Tag> : '—') },
              { title: 'مسدود', dataIndex: 'blocked', render: (v) => (v ? <Tag color="orange">{faDigits(v)}</Tag> : '—') },
              { title: 'صف بازبینی', dataIndex: 'inReviewQueue', render: (v) => faDigits(v) },
            ]}
          />
        </Card>
      )}
    </>
  );
}
