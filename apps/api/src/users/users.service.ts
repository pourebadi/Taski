import { Injectable } from '@nestjs/common';
import { randomUUID, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors';
import { ROLES, USER_STATUS, Role } from '../common/constants';
import { normalizeFa } from '../common/text';
import { parseOrThrow, CreateUserSchema, ChangeRoleSchema, ChangeStatusSchema } from '../common/validation';

type Actor = { id: string; role: Role; organizationId: string };

const ADMIN_ROLES: Role[] = ['ORG_OWNER', 'ADMIN'];

export type CreateUserInput = {
  fullName: string;
  username?: string;
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
        username: true,
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
  async create(actor: Actor, raw: CreateUserInput) {
    const input = parseOrThrow(CreateUserSchema, raw) as CreateUserInput;
    // اگر نام‌کاربری ارائه نشده، از نام کامل تولید می‌شود.
    const rawUsername = String(input.username ?? this.generateUsername(input.fullName)).toLowerCase().trim();
    const usernameTaken = await this.prisma.user.findUnique({ where: { username: rawUsername } });
    if (usernameTaken) {
      throw new AppError(409, 'USERNAME_TAKEN', 'کاربری با این نام‌کاربری از قبل وجود دارد.');
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
          username: rawUsername,
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
          afterJson: JSON.stringify({ username: rawUsername, role: input.role }),
        },
      });

      return created;
    });

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      temporaryPassword,
    };
  }

  async changeRole(actor: Actor, userId: string, rawRole: Role) {
    const role = parseOrThrow(ChangeRoleSchema, { role: rawRole }).role as Role;
    const user = await this.mustFind(actor, userId);

    // ادمین نباید بتواند نقش خودش را پایین بیاورد و در را روی خودش قفل کند.
    if (userId === actor.id && ADMIN_ROLES.includes(actor.role) && !ADMIN_ROLES.includes(role)) {
      throw new AppError(422, 'SELF_DEMOTION', 'نمی‌توانید نقش مدیریتی خودتان را حذف کنید.');
    }

    // نباید آخرین ادمین فعال را از نقش ادمین خارج کرد. (D-003)
    if (ADMIN_ROLES.includes(user.role as Role) && !ADMIN_ROLES.includes(role)) {
      await this.assertNotLastAdmin(actor.organizationId, userId);
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.audit(actor, 'ROLE_CHANGED', userId, { from: user.role }, { to: role });
    return updated;
  }

  /** تغییر وضعیت عضو. غیرفعال شدن، همه نشست‌ها را فوراً باطل می‌کند. (PM-B2) */
  async changeStatus(actor: Actor, userId: string, rawStatus: string) {
    const status = parseOrThrow(ChangeStatusSchema, { status: rawStatus }).status;
    const user = await this.mustFind(actor, userId);

    if (status !== 'ACTIVE' && ADMIN_ROLES.includes(user.role as Role)) {
      await this.assertNotLastAdmin(actor.organizationId, userId);
    }

    // غیرفعال کردن حساب خودت یعنی قفل شدن بیرون اتاق.
    if (userId === actor.id && status !== 'ACTIVE') {
      throw new AppError(422, 'SELF_DISABLE', 'نمی‌توانید حساب خودتان را غیرفعال کنید.');
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
  /** ظرفیت هفتگی (ساعت). پایه‌ی محاسبه‌ی اشباع افراد است. (D-UX-4 / FE-9) */
  async changeCapacity(actor: Actor, userId: string, rawHours: unknown) {
    await this.mustFind(actor, userId);
    const hours = Math.round(Number(rawHours));
    if (!Number.isFinite(hours) || hours < 0 || hours > 80) {
      throw new AppError(422, 'INVALID_CAPACITY', 'ظرفیت باید بین ۰ تا ۸۰ ساعت در هفته باشد.');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { weeklyCapacityHours: hours },
    });
    await this.audit(actor, 'CAPACITY_CHANGED', userId, null, { hours });
    return { id: updated.id, weeklyCapacityHours: updated.weeklyCapacityHours };
  }

  async reassignAll(actor: Actor, fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) {
      throw new AppError(422, 'SAME_USER', 'مبدأ و مقصد واگذاری نمی‌تواند یک نفر باشد.');
    }
    await this.mustFind(actor, fromUserId);
    const toUser = await this.mustFind(actor, toUserId);
    // به کاربر غیرفعال منتقل نکن، وگرنه کار دوباره یتیم می‌شود. (BE-6)
    if (toUser.status !== 'ACTIVE') {
      throw new AppError(422, 'INACTIVE_TARGET', 'کارها را نمی‌توان به کاربر غیرفعال منتقل کرد.');
    }

    const where = { organizationId: actor.organizationId, workflowState: { notIn: ['DONE', 'CANCELLED'] } };
    const items = await this.prisma.workItem.findMany({
      where: {
        ...where,
        OR: [{ ownerId: fromUserId }, { primaryAssigneeId: fromUserId }, { reviewerId: fromUserId }],
      },
      select: { id: true, ownerId: true, primaryAssigneeId: true, reviewerId: true },
    });

    let owned = 0;
    let assigned = 0;
    let reviewing = 0;

    // برخلاف قبل، هر آیتم رکورد تغییر و فعالیتِ خودش را می‌گیرد تا دفتر تغییرات
    // دور زده نشود. (قانون ۲ CLAUDE.md / رفع BE-3)
    await this.prisma.$transaction(async (tx) => {
      for (const it of items) {
        const data: Record<string, string> = {};
        const records: { field: string; action: string }[] = [];
        if (it.ownerId === fromUserId) {
          data.ownerId = toUserId;
          owned++;
          records.push({ field: 'OWNER', action: 'OWNER_CHANGED' });
        }
        if (it.primaryAssigneeId === fromUserId) {
          data.primaryAssigneeId = toUserId;
          assigned++;
          records.push({ field: 'ASSIGNEE', action: 'ASSIGNEE_CHANGED' });
        }
        if (it.reviewerId === fromUserId) {
          data.reviewerId = toUserId;
          reviewing++;
          records.push({ field: 'REVIEWER', action: 'REVIEWER_CHANGED' });
        }
        await tx.workItem.update({ where: { id: it.id }, data: { ...data, lastActivityAt: new Date() } });
        for (const r of records) {
          await tx.changeRecord.create({
            data: {
              id: randomUUID(),
              workItemId: it.id,
              field: r.field,
              fromValue: fromUserId,
              toValue: toUserId,
              reasonType: 'EXTERNAL',
              reasonText: 'انتقال گروهی هنگام خروج یا مرخصی عضو',
              changedById: actor.id,
            },
          });
          await tx.activity.create({
            data: { id: randomUUID(), workItemId: it.id, actorId: actor.id, action: r.action, fromValue: fromUserId, toValue: toUserId },
          });
        }
      }
    });

    await this.audit(actor, 'WORK_REASSIGNED', fromUserId, null, { toUserId, owned, assigned, reviewing });
    return { owned, assigned, reviewing };
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

  /** تولید نام‌کاربری از نام کامل: حذف فاصله و کاراکترهای خاص. */
  private generateUsername(fullName: string): string {
    return fullName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9؀-ۿ]/g, '')
      .slice(0, 30) || `user${Date.now()}`;
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
