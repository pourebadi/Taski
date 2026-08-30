import { describe, it, expect, vi } from 'vitest';
import { OrganizationService } from '../src/organization/organization.service';

const actor = { id: 'u1', role: 'ADMIN' as const, organizationId: 'org' };

function svc(orgRow: any = { boardConfig: null }) {
  const prisma: any = {
    organization: {
      findUnique: vi.fn().mockResolvedValue(orgRow),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  return { s: new OrganizationService(prisma), prisma };
}

describe('چیدمان بورد', () => {
  it('پیش‌فرض null برمی‌گرداند وقتی چیزی ذخیره نشده', async () => {
    const { s } = svc({ boardConfig: null });
    expect(await s.getBoardConfig(actor)).toEqual({ columns: null });
  });

  it('چیدمان معتبر را ذخیره و پاک‌سازی می‌کند', async () => {
    const { s, prisma } = svc();
    const res = await s.setBoardConfig(actor, {
      columns: [
        { state: 'BACKLOG', label: '  بک‌لاگ اسپرینت  ', visible: true },
        { state: 'IN_PROGRESS', visible: true },
        { state: 'DONE', label: '', visible: false },
      ],
    });
    expect(res.columns).toHaveLength(3);
    expect(res.columns[0].label).toBe('بک‌لاگ اسپرینت'); // trim
    expect(res.columns[2].label).toBeNull(); // خالی → null
    expect(prisma.organization.update).toHaveBeenCalledOnce();
  });

  it('مرحله‌ی نامعتبر را رد می‌کند', async () => {
    const { s } = svc();
    await expect(s.setBoardConfig(actor, { columns: [{ state: 'BOGUS', visible: true }] })).rejects.toThrow(/نامعتبر/);
  });

  it('مرحله‌ی تکراری را رد می‌کند', async () => {
    const { s } = svc();
    await expect(
      s.setBoardConfig(actor, { columns: [{ state: 'DONE', visible: true }, { state: 'DONE', visible: true }] }),
    ).rejects.toThrow(/یک بار/);
  });

  it('وقتی هیچ ستونی نمایان نیست رد می‌کند', async () => {
    const { s } = svc();
    await expect(
      s.setBoardConfig(actor, { columns: [{ state: 'DONE', visible: false }] }),
    ).rejects.toThrow(/حداقل یک ستون/);
  });
});
