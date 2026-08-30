import { describe, it, expect, vi } from 'vitest';
import { ProjectsService } from '../src/projects/projects.service';

const prisma = () => ({ project: { findFirst: vi.fn(), findMany: vi.fn() }, projectMember: { findUnique: vi.fn() } }) as any;

describe('دسترسی پروژه', () => {
  it('کلید پروژه باید حروف انگلیسی باشد', async () => {
    const p = prisma();
    const svc = new ProjectsService(p);
    await expect(
      svc.create({ id: 'u', role: 'ADMIN', organizationId: 'o' }, { key: 'ب1', name: 'تست' }),
    ).rejects.toThrow(/کلید پروژه/);
  });

  it('عضو نبودن در پروژه یعنی دسترسی ندارد', async () => {
    const p = prisma();
    p.project.findFirst.mockResolvedValue({ id: 'p1', organizationId: 'o' });
    p.projectMember.findUnique.mockResolvedValue(null);
    const svc = new ProjectsService(p);
    await expect(
      svc.assertAccess({ id: 'u', role: 'CONTRIBUTOR', organizationId: 'o' }, 'p1'),
    ).rejects.toThrow(/دسترسی ندارید/);
  });

  it('مدیر پروژه دید سازمانی دارد', async () => {
    const p = prisma();
    p.project.findFirst.mockResolvedValue({ id: 'p1', organizationId: 'o' });
    const svc = new ProjectsService(p);
    await expect(
      svc.assertAccess({ id: 'u', role: 'PROJECT_MANAGER', organizationId: 'o' }, 'p1'),
    ).resolves.toBeTruthy();
  });
});
