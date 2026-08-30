import { describe, it, expect, vi } from 'vitest';
import { UsersService } from '../src/users/users.service';

const actor = { id: 'admin-1', role: 'ADMIN' as const, organizationId: 'org-default' };

function makePrisma(overrides: any = {}) {
  return {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn(), update: vi.fn() },
    session: { updateMany: vi.fn() },
    auditEvent: { create: vi.fn() },
    ...overrides,
  } as any;
}

describe('قواعد کاربر', () => {
  it('نام‌کاربری تکراری رد می‌شود', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'x' });
    const svc = new UsersService(prisma);
    await expect(
      svc.create(actor, { fullName: 'الف', username: 'alef', role: 'CONTRIBUTOR' }),
    ).rejects.toThrow();
  });

  it('نقش نامعتبر رد می‌شود', async () => {
    const svc = new UsersService(makePrisma());
    await expect(
      svc.create(actor, { fullName: 'الف', username: 'alef', role: 'SUPER_BOSS' as any }),
    ).rejects.toThrow();
  });

  it('آخرین مدیر فعال را نمی‌توان غیرفعال کرد', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: 'ADMIN', status: 'ACTIVE' });
    prisma.user.count.mockResolvedValue(0); // هیچ مدیر دیگری باقی نمی‌ماند
    const svc = new UsersService(prisma);
    await expect(svc.changeStatus(actor, 'u1', 'DISABLED')).rejects.toThrow(/مدیر فعال/);
  });

  it('وقتی مدیر دیگری هست، غیرفعال کردن مجاز است', async () => {
    const prisma = makePrisma();
    prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: 'ADMIN', status: 'ACTIVE' });
    prisma.user.count.mockResolvedValue(1);
    prisma.$transaction = vi.fn(async (fn: any) =>
      fn({
        user: { update: vi.fn().mockResolvedValue({ id: 'u1', status: 'DISABLED' }) },
        session: { updateMany: vi.fn() },
        auditEvent: { create: vi.fn() },
      }),
    );
    const svc = new UsersService(prisma);
    await expect(svc.changeStatus(actor, 'u1', 'DISABLED')).resolves.toBeTruthy();
  });
});
