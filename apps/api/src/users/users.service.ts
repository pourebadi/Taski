import { Injectable } from '@nestjs/common';
import { randomUUID, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors';
import { ROLES, USER_STATUS, Role } from '../common/constants';
import { normalizeFa } from '../common/text';

type Actor = { id: string; role: Role; organizationId: string };

const ADMIN_ROLES: Role[] = ['ORG_OWNER', 'ADMIN'];

export type CreateUserInput = {
  fullName: string;
  email: string;
  /** سمت سازمانی — هیچ مجوزی نمی‌دهد. (PM-B1) */
  jobTitle?: string | null;
  role: Role;
  primaryTeamId?: string | null;
  weeklyCapacityHours?: number;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: Actor) {
    return this.prisma.user.findMany({
      where: { organizationId: actor.organizationId },
      select: {
        id: true,
        fullName: true,
        email: true,
        jobTitle: true,
        role: true,
        status: true,
        primaryTeamId: true,
        weeklyCapacityHours: true,
        mustChangePassword: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  /**
   * ساخت کاربر فقط توسط ادمین. ثبت‌نام عمومی وجود ندارد.
   * رمز موقت تولید و در پاسخ برگردانده می‌شود؛ SMTP لازم نیست. (PM-B1)
   */
  async create(actor: Actor, input: CreateUserInput) {
    if (!ROLES.includes(input.role)) {
      throw new AppError(422, 'INVALID_ROLE', 'نقش نرم‌افزاری نامعتبر است.');
    }

    const email = input.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new AppError(409, 'EMAIL_TAKEN', 'کاربری با این ایمیل از قبل وجود دارد.');
    }

    if (input.primaryTeamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: input.primaryTeamId, organizationId: actor.organizationId },
      });
      if (!team) throw new AppError(404, 'TEAM_NOT_FOUND', 'تیم انتخاب‌شده پیدا نشد.');
    }

    const temporaryPassword = randomBytes(8).toString('base64url') + 'A1';

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          id: randomUUID(),
          organizationId: actor.organizationId,
          fullName: input.fullName.trim(),
          email,
          passwordHash: await bcrypt.hash(temporaryPassword, 10),
          jobTitle: input.jobTitle ?? null,
          role: input.role,
          status: 'ACTIVE',
          mustChangePassword: true,
          primaryTeamId: input.primaryTeamId ?? null,
          weeklyCapacityHours: input.weeklyCapacityHours ?? 40,
        },
      });

      if (input.primaryTeamId) {
        await tx.teamMember.create({
          data: { id: randomUUID(), teamId: input.primaryTeamId, userId: created.id },
        });
      }

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          actorId: actor.id,
          entityType: 'USER',
          entityId: created.id,
          action: 'USER_CREATED',
          afterJson: JSON.stringify({ email, role: input.role }),
        },
      });

      return created;
    });

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      temporaryPassword,
    };
  }

  async changeRole(actor: Actor, userId: string, role: Role) {
    if (!ROLES.includes(role)) throw new AppError(422, 'INVALID_ROLE', 'نقش نرم‌افزاری نامعتبر است.');
    const user = await this.mustFind(actor, userId);

    // نباید آخرین ادمین فعال را از نقش ادمین خارج کرد. (D-003)
    if (ADMIN_ROLES.includes(user.role as Role) && !ADMIN_ROLES.includes(role)) {
      await this.assertNotLastAdmin(actor.organizationId, userId);
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.audit(actor, 'ROLE_CHANGED', userId, { from: user.role }, { to: role });
    return updated;
  }

  /** تغییر وضعیت عضو. غیرفعال شدن، همه نشست‌ها را فوراً باطل می‌کند. (PM-B2) */
  async changeStatus(actor: Actor, userId: string, status: string) {
    if (!USER_STATUS.includes(status as any)) {
      throw new AppError(422, 'INVALID_STATUS', 'وضعیت نامعتبر است.');
    }
    const user = await this.mustFind(actor, userId);

    if (status !== 'ACTIVE' && ADMIN_ROLES.includes(user.role as Role)) {
      await this.assertNotLastAdmin(actor.organizationId, userId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data: { status } });
      if (status !== 'ACTIVE') {
        await tx.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          actorId: actor.id,
          entityType: 'USER',
          entityId: userId,
          action: 'STATUS_CHANGED',
          beforeJson: JSON.stringify({ status: user.status }),
          afterJson: JSON.stringify({ status }),
        },
      });
      return updated;
    });
  }

  /** بازنشانی رمز توسط ادمین از داخل UI. رمز موقت برگردانده می‌شود. */
  async resetPassword(actor: Actor, userId: string) {
    await this.mustFind(actor, userId);
    const temporaryPassword = randomBytes(8).toString('base64url') + 'A1';

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(temporaryPassword, 10), mustChangePassword: true },
      });
      await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });

    await this.audit(actor, 'PASSWORD_RESET', userId);
    return { temporaryPassword };
  }

  /**
   * پیش از غیرفعال کردن، کارهای باز فرد گزارش می‌شود تا واگذاری آگاهانه باشد. (PM-B2 / Offboarding)
   */
  async offboardingImpact(actor: Actor, userId: string) {
    const [owned, assigned, reviewing] = await Promise.all([
      this.prisma.workItem.count({
        where: { organizationId: actor.organizationId, ownerId: userId, workflowState: { notIn: ['DONE', 'CANCELLED'] } },
      }),
      this.prisma.workItem.count({
        where: { organizationId: actor.organizationId, primaryAssigneeId: userId, workflowState: { notIn: ['DONE', 'CANCELLED'] } },
      }),
      this.prisma.workItem.count({
        where: { organizationId: actor.organizationId, reviewerId: userId, workflowState: 'IN_REVIEW' },
      }),
    ]);
    return { openOwned: owned, openAssigned: assigned, pendingReviews: reviewing };
  }

  /** واگذاری گروهی کارهای یک نفر به نفر دیگر، پیش از خروج. */
  async reassignAll(actor: Actor, fromUserId: string, toUserId: string) {
    await this.mustFind(actor, fromUserId);
    await this.mustFind(actor, toUserId);

    const where = { organizationId: actor.organizationId, workflowState: { notIn: ['DONE', 'CANCELLED'] } };
    const [owned, assigned, reviewing] = await this.prisma.$transaction([
      this.prisma.workItem.updateMany({ where: { ...where, ownerId: fromUserId }, data: { ownerId: toUserId } }),
      this.prisma.workItem.updateMany({ where: { ...where, primaryAssigneeId: fromUserId }, data: { primaryAssigneeId: toUserId } }),
      this.prisma.workItem.updateMany({ where: { ...where, reviewerId: fromUserId }, data: { reviewerId: toUserId } }),
    ]);

    await this.audit(actor, 'WORK_REASSIGNED', fromUserId, null, { toUserId });
    return { owned: owned.count, assigned: assigned.count, reviewing: reviewing.count };
  }

  private async assertNotLastAdmin(organizationId: string, excludingUserId: string) {
    const remaining = await this.prisma.user.count({
      where: {
        organizationId,
        status: 'ACTIVE',
        role: { in: ADMIN_ROLES },
        id: { not: excludingUserId },
      },
    });
    if (remaining < 1) {
      throw new AppError(
        422,
        'LAST_ADMIN',
        'حداقل یک مدیر فعال باید باقی بماند. ابتدا مدیر دیگری تعریف کنید.',
      );
    }
  }

  private async mustFind(actor: Actor, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: actor.organizationId },
    });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'کاربر پیدا نشد.');
    return user;
  }

  private async audit(actor: Actor, action: string, entityId: string, before?: unknown, after?: unknown) {
    await this.prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        actorId: actor.id,
        entityType: 'USER',
        entityId,
        action,
        beforeJson: before ? JSON.stringify(before) : null,
        afterJson: after ? JSON.stringify(after) : null,
      },
    });
  }
}
