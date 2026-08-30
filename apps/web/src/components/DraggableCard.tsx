import { useDraggable } from '@dnd-kit/core';
import { HolderOutlined } from '@ant-design/icons';
import WorkItemCard, { WorkItem } from './WorkItemCard';

/**
 * پیش‌تر listenerهای کشیدن روی کل کارت بودند، پس عنوان کار قابل فوکوس نبود
 * و بورد با کیبورد اصلاً کار نمی‌کرد. حالا فقط دستگیره کشیده می‌شود و
 * عنوان یک دکمه‌ی مستقل است.
 */
export default function DraggableCard({
  item,
  onOpen,
  assigneeName,
}: {
  item: WorkItem;
  onOpen: () => void;
  assigneeName?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 5 : undefined,
        position: 'relative',
      }}
    >
      <WorkItemCard
        item={item}
        onClick={onOpen}
        assigneeName={assigneeName}
        handle={
          <button
            type="button"
            className="drag-handle"
            aria-label={`جابه‌جایی ${item.title}. با Space بردارید، با کلیدهای جهت‌دار حرکت دهید و دوباره Space برای رها کردن.`}
            {...listeners}
            {...attributes}
          >
            <HolderOutlined aria-hidden="true" />
          </button>
        }
      />
    </div>
  );
}
