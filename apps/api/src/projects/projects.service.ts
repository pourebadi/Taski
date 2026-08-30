import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors';
import { normalizeFa } from '../common/text';
import { Role } from '../common/constants';

type Actor = { id: string; role: Role; organizationId: string };

const ORG_WIDE_ROLES: Role[] = ['ORG_OWNER', 'ADMIN', 'PROJECT_MANAGER'];

export type CreateProjectInput = {
  key: string;
  name: string;
  description?: string | null;
  ownerId?: string | null;
  targetDate?: string | null;
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: Actor) {
    // دید سازمانی برای نقش‌های بالا، وگرنه فقط پروژه‌هایی که عضو آن‌هاست. (PM-C1)
    if (ORG_WIDE_ROLES.includes(actor.role)) {
      return this.prisma.project.findMany({
        where: { organizationId: actor.organizationId },
        orderBy: { createdAt: 'desc' },
      });
    }
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId: actor.id },
      select: { projectId: true },
    });
    return this.prisma.project.findMany({
      where: { organizationId: actor.organizationId, id: { in: memberships.map((m) => m.projectId) } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(actor: Actor, input: CreateProjectInput) {
    const key = input.key.trim().toUpperCase();
    if (!/^[A-Z]{2,6}$/.test(key)) {
      throw new AppError(422, 'INVALID_KEY', 'کلید پروژه باید ۲ تا ۶ حرف انگلیسی باشد.');
    }
    const exists = await this.prisma.project.findFirst({
      where: { organizationId: actor.organizationId, key },
    });
    if (exists) throw new AppError(409, 'KEY_TAKEN', 'پروژه‌ای با این کلید از قبل وجود دارد.');

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          id: randomUUID(),
          organizationId: actor.organizationId,
          key,
          name: input.name.trim(),
          nameNormalized: normalizeFa(input.name),
          description: input.description ?? null,
          ownerId: input.ownerId ?? actor.id,
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
          status: 'ACTIVE',
        },
      });

      // سازنده به‌صورت پیش‌فرض سرپرست پروژه می‌شود
      await tx.projectMember.create({
        data: {
          id: randomUUID(),
          projectId: project.id,
          userId: input.ownerId ?? actor.id,
          role: 'PROJECT_LEAD',
        },
      });

      return project;
    });
  }

  /** بررسی دسترسی به یک پروژه — در سرور، نه در فرانت. (CLAUDE.md قانون ۱) */
  async assertAccess(actor: Actor, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: actor.organizationId },
    });
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'پروژه پیدا نشد.');
    if (ORG_WIDE_ROLES.includes(actor.role)) return project;

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actor.id } },
    });
    if (!member) throw new AppError(403, 'FORBIDDEN', 'به این پروژه دسترسی ندارید.');
    return project;
  }

  async get(actor: Actor, projectId: string) {
    const project = await this.assertAccess(actor, projectId);
    const [members, counts] = await Promise.all([
      this.prisma.projectMember.findMany({ where: { projectId } }),
      this.prisma.workItem.groupBy({
        by: ['workflowState'],
        where: { projectId },
        _count: true,
      }),
    ]);
    return { ...project, members, stateCounts: counts };
  }

  async addMember(actor: Actor, projectId: string, userId: string, role = 'MEMBER') {
    await this.assertAccess(actor, projectId);
    const exists = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (exists) return exists;
    return this.prisma.projectMember.create({
      data: { id: randomUUID(), projectId, userId, role },
    });
  }

  async update(actor: Actor, projectId: string, data: Partial<CreateProjectInput> & { status?: string }) {
    await this.assertAccess(actor, projectId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: data.name?.trim(),
        nameNormalized: data.name ? normalizeFa(data.name) : undefined,
        description: data.description,
        ownerId: data.ownerId ?? undefined,
        status: data.status,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    });
  }
}
