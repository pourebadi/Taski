import { useCallback, useEffect, useState } from 'react';
import { Col, Row, Skeleton, Alert } from 'antd';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { faDigits } from '../lib/date';
import WorkItemCard, { WorkItem } from '../components/WorkItemCard';
import WorkItemDrawer from '../components/WorkItemDrawer';

type MyWorkData = { inProgress: WorkItem[]; awaitingMyReview: WorkItem[]; overdue: WorkItem[] };

function Column({
  title,
  hint,
  emptyText,
  items,
  onOpen,
}: {
  title: string;
  hint: string;
  emptyText: string;
  items: WorkItem[];
  onOpen: (id: string) => void;
}) {
  return (
    <Col xs={24} md={8}>
      <section aria-label={title}>
        <header style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h2>
            <span className="board-count">{faDigits(items.length)}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '3px 0 0' }}>{hint}</p>
        </header>

        {items.length === 0 ? (
          // صفحه‌ی خالی یک دعوت به عمل است، نه یک اعلام شکست
          <div className="empty-state">
            <span style={{ fontSize: 13 }}>{emptyText}</span>
          </div>
        ) : (
          items.map((i) => <WorkItemCard key={i.id} item={i} onClick={() => onOpen(i.id)} />)
        )}
      </section>
    </Col>
  );
}

export default function MyWork() {
  const [data, setData] = useState<MyWorkData | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    api<MyWorkData>('/work-items/my-work')
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  useEffect(load, [load]);

  if (failed) {
    return (
      <Alert
        type="error"
        showIcon
        message="کارهای شما بارگذاری نشد."
        description="ارتباط با سرور برقرار نشد. صفحه را دوباره باز کنید."
      />
    );
  }

  if (!data) {
    return (
      <Row gutter={16}>
        {[0, 1, 2].map((i) => (
          <Col xs={24} md={8} key={i}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </Col>
        ))}
      </Row>
    );
  }

  const total = data.inProgress.length + data.awaitingMyReview.length + data.overdue.length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('nav.myWork')}</h1>
          <p className="page-subtitle">
            {total === 0
              ? 'هیچ کاری روی دوش شما نیست.'
              : `${faDigits(total)} کار روی دوش شماست.`}
          </p>
        </div>
      </div>

      <Row gutter={[16, 24]}>
        <Column
          title={t('myWork.inProgress')}
          hint="کارهایی که مجری‌شان شما هستید و آماده یا در جریان‌اند."
          emptyText="چیزی در جریان نیست. از بورد یک کار بردارید."
          items={data.inProgress}
          onOpen={setOpenId}
        />
        <Column
          title={t('myWork.awaitingReview')}
          hint="کارهایی که منتظر بازبینی شما مانده‌اند."
          emptyText="صف بازبینی شما خالی است."
          items={data.awaitingMyReview}
          onOpen={setOpenId}
        />
        <Column
          title={t('myWork.overdue')}
          hint="تاریخ تحویلشان گذشته و هنوز بسته نشده‌اند."
          emptyText="هیچ کاری از مهلتش نگذشته."
          items={data.overdue}
          onOpen={setOpenId}
        />
      </Row>

      <WorkItemDrawer id={openId} open={!!openId} onClose={() => setOpenId(null)} onChanged={load} />
    </>
  );
}
