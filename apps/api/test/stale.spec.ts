import { describe, it, expect, vi } from 'vitest';
import { WorkItemsService } from '../src/work-items/work-items.service';
import { countWorkingDays } from '../src/calendar/working-days';

const calendar = {
  loadHolidays: vi.fn().mockResolvedValue(new Set<string>()),
  countWorkingDays,
} as any;

function svc(items: any[]) {
  const prisma: any = {
    workItem: {
      findMany: vi.fn().mockResolvedValue(items),
      updateMany: vi.fn().mockResolvedValue({ count: items.length }),
    },
  };
  return { service: new WorkItemsService(prisma, {} as any, calendar), prisma };
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

describe('پرچم کار راکد', () => {
  it('کار به‌روزرسانی‌شده امروز راکد نیست', async () => {
    const { service, prisma } = svc([{ id: 'a', lastActivityAt: daysAgo(1) }]);
    expect(await service.flagStaleItems('org')).toBe(0);
    expect(prisma.workItem.updateMany).not.toHaveBeenCalled();
  });

  it('کار بی‌حرکت بیش از دو هفته راکد است', async () => {
    const { service, prisma } = svc([{ id: 'a', lastActivityAt: daysAgo(20) }]);
    expect(await service.flagStaleItems('org')).toBe(1);
    expect(prisma.workItem.updateMany.mock.calls[0][0].data.deliveryHealth).toBe('UNKNOWN');
  });

  it('فقط کارهای فعال بررسی می‌شوند', async () => {
    const { service, prisma } = svc([]);
    await service.flagStaleItems('org');
    const where = prisma.workItem.findMany.mock.calls[0][0].where;
    expect(where.workflowState.in).toContain('IN_PROGRESS');
    expect(where.workflowState.in).not.toContain('DONE');
    expect(where.deliveryHealth.not).toBe('UNKNOWN');
  });
});
