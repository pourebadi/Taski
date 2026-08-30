import { useDraggable } from '@dnd-kit/core';
import WorkItemCard, { WorkItem } from './WorkItemCard';

export default function DraggableCard({ item, onOpen }: { item: WorkItem; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
      }}
    >
      <WorkItemCard item={item} onClick={onOpen} />
    </div>
  );
}
