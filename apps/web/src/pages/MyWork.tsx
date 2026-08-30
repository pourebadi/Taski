import { useEffect, useState } from 'react';
import { Col, Empty, Row, Spin, Typography } from 'antd';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import WorkItemCard, { WorkItem } from '../components/WorkItemCard';
import WorkItemDrawer from '../components/WorkItemDrawer';

type MyWorkData = { inProgress: WorkItem[]; awaitingMyReview: WorkItem[]; overdue: WorkItem[] };

function Column({ title, items, onOpen }: { title: string; items: WorkItem[]; onOpen: (id: string) => void }) {
  return (
    <Col xs={24} md={8}>
      <Typography.Title level={5}>{title}</Typography.Title>
      {items.length === 0 ? (
        <Empty description={t('myWork.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        items.map((i) => <WorkItemCard key={i.id} item={i} onClick={() => onOpen(i.id)} />)
      )}
    </Col>
  );
}

export default function MyWork() {
  const [data, setData] = useState<MyWorkData | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () => {
    api<MyWorkData>('/work-items/my-work')
      .then(setData)
      .catch(() => setData({ inProgress: [], awaitingMyReview: [], overdue: [] }));
  };

  useEffect(load, []);

  if (!data) return <Spin />;

  return (
    <>
      <Row gutter={16}>
        <Column title={t('myWork.inProgress')} items={data.inProgress} onOpen={setOpenId} />
        <Column title={t('myWork.awaitingReview')} items={data.awaitingMyReview} onOpen={setOpenId} />
        <Column title={t('myWork.overdue')} items={data.overdue} onOpen={setOpenId} />
      </Row>
      <WorkItemDrawer id={openId} open={!!openId} onClose={() => setOpenId(null)} onChanged={load} />
    </>
  );
}
