import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkingCalendarService } from '../calendar/working-calendar.service';
import { Role, ACTIVE_STATES } from '../common/constants';
import { can } from '../authorization/permissions';
import { AppError } from '../common/errors';

type Actor = { id: string; role: Role; organizationId: string };

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: WorkingCalendarService,
  ) {}

  /** نمای مدیریتی: تصویر کلی سازمان در یک نگاه. */
  async overview(actor: Actor) {
    const org = actor.organizationId;
    const items = await this.prisma.workItem.findMany({
      where: { organizationId: org },
      select: {
        id: true, key: true, title: true, workStream: true, workflowState: true,
        deliveryHealth: true, priority: true, estimateHours: true,
        currentEta: true, firstCommittedEta: true, completedAt: true,
        primaryAssigneeId: true, lastActivityAt: true,
      },
    });

    const active = items.filter((i) => (ACTIVE_STATES as string[]).includes(i.workflowState));
    const done = items.filter((i) => i.workflowState === 'DONE');
    const holidays = await this.calendar.loadHolidays(org);

    // سهم ظرفیت هر جریان کاری بر مبنای ساعت تخمینی کارهای فعال و تمام‌شده
    const streamHours = new Map<string, number>();
    for (const i of [...active, ...done]) {
      streamHours.set(i.workStream, (streamHours.get(i.workStream) ?? 0) + (i.estimateHours ?? 0));
    }
    const totalHours = [...streamHours.values()].reduce((a, b) => a + b, 0);

    const healthCount = this.countBy(items.filter((i) => i.workflowState !== 'DONE' && i.workflowState !== 'CANCELLED'), 'deliveryHealth');
    const stateCount = this.countBy(items.filter((i) => i.workflowState !== 'CANCELLED'), 'workflowState');
    const priorityCount = this.countBy(active, 'priority');

    // دقت تعهد: کارهای تمام‌شده که تعهد اولیه داشتند
    const withBaseline = done.filter((i) => i.firstCommittedEta && i.completedAt);
    const delays = withBaseline.map((i) =>
      this.calendar.countWorkingDays(i.firstCommittedEta!, i.completedAt!, holidays),
    );
    const onTime = delays.filter((d) => d <= 0).length;

    const now = new Date();
    const overdue = active.filter((i) => i.currentEta && i.currentEta < now).length;
    const stale = active.filter(
      (i) => this.calendar.countWorkingDays(i.lastActivityAt, now, holidays) >= 7,
    ).length;

    return {
      totals: {
        all: items.length,
        active: active.length,
        done: done.length,
        blocked: active.filter((i) => i.deliveryHealth === 'BLOCKED').length,
        atRisk: active.filter((i) => i.deliveryHealth === 'AT_RISK').length,
        overdue,
        stale,
        unassigned: active.filter((i) => !i.primaryAssigneeId).length,
      },
      workStreamShare: [...streamHours.entries()].map(([stream, hours]) => ({
        stream,
        hours,
        percent: totalHours ? Math.round((hours / totalHours) * 100) : 0,
      })),
      healthDistribution: healthCount,
      stateDistribution: stateCount,
      priorityDistribution: priorityCount,
      commitmentAccuracy: {
        measured: withBaseline.length,
        onTime,
        onTimePercent: withBaseline.length ? Math.round((onTime / withBaseline.length) * 100) : null,
        averageDelayWorkingDays: delays.length
          ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10
          : null,
        worstDelayWorkingDays: delays.length ? Math.max(...delays) : null,
      },
      blockedRatioPercent: active.length
        ? Math.round((active.filter((i) => i.deliveryHealth === 'BLOCKED').length / active.length) * 100)
        : 0,
    };
  }

  /** بی‌ثباتی برنامه: کدام کارها بیشترین جابه‌جایی تاریخ را داشته‌اند. */
  async scheduleStability(actor: Actor, limit = 10) {
    const history = await this.prisma.commitmentHistory.findMany({
      where: {
        changeKind: { in: ['ETA', 'BOTH'] },
        workItem: { organizationId: actor.organizationId },
      },
      include: { workItem: { select: { id: true, key: true, title: true, workflowState: true } } },
    });

    const byItem = new Map<string, { key: string; title: string; state: string; shifts: number; movement: number }>();
    for (const h of history) {
      if (!h.previousEta || !h.newEta) continue;
      const cur = byItem.get(h.workItemId) ?? {
        key: (h as any).workItem.key,
        title: (h as any).workItem.title,
        state: (h as any).workItem.workflowState,
        shifts: 0,
        movement: 0,
      };
      cur.shifts += 1;
      cur.movement += Math.abs(h.deltaWorkingDays ?? 0);
      byItem.set(h.workItemId, cur);
    }

    return [...byItem.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.movement - a.movement)
      .slice(0, limit);
  }

  /** چرا تاریخ‌ها عقب می‌افتند: توزیع علت‌ها. مهم‌ترین نمودار برای جلسه ماهانه. */
  async delayReasons(actor: Actor) {
    const [commitments, changes] = await Promise.all([
      this.prisma.commitmentHistory.findMany({
        where: { workItem: { organizationId: actor.organizationId } },
        select: { reasonType: true, deltaWorkingDays: true },
      }),
      this.prisma.changeRecord.findMany({
        where: { workItem: { organizationId: actor.organizationId } },
        select: { reasonType: true, field: true },
      }),
    ]);

    const map = new Map<string, { count: number; totalDays: number }>();
    for (const c of commitments) {
      const cur = map.get(c.reasonType) ?? { count: 0, totalDays: 0 };
      cur.count += 1;
      cur.totalDays += Math.max(0, c.deltaWorkingDays ?? 0);
      map.set(c.reasonType, cur);
    }

    const fieldMap = new Map<string, number>();
    for (const c of changes) fieldMap.set(c.field, (fieldMap.get(c.field) ?? 0) + 1);

    return {
      byReason: [...map.entries()]
        .map(([reason, v]) => ({ reason, ...v }))
        .sort((a, b) => b.totalDays - a.totalDays),
      byChangedField: [...fieldMap.entries()].map(([field, count]) => ({ field, count })),
    };
  }

  /**
   * بار کاری تیم. فقط برای سرپرست تیم و بالاتر.
   * عمداً هیچ نمای مقایسه‌ای «چه کسی بهتر است» ندارد — این ابزار برای
   * برنامه‌ریزی ظرفیت است نه رتبه‌بندی افراد. (D-009)
   */
  async teamWorkload(actor: Actor) {
    if (!can(actor.role, 'metrics.team.read')) {
      throw new AppError(403, 'FORBIDDEN', 'دیدن آمار تیم فقط برای سرپرست تیم و بالاتر ممکن است.');
    }

    const [users, items] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId: actor.organizationId, status: 'ACTIVE' },
        select: { id: true, fullName: true, weeklyCapacityHours: true },
      }),
      this.prisma.workItem.findMany({
        where: {
          organizationId: actor.organizationId,
          workflowState: { in: [...ACTIVE_STATES] },
        },
        select: { primaryAssigneeId: true, reviewerId: true, estimateHours: true, deliveryHealth: true, priority: true },
      }),
    ]);

    return users.map((u) => {
      const assigned = items.filter((i) => i.primaryAssigneeId === u.id);
      return {
        userId: u.id,
        fullName: u.fullName,
        capacityHours: u.weeklyCapacityHours,
        openItems: assigned.length,
        estimatedHours: assigned.reduce((s, i) => s + (i.estimateHours ?? 0), 0),
        blocked: assigned.filter((i) => i.deliveryHealth === 'BLOCKED').length,
        p0: assigned.filter((i) => i.priority === 'P0').length,
        inReviewQueue: items.filter((i) => i.reviewerId === u.id).length,
      };
    });
  }

  /** روند تحویل هفتگی — چند کار در هر هفته بسته شد. */
  async throughput(actor: Actor, weeks = 8) {
    const done = await this.prisma.workItem.findMany({
      where: { organizationId: actor.organizationId, workflowState: 'DONE', completedAt: { not: null } },
      select: { completedAt: true, workStream: true },
    });

    const buckets: { weekStart: string; count: number }[] = [];
    const thisWeek = this.calendar.startOfReportingWeek(new Date());

    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(thisWeek.getTime() - i * 7 * 86400_000);
      const end = new Date(start.getTime() + 7 * 86400_000);
      buckets.push({
        weekStart: start.toISOString().slice(0, 10),
        count: done.filter((d) => d.completedAt! >= start && d.completedAt! < end).length,
      });
    }
    return buckets;
  }

  private countBy<T extends Record<string, any>>(rows: T[], field: keyof T) {
    const map = new Map<string, number>();
    for (const r of rows) map.set(String(r[field]), (map.get(String(r[field])) ?? 0) + 1);
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  }
}
