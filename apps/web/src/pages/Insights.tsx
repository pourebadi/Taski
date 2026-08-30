import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Segmented, Space, Spin, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { HELP } from '../lib/help';
import { faDigits, toJalali } from '../lib/date';
import { useAuth } from '../lib/auth-store';
import { useThemeMode } from '../theme/ThemeProvider';
import { COLOR_TOKENS } from '../theme/tokens';

// recharts رنگ را به‌صورت attributeِ SVG می‌گذارد و var() آنجا کار نمی‌کند،
// پس رنگ‌های داده را از مقدارِ concreteِ توکن‌ها بر اساس تمِ فعلی می‌سازیم
// (useChartColors)؛ این‌طور در تیره هم درست است.
function useChartColors() {
  const { mode } = useThemeMode();
  const c = COLOR_TOKENS[mode];
  return {
    brand: c.brand,
    danger: c.danger,
    warn: c.warn,
    axisText: c['text-muted'],
    grid: c['line-soft'],
    health: { ON_TRACK: c.ok, AT_RISK: c.warn, BLOCKED: c.danger, UNKNOWN: c.unknown } as Record<string, string>,
    stream: { PRODUCT: c.brand, TECH_DEBT: c.warn, SUPPORT: c.unknown, INFRASTRUCTURE: c.focus } as Record<string, string>,
    line: c.line,
  };
}

// ارقام محورها و تولتیپ‌ها هم باید فارسی باشند، نه لاتین. (رفع B1)
const numTick = (v: any) => faDigits(v);
// تولتیپ هماهنگ با تم (در تیره هم خوانا)
const TOOLTIP = {
  contentStyle: {
    background: 'var(--elevated)',
    border: '1px solid var(--line-soft)',
    borderRadius: 8,
    boxShadow: 'var(--shadow-2)',
  },
  itemStyle: { color: 'var(--text)' },
  labelStyle: { color: 'var(--text-muted)' },
} as const;
const CHART_MARGIN = { top: 8, right: 12, bottom: 8, left: 12 };

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
  OWNER: 'مسئول', CANCEL: 'لغو', REVIEWER: 'تأییدکننده',
};

function Help({ k }: { k: string }) {
  return (
    <Tooltip title={HELP[k]} overlayStyle={{ maxWidth: 340 }}>
      <InfoCircleOutlined style={{ color: 'var(--text-faint)', marginInlineStart: 4, fontSize: 13, cursor: 'help' }} />
    </Tooltip>
  );
}

export default function Insights() {
  const role = useAuth((s) => s.user?.role);
  const canSeeTeam = ['ORG_OWNER', 'ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'].includes(role ?? '');

  const [tab, setTab] = useState<'org' | 'planning' | 'team'>('org');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stability, setStability] = useState<Stability>([]);
  const [reasons, setReasons] = useState<Reasons | null>(null);
  const [workload, setWorkload] = useState<Workload>([]);
  const [throughput, setThroughput] = useState<{ weekStart: string; count: number }[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const colors = useChartColors();

  useEffect(() => {
    setStatus('loading');
    api<Overview>('/analytics/overview')
      .then((d) => {
        setOverview(d);
        setStatus('ready');
      })
      .catch(() => {
        setOverview(null);
        setStatus('error');
      });
    api<Stability>('/analytics/schedule-stability').then(setStability).catch(() => setStability([]));
    api<Reasons>('/analytics/delay-reasons').then(setReasons).catch(() => setReasons(null));
    api<any[]>('/analytics/throughput').then(setThroughput).catch(() => setThroughput([]));
    if (canSeeTeam) api<Workload>('/analytics/team-workload').then(setWorkload).catch(() => setWorkload([]));
  }, [canSeeTeam]);

  // پیش‌تر خطای شبکه و «داده‌ای نیست» هر دو یک پیام می‌دادند و عملاً
  // یک صفحه‌ی خراب به‌نظر خالی می‌رسید.
  if (status === 'loading') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (status === 'error' || !overview) {
    return (
      <Alert
        type="error"
        showIcon
        message="آمار بارگذاری نشد."
        description="ارتباط با سرور برقرار نشد یا دسترسی لازم را ندارید. صفحه را دوباره باز کنید."
      />
    );
  }

  const { totals, commitmentAccuracy: acc } = overview;

  return (
    <>
      <div className="page-head" style={{ marginBottom: 12 }}>
        <div>
          <h1 className="page-title">تصویر کلی</h1>
          <p className="page-subtitle">
            این صفحه برای تصمیم گرفتن است، نه برای امتیاز دادن به افراد.
          </p>
        </div>
      </div>

      {/* ناوبری اصلی این صفحه — سه نما روی یک حقیقت. جلوی چشم، نه گوشه‌ی هدر. */}
      <Segmented
        block
        size="large"
        value={tab}
        onChange={(v) => setTab(v as 'org' | 'planning' | 'team')}
        style={{ marginBottom: 18, maxWidth: 520 }}
        options={[
          { value: 'org', label: 'سازمان (Org)' },
          { value: 'planning', label: 'برنامه‌ریزی (Planning)' },
          ...(canSeeTeam ? [{ value: 'team', label: 'تیم (Team)' }] : []),
        ]}
      />

      {tab === 'org' && (
        <>
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            {[
              ['کار در جریان', totals.active, null],
              ['متوقف', totals.blocked, 'blockedRatio'],
              ['در خطر تأخیر', totals.atRisk, null],
              ['از مهلت گذشته', totals.overdue, null],
              ['بی‌خبر', totals.stale, 'staleItems'],
              ['بدون مجری', totals.unassigned, null],
            ].map(([label, value, help]) => (
              <div key={String(label)}>
                <Card size="small">
                  <Statistic
                    title={<>{label}{help ? <Help k={String(help)} /> : null}</>}
                    value={faDigits(Number(value))}
                    valueStyle={{
                      color: Number(value) > 0 && ['متوقف', 'از مهلت گذشته'].includes(String(label)) ? 'var(--danger)' : undefined,
                    }}
                  />
                </Card>
              </div>
            ))}
          </div>

          {totals.blocked > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`${faDigits(totals.blocked)} کار الان متوقف است. اینها اول از همه به تصمیم نیاز دارند، نه به زمان بیشتر.`}
            />
          )}

          {/* چقدر از ظرفیت تیم را پشتیبانی خورد؟ (D-UX-7) */}
          {(() => {
            const support = overview.workStreamShare.find((s) => s.stream === 'SUPPORT');
            return support && support.percent >= 20 ? (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={`پشتیبانی این دوره ${faDigits(support.percent)}٪ از ظرفیت تیم را گرفت. اگر بالا رفت، یعنی کار محصول ناگزیر عقب می‌افتد.`}
              />
            ) : null;
          })()}

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card size="small" title={<>ظرفیت کجا خرج می‌شود<Help k="workStream" /></>}>
                {overview.workStreamShare.some((s) => s.hours > 0) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart margin={CHART_MARGIN}>
                      <Pie
                        isAnimationActive={false}
                        data={overview.workStreamShare.filter((s) => s.hours > 0)}
                        dataKey="hours"
                        nameKey="stream"
                        innerRadius={52}
                        outerRadius={82}
                      >
                        {overview.workStreamShare
                          .filter((s) => s.hours > 0)
                          .map((s) => (
                            <Cell key={s.stream} fill={colors.stream[s.stream] ?? colors.line} />
                          ))}
                      </Pie>
                      <Legend formatter={(val: any) => t(`stream.${val}`)} />
                      <RTooltip {...TOOLTIP} formatter={(v: any, n: any) => [`${faDigits(v)} ساعت`, t(`stream.${n}`)]} />
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
                  <PieChart margin={CHART_MARGIN}>
                    <Pie
                      isAnimationActive={false}
                      data={overview.healthDistribution}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={82}
                    >
                      {overview.healthDistribution.map((h) => (
                        <Cell key={h.name} fill={colors.health[h.name] ?? colors.line} />
                      ))}
                    </Pie>
                    <Legend formatter={(val: any) => t(`health.${val}`)} />
                    <RTooltip {...TOOLTIP} formatter={(v: any, n: any) => [faDigits(v), t(`health.${n}`)]} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title="کارها در هر مرحله">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart margin={CHART_MARGIN} data={overview.stateDistribution.map((s) => ({ ...s, label: t(`state.${s.name}`) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.axisText }} reversed interval={0} />
                    <YAxis orientation="right" allowDecimals={false} tick={{ fill: colors.axisText }} tickFormatter={numTick} width={32} />
                    <RTooltip {...TOOLTIP} formatter={(v: any) => [faDigits(v), 'تعداد']} />
                    <Bar dataKey="count" name="تعداد" fill={colors.brand} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card size="small" title="کارهای بسته‌شده در هر هفته">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart margin={CHART_MARGIN} data={throughput}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                    <XAxis
                      dataKey="weekStart"
                      tick={{ fontSize: 10, fill: colors.axisText }}
                      reversed
                      tickFormatter={(v: any) => faDigits(toJalali(v).slice(5))}
                    />
                    <YAxis orientation="right" allowDecimals={false} tick={{ fill: colors.axisText }} tickFormatter={numTick} width={32} />
                    <RTooltip
                      {...TOOLTIP}
                      formatter={(v: any) => [faDigits(v), 'تحویل']}
                      labelFormatter={(v: any) => faDigits(toJalali(v))}
                    />
                    <Line type="monotone" dataKey="count" name="تحویل" stroke={colors.brand} strokeWidth={2} dot={{ fill: colors.brand }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {tab === 'planning' && (
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
                      margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                      data={reasons.byReason.map((r) => ({ ...r, label: t(`reason.${r.reason}`) }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.grid} />
                      <XAxis type="number" orientation="top" allowDecimals={false} tick={{ fill: colors.axisText }} tickFormatter={numTick} />
                      <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11, fill: colors.axisText }} orientation="right" />
                      <RTooltip {...TOOLTIP} formatter={(v: any, n: any) => [faDigits(v), n]} />
                      <Legend />
                      <Bar dataKey="totalDays" name="روز کاری عقب‌افتادگی" fill={colors.danger} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="count" name="دفعات" fill={colors.brand} radius={[0, 4, 4, 0]} />
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
                    <BarChart margin={CHART_MARGIN} data={reasons.byChangedField.map((f) => ({ ...f, label: FIELD_LABEL[f.field] ?? f.field }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                      <XAxis dataKey="label" reversed tick={{ fontSize: 11, fill: colors.axisText }} interval={0} />
                      <YAxis orientation="right" allowDecimals={false} tick={{ fill: colors.axisText }} tickFormatter={numTick} width={32} />
                      <RTooltip {...TOOLTIP} formatter={(v: any) => [faDigits(v), 'دفعات تغییر']} />
                      <Bar dataKey="count" name="دفعات تغییر" fill={colors.warn} radius={[4, 4, 0, 0]} />
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

      {tab === 'team' && canSeeTeam && (
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
                title: <>ظرفیت مصرف‌شده<Help k="weeklyCapacity" /></>,
                dataIndex: 'estimatedHours',
                render: (v: number, row: any) => {
                  const cap = row.capacityHours || 0;
                  const pct = cap > 0 ? Math.round((v / cap) * 100) : 0;
                  const over = v > cap;
                  return (
                    <Tag color={over ? 'red' : pct >= 85 ? 'orange' : 'default'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {faDigits(v)} از {faDigits(cap)} ساعت · {faDigits(pct)}٪{over ? ' — بیش از ظرفیت' : ''}
                    </Tag>
                  );
                },
              },
              { title: 'P0', dataIndex: 'p0', render: (v) => (v ? <Tag color="red">{faDigits(v)}</Tag> : '—') },
              { title: 'متوقف', dataIndex: 'blocked', render: (v) => (v ? <Tag color="orange">{faDigits(v)}</Tag> : '—') },
              { title: 'منتظر تأیید', dataIndex: 'inReviewQueue', render: (v) => faDigits(v) },
            ]}
          />
        </Card>
      )}
    </>
  );
}
