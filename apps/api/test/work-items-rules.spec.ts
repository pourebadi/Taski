import { describe, it, expect, vi } from 'vitest';
import { WorkItemsService } from '../src/work-items/work-items.service';

const actor = { id: 'u1', role: 'CONTRIBUTOR' as const, organizationId: 'org' };
const pmActor = { id: 'pm', role: 'PROJECT_MANAGER' as const, organizationId: 'org' };

const calendar = {
  loadHolidays: vi.fn().mockResolvedValue(new Set<string>()),
  countWorkingDays: vi.fn().mockReturnValue(3),
} as any;

function svcWith(item: any, extra: any = {}) {
  const prisma: any = {
    workItem: { findFirst: vi.fn().mockResolvedValue(item), update: vi.fn().mockResolvedValue(item) },
    commitmentHistory: { findFirst: vi.fn().mockResolvedValue({ versionNo: 2 }), create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    // findFirst لازم است چون قانون بازبینی حالا تاریخچه‌ی عبور از IN_REVIEW را می‌خواند
    activity: { create: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
    changeRecord: { create: vi.fn() },
    ...extra,
  };
  prisma.$transaction = vi.fn(async (fn: any) => fn(prisma));
  return { svc: new WorkItemsService(prisma, {} as any, calendar), prisma };
}

const base = {
  id: 'w1',
  organizationId: 'org',
  workflowState: 'IN_PROGRESS',
  deliveryHealth: 'ON_TRACK',
  priority: 'P2',
  requiresReview: false,
  requiresQa: false,
  currentEta: new Date('2026-09-01T00:00:00Z'),
  firstCommittedEta: new Date('2026-08-25T00:00:00Z'),
  activeBaselineEta: new Date('2026-08-25T00:00:00Z'),
  etaConfidence: 'MEDIUM',
  estimateHours: 8,
};

describe('گذار وضعیت', () => {
  it('کار نیازمند بازبینی مستقیم به انجام‌شده نمی‌رود', async () => {
    const { svc } = svcWith({ ...base, requiresReview: true });
    await expect(svc.changeState(actor, 'w1', 'DONE')).rejects.toThrow(/بازبینی/);
  });

  it('کار بدون نیاز به بازبینی مستقیم به انجام‌شده می‌رود', async () => {
    const { svc } = svcWith(base);
    await expect(svc.changeState(actor, 'w1', 'DONE')).resolves.toBeTruthy();
  });

  it('گذار غیرمجاز رد می‌شود', async () => {
    const { svc } = svcWith({ ...base, workflowState: 'BACKLOG' });
    await expect(svc.changeState(actor, 'w1', 'DONE')).rejects.toThrow(/مجاز نیست/);
  });
});

describe('اجبار تأییدکننده در بازبینی', () => {
  it('رفتن به «منتظر تأیید» بدون تأییدکننده رد می‌شود', async () => {
    const { svc } = svcWith({ ...base, workflowState: 'IN_PROGRESS', reviewerId: null });
    await expect(svc.changeState(actor, 'w1', 'IN_REVIEW')).rejects.toThrow(/تأییدکننده/);
  });

  it('تأیید توسط غیرِتأییدکننده رد می‌شود', async () => {
    const { svc } = svcWith({ ...base, workflowState: 'IN_REVIEW', reviewerId: 'someone-else', requiresReview: true });
    await expect(svc.changeState(actor, 'w1', 'DONE')).rejects.toThrow(/تأییدکننده/);
  });

  it('تأییدکننده‌ی تعیین‌شده می‌تواند تأیید کند', async () => {
    const { svc } = svcWith({ ...base, workflowState: 'IN_REVIEW', reviewerId: 'u1', requiresReview: true });
    await expect(svc.changeState(actor, 'w1', 'DONE')).resolves.toBeTruthy();
  });

  it('مدیر پروژه می‌تواند تأیید کند حتی اگر تأییدکننده نباشد', async () => {
    const { svc } = svcWith({ ...base, workflowState: 'IN_REVIEW', reviewerId: 'x', requiresReview: true });
    await expect(svc.changeState(pmActor, 'w1', 'DONE')).resolves.toBeTruthy();
  });
});

describe('سلامت تحویل', () => {
  it('وضعیت مسدود بدون توضیح رد می‌شود', async () => {
    const { svc } = svcWith(base);
    await expect(svc.changeHealth(actor, 'w1', 'BLOCKED')).rejects.toThrow(/توضیح/);
  });

  it('با توضیح پذیرفته می‌شود', async () => {
    const { svc } = svcWith(base);
    await expect(svc.changeHealth(actor, 'w1', 'BLOCKED', 'منتظر API طرف سوم')).resolves.toBeTruthy();
  });
});

describe('تاریخچه تعهد', () => {
  it('تغییر ETA بدون علت رد می‌شود', async () => {
    const { svc } = svcWith(base);
    await expect(
      svc.changeCommitment(actor, 'w1', { newEta: '2026-09-10T00:00:00Z', reasonType: undefined as any }),
    ).rejects.toThrow(/علت/);
  });

  it('تغییر ETA همیشه رکورد تاریخچه می‌سازد', async () => {
    const { svc, prisma } = svcWith(base);
    await svc.changeCommitment(actor, 'w1', { newEta: '2026-09-10T00:00:00Z', reasonType: 'SCOPE_CHANGE' });
    expect(prisma.commitmentHistory.create).toHaveBeenCalledOnce();
    const payload = prisma.commitmentHistory.create.mock.calls[0][0].data;
    expect(payload.versionNo).toBe(3);
    expect(payload.reasonType).toBe('SCOPE_CHANGE');
  });

  it('وقتی هیچ چیز عوض نشده، ثبت رد می‌شود', async () => {
    const { svc } = svcWith(base);
    await expect(
      svc.changeCommitment(actor, 'w1', { newEta: '2026-09-01T00:00:00Z', reasonType: 'BLOCKER' }),
    ).rejects.toThrow(/تغییری/);
  });

  it('بیس‌لاین اولیه با تغییر ETA دست‌نخورده می‌ماند', async () => {
    const { svc, prisma } = svcWith(base);
    await svc.changeCommitment(actor, 'w1', { newEta: '2026-09-10T00:00:00Z', reasonType: 'BLOCKER' });
    const data = prisma.workItem.update.mock.calls[0][0].data;
    expect(data.firstCommittedEta).toEqual(base.firstCommittedEta);
  });
});

describe('Re-baseline', () => {
  it('عضو اجرایی اجازه ندارد', async () => {
    const { svc } = svcWith(base);
    await expect(svc.reBaseline(actor, 'w1', '2026-10-01T00:00:00Z', 'تغییر دامنه')).rejects.toThrow(/دسترسی|مدیر پروژه/);
  });

  it('مدیر پروژه بدون دلیل هم اجازه ندارد', async () => {
    const { svc } = svcWith(base);
    await expect(svc.reBaseline(pmActor, 'w1', '2026-10-01T00:00:00Z', '  ')).rejects.toThrow(/دلیل/);
  });

  it('مدیر پروژه با دلیل می‌تواند', async () => {
    const { svc, prisma } = svcWith(base);
    await svc.reBaseline(pmActor, 'w1', '2026-10-01T00:00:00Z', 'دامنه رسماً بزرگ شد');
    expect(prisma.commitmentHistory.create.mock.calls[0][0].data.changeKind).toBe('RE_BASELINE');
  });
});

describe('تغییر اولویت', () => {
  it('عضو اجرایی نمی‌تواند اولویت را عوض کند', async () => {
    const { svc } = svcWith(base);
    await expect(svc.update(actor, 'w1', { priority: 'P0' })).rejects.toThrow(/اولویت/);
  });

  it('سرپرست تیم می‌تواند', async () => {
    const { svc } = svcWith(base);
    await expect(
      svc.update({ ...actor, role: 'TEAM_LEAD' }, 'w1', { priority: 'P0', reasonType: 'PRIORITY_CHANGE' }),
    ).resolves.toBeTruthy();
  });
});
