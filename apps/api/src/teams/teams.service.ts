import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors';
import { Role } from '../common/constants';

type Actor = { id: string; role: Role; organizationId: string };

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: Actor) {
    return this.prisma.team.findMany({
      where: { organizationId: actor.organizationId },
      include: { members: { include: { user: { select: { id: true, fullName: true, role: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(actor: Actor, name: string, leadId?: string | null) {
    const exists = await this.prisma.team.findFirst({
      where: { organizationId: actor.organizationId, name: name.trim() },
    });
    if (exists) throw new AppError(409, 'TEAM_EXISTS', 'تیمی با این نام از قبل وجود دارد.');

    const team = await this.prisma.team.create({
      data: { id: randomUUID(), organizationId: actor.organizationId, name: name.trim(), leadId: leadId ?? null },
    });
    // سرپرست تیم خودکار عضو تیم می‌شود
    if (leadId) await this.addMember(actor, team.id, leadId);
    return team;
  }

  /** تغییر سرپرست تیم Audit می‌شود. (PRD 6.3) */
  async setLead(actor: Actor, teamId: string, leadId: string) {
    const team = await this.mustFind(actor, teamId);
    const updated = await this.prisma.team.update({ where: { id: teamId }, data: { leadId } });
    await this.prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        actorId: actor.id,
        entityType: 'TEAM',
        entityId: teamId,
        action: 'LEAD_CHANGED',
        beforeJson: JSON.stringify({ leadId: team.leadId }),
        afterJson: JSON.stringify({ leadId }),
      },
    });
    await this.addMember(actor, teamId, leadId).catch(() => null);
    return updated;
  }

  async addMember(actor: Actor, teamId: string, userId: string) {
    await this.mustFind(actor, teamId);
    const exists = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (exists) return exists;
    return this.prisma.teamMember.create({ data: { id: randomUUID(), teamId, userId } });
  }

  async removeMember(actor: Actor, teamId: string, userId: string) {
    const team = await this.mustFind(actor, teamId);
    if (team.leadId === userId) {
      throw new AppError(422, 'LEAD_REMOVAL', 'ابتدا سرپرست جدیدی برای تیم تعیین کنید.');
    }
    await this.prisma.teamMember.deleteMany({ where: { teamId, userId } });
    return { ok: true };
  }

  private async mustFind(actor: Actor, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, organizationId: actor.organizationId },
    });
    if (!team) throw new AppError(404, 'TEAM_NOT_FOUND', 'تیم پیدا نشد.');
    return team;
  }
}
