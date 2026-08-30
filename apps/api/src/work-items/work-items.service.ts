import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { KeySequenceService } from '../key-sequence/key-sequence.service';
import { WorkingCalendarService } from '../calendar/working-calendar.service';
import { AppError } from '../common/errors';
import { normalizeFa } from '../common/text';
import { ALLOWED_TRANSITIONS, WorkflowState, CommitmentReason, ACTIVE_STATES, STALE_AFTER_WORKING_DAYS, REASON_REQUIRED_FIELDS, TrackedField, DELETION_REASONS, DeletionReason } from '../common/constants';
import { can } from '../authorization/permissions';
import { Role } from '../common/constants';
import {
  parseOrThrow,
  CreateWorkItemSchema,
  UpdateWorkItemSchema,
  ChangeStateSchema,
  ChangeHealthSchema,
  ChangeCommitmentSchema,
  ReBaselineSchema,
  CommentSchema,
} from '../common/validation';

type Actor = { id: string; role: Role; organizationId: string };

const MANAGE_ROLES = ['ORG_OWNER', 'ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'];
/**
 * تغییرات تعهدآور (تعهد زمانی، اولویت، مالک، مجری، مهلت) فقط برای مالک کار،
 * مجری، یا نقش مدیریتی. بقیه فقط می‌بینند و کامنت می‌گذارند. (تصمیم D-UX-2 / رفع C3)
 */
function canManageItem(actor: Actor, item: { ownerId?: string | null; primaryAssigneeId?: string | null }): boolean {
  return (
    MANAGE_ROLES.includes(actor.role) ||
    actor.id === item.ownerId ||
    actor.id === item.primaryAssigneeId
  );
}

export type CreateWorkItemInput = {
  title: string;
  description?: string;
  projectId?: string | null;
  parentId?: string | null;
  teamId?: string | null;
  workType: string;
  workStream: string;
  priority: string;
  ownerId: string;
  primaryAssigneeId?: string | null;
  reviewerId?: string | null;
  requiresReview?: boolean;
  requiresQa?: boolean;
  dueDate?: string | null;
  acceptanceCriteria?: string | null;
};

export type ChangeCommitmentInput = {
  newEta?: string | null;
  newEstimateHours?: number | null;
  confidence?: string | null;
  assumptions?: string | null;
  reasonType: CommitmentReason;
  reasonText?: string | null;
};

@Injectable()
export class WorkItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keys: KeySequenceService,
    private readonly calendar: WorkingCalendarService,
  ) {}

  // ---------- ساخت ----------

  async create(actor: Actor, raw: CreateWorkItemInput) {
    const input = parseOrThrow(CreateWorkItemSchema, raw) as CreateWorkItemInput;

    // مالک/مجری/بازبین باید واقعاً در همین سازمان باشند، وگرنه قبلاً خطای FK
    // پریسما به‌صورت ۵۰۰ «خطای غیرمنتظره» به کاربر می‌رسید.
    await this.assertUsersInOrg(actor, [input.ownerId, input.primaryAssigneeId, input.reviewerId]);
    if (input.teamId) await this.assertTeamInOrg(actor, input.teamId);

    // کار بدون پروژه مجاز است؛ در آن صورت پیشوند سازمانی TASK استفاده می‌شود. (D-005)
    let prefix = 'TASK';
    if (input.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: input.projectId, organizationId: actor.organizationId },
      });
      if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'پروژه پیدا نشد.');
      prefix = project.key;
    }

    // سلسله‌مراتب فقط یک سطح. (PM-C2)
    if (input.parentId) {
      const parent = await this.prisma.workItem.findFirst({
        where: { id: input.parentId, organizationId: actor.organizationId },
      });
      if (!parent) throw new AppError(404, 'PARENT_NOT_FOUND', 'کار والد پیدا نشد.');
      if (parent.parentId) {
        throw new AppError(422, 'HIERARCHY_TOO_DEEP', 'سلسله‌مراتب فقط یک سطح مجاز است.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const key = await this.keys.next(tx, actor.organizationId, prefix);
      const item = await tx.workItem.create({
        data: {
          id: randomUUID(),
          organizationId: actor.organizationId,
          projectId: input.projectId ?? null,
          parentId: input.parentId ?? null,
          teamId: input.teamId ?? null,
          key,
          title: input.title,
          titleNormalized: normalizeFa(input.title),
          description: input.description ?? null,
          workType: input.workType,
          workStream: input.workStream,
          workflowState: 'BACKLOG',
          deliveryHealth: 'ON_TRACK',
          priority: input.priority,
          ownerId: input.ownerId,
          primaryAssigneeId: input.primaryAssigneeId ?? null,
          reviewerId: input.reviewerId ?? null,
          requiresReview: input.requiresReview ?? false,
          requiresQa: input.requiresQa ?? false,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          acceptanceCriteria: input.acceptanceCriteria ?? null,
          createdById: actor.id,
          lastActivityAt: new Date(),
        },
      });

      await tx.activity.create({
        data: {
          id: randomUUID(),
          workItemId: item.id,
          actorId: actor.id,
          action: 'CREATED',
          toValue: item.key,
        },
      });

      return item;
    });
  }

  // ---------- گذار وضعیت ----------

  async changeState(actor: Actor, id: string, rawNext: WorkflowState, rawReason?: { reasonType: CommitmentReason; reasonText?: string }) {
    const parsed = parseOrThrow(ChangeStateSchema, {
      state: rawNext,
      reasonType: rawReason?.reasonType,
      reasonText: rawReason?.reasonText,
    });
    const next = parsed.state as WorkflowState;
    const reason = parsed.reasonType
      ? { reasonType: parsed.reasonType as CommitmentReason, reasonText: parsed.reasonText ?? undefined }
      : undefined;

    const item = await this.mustFind(actor, id);
    const current = item.workflowState as WorkflowState;

    if (current === next) return item;

    // لغو کردن کار باید توضیح داشته باشد تا بعداً بشود فهمید چرا رهایش کردیم
    if (next === 'CANCELLED' && !reason?.reasonType) {
      throw new AppError(422, 'REASON_REQUIRED', 'برای لغو کار باید بگویید چرا. بدون علت لغو نمی‌شود.');
    }

    const allowed = ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new AppError(422, 'INVALID_TRANSITION', `گذار از «${current}» به «${next}» مجاز نیست.`);
    }

    // رفتن به «منتظر تأیید» بدون تأییدکننده، کار را در صف هیچ‌کس گم می‌کند. (BE-2)
    if (next === 'IN_REVIEW' && !item.reviewerId) {
      throw new AppError(422, 'REVIEWER_REQUIRED', 'برای فرستادن به تأیید، اول یک تأییدکننده تعیین کنید.');
    }

    // تأیید (خروجِ رو‌به‌جلو از منتظر تأیید) فقط با تأییدکننده‌ی تعیین‌شده یا نقش
    // مدیریتی. پیش‌تر هر کسی می‌توانست کار هر کس را تأیید کند و reviewerId تزئینی بود. (BE-1)
    const approving = current === 'IN_REVIEW' && (next === 'DONE' || next === 'IN_QA');
    if (approving) {
      const elevated = ['ORG_OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(actor.role);
      if (actor.id !== item.reviewerId && !elevated) {
        throw new AppError(403, 'NOT_REVIEWER', 'فقط تأییدکننده‌ی این کار (یا مدیر پروژه) می‌تواند آن را تأیید کند.');
      }
    }

    // بازبینی اختیاری است، ولی اگر لازم شده باشد نمی‌توان از آن پرید. (D-005)
    // شرط قبلی فقط گذار مستقیم IN_PROGRESS → DONE را می‌بست، پس مسیر
    // IN_PROGRESS → IN_QA → DONE بازبینی را کامل دور می‌زد. حالا ملاک این است
    // که کار واقعاً یک بار از IN_REVIEW عبور کرده باشد، نه اینکه همین حالا آنجا باشد.
    if (next === 'DONE' && item.requiresReview && current !== 'IN_REVIEW') {
      const reviewed = await this.prisma.activity.findFirst({
        where: { workItemId: id, action: 'STATE_CHANGED', toValue: 'IN_REVIEW' },
      });
      if (!reviewed) {
        throw new AppError(
          422,
          'REVIEW_REQUIRED',
          'این کار نیاز به بازبینی دارد و نمی‌تواند بدون عبور از مرحله بازبینی به «انجام شده» برود.',
        );
      }
    }
    if (next === 'DONE' && item.requiresQa && current !== 'IN_QA') {
      throw new AppError(422, 'QA_REQUIRED', 'این کار باید ابتدا از مرحله QA عبور کند.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          workflowState: next,
          // تاریخ اتمام فقط وقتی پاک می‌شود که کار واقعاً از حالت «انجام شده» خارج شود.
          // پیش‌تر هر گذاری آن را null می‌کرد و تاریخ تحویل واقعی از بین می‌رفت.
          completedAt:
            next === 'DONE' ? new Date() : current === 'DONE' ? null : item.completedAt,
          lastActivityAt: new Date(),
        },
      });
      await tx.activity.create({
        data: {
          id: randomUUID(),
          workItemId: id,
          actorId: actor.id,
          action: 'STATE_CHANGED',
          fromValue: current,
          toValue: next,
        },
      });
      // علتِ لغو، و علتِ «برگشت با توضیح» از بازبینی، هر دو در دفتر تغییرات می‌مانند. (BE-4)
      const sendingBack = current === 'IN_REVIEW' && next === 'IN_PROGRESS';
      if (reason?.reasonType && (next === 'CANCELLED' || sendingBack)) {
        await tx.changeRecord.create({
          data: {
            id: randomUUID(),
            workItemId: id,
            field: next === 'CANCELLED' ? 'CANCEL' : 'STATE',
            fromValue: current,
            toValue: next,
            reasonType: reason.reasonType,
            reasonText: reason.reasonText ?? null,
            changedById: actor.id,
          },
        });
      }
      return updated;
    });
  }

  // ---------- سلامت تحویل ----------

  async changeHealth(actor: Actor, id: string, rawHealth: string, rawNote?: string) {
    const parsed = parseOrThrow(ChangeHealthSchema, { health: rawHealth, note: rawNote });
    const health = parsed.health;
    const note = parsed.note ?? undefined;
    const item = await this.mustFind(actor, id);

    if ((health === 'AT_RISK' || health === 'BLOCKED') && !note?.trim()) {
      throw new AppError(422, 'HEALTH_NOTE_REQUIRED', 'برای وضعیت «در خطر» یا «مسدود» ثبت توضیح اجباری است.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: { deliveryHealth: health, healthNote: note ?? null, lastActivityAt: new Date() },
      });
      await tx.activity.create({
        data: {
          id: randomUUID(),
          workItemId: id,
          actorId: actor.id,
          action: 'HEALTH_CHANGED',
          fromValue: item.deliveryHealth,
          toValue: health,
        },
      });
      return updated;
    });
  }

  // ---------- تاریخچه تعهد: قلب محصول ----------

  /**
   * تنها مسیر تغییر ETA و تخمین.
   * هیچ متد دیگری اجازه نوشتن روی currentEta یا estimateHours ندارد. (PM-C6)
   */
  async changeCommitment(actor: Actor, id: string, raw: ChangeCommitmentInput) {
    const input = parseOrThrow(ChangeCommitmentSchema, raw) as ChangeCommitmentInput;
    const item = await this.mustFind(actor, id);
    if (!canManageItem(actor, item)) {
      throw new AppError(403, 'FORBIDDEN', 'تغییر تعهد زمانی فقط توسط مالک، مجری یا مدیر ممکن است.');
    }

    const etaChanged =
      input.newEta !== undefined &&
      new Date(input.newEta ?? 0).getTime() !== (item.currentEta?.getTime() ?? 0);
    const estimateChanged =
      input.newEstimateHours !== undefined && input.newEstimateHours !== item.estimateHours;

    if (!etaChanged && !estimateChanged) {
      throw new AppError(422, 'NO_CHANGE', 'هیچ تغییری در تعهد ثبت نشده است.');
    }
    if (!input.reasonType) {
      throw new AppError(422, 'REASON_REQUIRED', 'ثبت علت تغییر اجباری است.');
    }

    const newEta = input.newEta ? new Date(input.newEta) : null;

    // اولین ثبت ETA، Baseline را قفل می‌کند و از آن پس تغییرناپذیر است. (PM-C5)
    const isFirstEta = etaChanged && !item.firstCommittedEta && newEta !== null;
    if (etaChanged && newEta && !input.confidence && !item.etaConfidence) {
      throw new AppError(422, 'CONFIDENCE_REQUIRED', 'ثبت ETA بدون سطح اطمینان مجاز نیست.');
    }

    const holidays = await this.calendar.loadHolidays(actor.organizationId);
    const delta =
      item.currentEta && newEta ? this.calendar.countWorkingDays(item.currentEta, newEta, holidays) : null;

    const changeKind = etaChanged && estimateChanged ? 'BOTH' : etaChanged ? 'ETA' : 'ESTIMATE';

    return this.prisma.$transaction(async (tx) => {
      const lastVersion = await tx.commitmentHistory.findFirst({
        where: { workItemId: id },
        orderBy: { versionNo: 'desc' },
        select: { versionNo: true },
      });

      await tx.commitmentHistory.create({
        data: {
          id: randomUUID(),
          workItemId: id,
          versionNo: (lastVersion?.versionNo ?? 0) + 1,
          changeKind,
          previousEta: item.currentEta,
          newEta,
          deltaWorkingDays: delta,
          previousEstimateHours: item.estimateHours,
          newEstimateHours: input.newEstimateHours ?? item.estimateHours,
          reasonType: input.reasonType,
          reasonText: input.reasonText ?? null,
          confidence: input.confidence ?? item.etaConfidence,
          changedById: actor.id,
        },
      });

      const updated = await tx.workItem.update({
        where: { id },
        data: {
          currentEta: etaChanged ? newEta : item.currentEta,
          firstCommittedEta: isFirstEta ? newEta : item.firstCommittedEta,
          activeBaselineEta: isFirstEta ? newEta : item.activeBaselineEta,
          estimateHours: estimateChanged ? input.newEstimateHours : item.estimateHours,
          etaConfidence: input.confidence ?? item.etaConfidence,
          etaAssumptions: input.assumptions ?? item.etaAssumptions,
          lastActivityAt: new Date(),
        },
      });

      await tx.activity.create({
        data: {
          id: randomUUID(),
          workItemId: id,
          actorId: actor.id,
          action: 'ETA_CHANGED',
          fromValue: item.currentEta?.toISOString() ?? null,
          toValue: newEta?.toISOString() ?? null,
        },
      });

      return updated;
    });
  }

  /**
   * Re-baseline صریح. Baseline اول هرگز پاک نمی‌شود؛ فقط baseline فعال جابه‌جا می‌شود. (D-005، PM-C7)
   */
  async reBaseline(actor: Actor, id: string, rawBaseline: string, rawReasonText: string) {
    const parsed = parseOrThrow(ReBaselineSchema, { newBaseline: rawBaseline, reasonText: rawReasonText });
    const newBaseline = parsed.newBaseline;
    const reasonText = parsed.reasonText ?? '';
    if (!can(actor.role, 'workitem.rebaseline')) {
      throw new AppError(403, 'FORBIDDEN', 'فقط مدیر پروژه یا بالاتر می‌تواند Baseline را بازتعریف کند.');
    }
    if (!reasonText?.trim()) {
      throw new AppError(422, 'REASON_REQUIRED', 'ثبت دلیل بازتعریف Baseline اجباری است.');
    }

    const item = await this.mustFind(actor, id);
    if (!item.firstCommittedEta) {
      throw new AppError(422, 'NO_BASELINE', 'این کار هنوز Baseline اولیه ندارد.');
    }

    const next = new Date(newBaseline);
    const holidays = await this.calendar.loadHolidays(actor.organizationId);

    return this.prisma.$transaction(async (tx) => {
      const lastVersion = await tx.commitmentHistory.findFirst({
        where: { workItemId: id },
        orderBy: { versionNo: 'desc' },
        select: { versionNo: true },
      });

      await tx.commitmentHistory.create({
        data: {
          id: randomUUID(),
          workItemId: id,
          versionNo: (lastVersion?.versionNo ?? 0) + 1,
          changeKind: 'RE_BASELINE',
          previousEta: item.activeBaselineEta,
          newEta: next,
          deltaWorkingDays: item.activeBaselineEta
            ? this.calendar.countWorkingDays(item.activeBaselineEta, next, holidays)
            : null,
          reasonType: 'SCOPE_CHANGE',
          reasonText,
          changedById: actor.id,
        },
      });

      return tx.workItem.update({
        where: { id },
        data: { activeBaselineEta: next, currentEta: next, lastActivityAt: new Date() },
      });
    });
  }

  // ---------- خواندن ----------

  /** معیارهای جابه‌جایی زمان برای نمایش روی کارت. (KPI Formulas) */
  async scheduleMetrics(actor: Actor, id: string) {
    const item = await this.mustFind(actor, id);
    const history = await this.prisma.commitmentHistory.findMany({
      where: { workItemId: id, changeKind: { in: ['ETA', 'BOTH'] } },
      orderBy: { versionNo: 'asc' },
    });
    const holidays = await this.calendar.loadHolidays(actor.organizationId);

    const shiftCount = history.filter((h) => h.previousEta && h.newEta).length;
    const cumulativeMovement = history.reduce((sum, h) => sum + Math.abs(h.deltaWorkingDays ?? 0), 0);
    const last = history[history.length - 1];

    return {
      etaShiftCount: shiftCount,
      lastShiftWorkingDays: last?.deltaWorkingDays ?? null,
      cumulativeMovementWorkingDays: cumulativeMovement,
      driftFromFirstBaseline:
        item.firstCommittedEta && item.currentEta
          ? this.calendar.countWorkingDays(item.firstCommittedEta, item.currentEta, holidays)
          : null,
      driftFromActiveBaseline:
        item.activeBaselineEta && item.currentEta
          ? this.calendar.countWorkingDays(item.activeBaselineEta, item.currentEta, holidays)
          : null,
      finalBaselineDelay:
        item.completedAt && item.firstCommittedEta
          ? this.calendar.countWorkingDays(item.firstCommittedEta, item.completedAt, holidays)
          : null,
    };
  }

  async myWork(actor: Actor) {
    const [inProgress, awaitingMyReview, overdue] = await Promise.all([
      this.prisma.workItem.findMany({
        where: {
          organizationId: actor.organizationId,
          primaryAssigneeId: actor.id,
          workflowState: { in: ['READY', 'IN_PROGRESS'] },
        },
        orderBy: [{ priority: 'asc' }, { currentEta: 'asc' }],
      }),
      this.prisma.workItem.findMany({
        where: {
          organizationId: actor.organizationId,
          reviewerId: actor.id,
          workflowState: 'IN_REVIEW',
        },
        orderBy: [{ priority: 'asc' }],
      }),
      this.prisma.workItem.findMany({
        where: {
          organizationId: actor.organizationId,
          primaryAssigneeId: actor.id,
          workflowState: { notIn: ['DONE', 'CANCELLED'] },
          currentEta: { lt: new Date() },
        },
        orderBy: [{ currentEta: 'asc' }],
      }),
    ]);
    const [a, b, c] = await Promise.all([
      this.withDrift(actor.organizationId, inProgress),
      this.withDrift(actor.organizationId, awaitingMyReview),
      this.withDrift(actor.organizationId, overdue),
    ]);
    return { inProgress: a, awaitingMyReview: b, overdue: c };
  }

  async search(actor: Actor, query: string, take = 50) {
    const q = normalizeFa(query);
    const rows = await this.prisma.workItem.findMany({
      where: {
        organizationId: actor.organizationId,
        OR: [{ titleNormalized: { contains: q } }, { key: { contains: query.toUpperCase() } }],
      },
      take,
      orderBy: { lastActivityAt: 'desc' },
    });
    return this.withDrift(actor.organizationId, rows);
  }

  // ---------- فهرست و جزئیات ----------

  /** فهرست با فیلتر برای بورد و نمای جدولی. (PM-D1، PM-D3) */
  async list(
    actor: Actor,
    filters: {
      projectId?: string;
      teamId?: string;
      assigneeId?: string;
      workStream?: string;
      priority?: string;
      deliveryHealth?: string;
      includeClosed?: boolean;
    } = {},
  ) {
    const rows = await this.prisma.workItem.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(filters.projectId === 'none' ? { projectId: null } : filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.teamId ? { teamId: filters.teamId } : {}),
        ...(filters.assigneeId ? { primaryAssigneeId: filters.assigneeId } : {}),
        ...(filters.workStream ? { workStream: filters.workStream } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.deliveryHealth ? { deliveryHealth: filters.deliveryHealth } : {}),
        ...(filters.includeClosed ? {} : { workflowState: { not: 'CANCELLED' } }),
      },
      orderBy: [{ priority: 'asc' }, { lastActivityAt: 'desc' }],
      take: 500,
    });
    return this.withDrift(actor.organizationId, rows);
  }

  /** جزئیات کامل یک کار همراه تاریخچه تعهد، فعالیت و کامنت‌ها. */
  async detail(actor: Actor, id: string) {
    const item = await this.mustFind(actor, id);
    const [commitments, changes, activities, comments, children, metrics] = await Promise.all([
      this.prisma.commitmentHistory.findMany({
        where: { workItemId: id },
        orderBy: { versionNo: 'desc' },
        include: { changedBy: { select: { id: true, fullName: true } } },
      }),
      this.prisma.changeRecord.findMany({
        where: { workItemId: id },
        orderBy: { createdAt: 'desc' },
        include: { changedBy: { select: { id: true, fullName: true } } },
      }),
      this.prisma.activity.findMany({
        where: { workItemId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { actor: { select: { id: true, fullName: true } } },
      }),
      this.prisma.comment.findMany({
        where: { workItemId: id },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, fullName: true } } },
      }),
      this.prisma.workItem.findMany({
        where: { parentId: id, organizationId: actor.organizationId },
      }),
      this.scheduleMetrics(actor, id),
    ]);
    return { item, commitments, changes, activities, comments, children, metrics };
  }

  /**
   * به‌روزرسانی فیلدهای عمومی.
   * currentEta، firstCommittedEta و estimateHours عمداً اینجا نیستند —
   * تنها راهشان changeCommitment است. (PM-C6)
   */
  async update(
    actor: Actor,
    id: string,
    input: {
      title?: string;
      description?: string | null;
      priority?: string;
      ownerId?: string;
      primaryAssigneeId?: string | null;
      reviewerId?: string | null;
      teamId?: string | null;
      requiresReview?: boolean;
      requiresQa?: boolean;
      dueDate?: string | null;
      acceptanceCriteria?: string | null;
      /** علت تغییر — برای اولویت، مهلت، مجری و مالک اجباری است */
      reasonType?: CommitmentReason;
      reasonText?: string | null;
      /** کاری که به‌خاطر این تغییر عقب می‌افتد */
      displacedWorkItemId?: string | null;
    },
  ) {
    input = parseOrThrow(UpdateWorkItemSchema, input) as typeof input;
    const item = await this.mustFind(actor, id);

    await this.assertUsersInOrg(actor, [input.ownerId, input.primaryAssigneeId, input.reviewerId]);
    if (input.teamId) await this.assertTeamInOrg(actor, input.teamId);

    if (input.priority && input.priority !== item.priority && !can(actor.role, 'workitem.priority.set')) {
      throw new AppError(403, 'FORBIDDEN', 'تغییر اولویت فقط توسط سرپرست تیم یا بالاتر ممکن است.');
    }

    // تشخیص تغییرات ردیابی‌شده و الزام علت
    const tracked: { field: TrackedField; from: any; to: any }[] = [];
    if (input.priority !== undefined && input.priority !== item.priority)
      tracked.push({ field: 'PRIORITY', from: item.priority, to: input.priority });
    if (input.dueDate !== undefined) {
      const next = input.dueDate ? new Date(input.dueDate).toISOString() : null;
      const prev = item.dueDate?.toISOString() ?? null;
      if (next !== prev) tracked.push({ field: 'DUE_DATE', from: prev, to: next });
    }
    if (input.primaryAssigneeId !== undefined && input.primaryAssigneeId !== item.primaryAssigneeId)
      tracked.push({ field: 'ASSIGNEE', from: item.primaryAssigneeId, to: input.primaryAssigneeId });
    if (input.ownerId !== undefined && input.ownerId !== item.ownerId)
      tracked.push({ field: 'OWNER', from: item.ownerId, to: input.ownerId });

    // تغییرات تعهدآور (اولویت/مهلت/مجری/مالک) فقط برای مالک/مجری/مدیر. (D-UX-2 / C3)
    if (tracked.length > 0 && !canManageItem(actor, item)) {
      throw new AppError(403, 'FORBIDDEN', 'این تغییر فقط توسط مالک، مجری یا مدیر این کار ممکن است.');
    }

    const needsReason = tracked.some((t) => (REASON_REQUIRED_FIELDS as readonly string[]).includes(t.field));
    if (needsReason && !input.reasonType) {
      const names: Record<string, string> = {
        PRIORITY: 'اولویت', DUE_DATE: 'مهلت', ASSIGNEE: 'مجری', OWNER: 'مالک',
      };
      const changed = tracked.map((t) => names[t.field] ?? t.field).join(' و ');
      throw new AppError(
        422,
        'REASON_REQUIRED',
        `برای تغییر ${changed} باید بگویید چرا. بدون علت ثبت نمی‌شود.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          title: input.title?.trim(),
          titleNormalized: input.title ? normalizeFa(input.title) : undefined,
          description: input.description,
          priority: input.priority,
          ownerId: input.ownerId,
          primaryAssigneeId: input.primaryAssigneeId,
          reviewerId: input.reviewerId,
          teamId: input.teamId,
          requiresReview: input.requiresReview,
          requiresQa: input.requiresQa,
          // پاک کردن مهلت باید ممکن باشد: undefined یعنی «دست نزن»،
          // null یعنی «خالی کن». قبلاً null هم به undefined تبدیل می‌شد و
          // تغییر در دفتر ثبت می‌شد ولی روی رکورد اعمال نمی‌شد.
          dueDate:
            input.dueDate === undefined ? undefined : input.dueDate ? new Date(input.dueDate) : null,
          acceptanceCriteria: input.acceptanceCriteria,
          lastActivityAt: new Date(),
        },
      });

      for (const change of tracked) {
        await tx.changeRecord.create({
          data: {
            id: randomUUID(),
            workItemId: id,
            field: change.field,
            fromValue: change.from ? String(change.from) : null,
            toValue: change.to ? String(change.to) : null,
            reasonType: input.reasonType ?? 'EXTERNAL',
            reasonText: input.reasonText ?? null,
            displacedWorkItemId: input.displacedWorkItemId ?? null,
            changedById: actor.id,
          },
        });
        await tx.activity.create({
          data: {
            id: randomUUID(),
            workItemId: id,
            actorId: actor.id,
            action: `${change.field}_CHANGED`,
            fromValue: change.from ? String(change.from) : null,
            toValue: change.to ? String(change.to) : null,
          },
        });
      }

      return updated;
    });
  }

  async addComment(actor: Actor, id: string, rawBody: string) {
    await this.mustFind(actor, id);
    if (!rawBody?.trim()) throw new AppError(422, 'EMPTY_COMMENT', 'متن دیدگاه خالی است.');
    const body = parseOrThrow(CommentSchema, { body: rawBody }).body;

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { id: randomUUID(), workItemId: id, authorId: actor.id, body: body.trim() },
      });
      await tx.workItem.update({ where: { id }, data: { lastActivityAt: new Date() } });
      return comment;
    });
  }

  /**
   * کار فعالی که بیش از حد مجاز بی‌حرکت مانده، خودکار «نامشخص» می‌شود. (D-007)
   * توسط کرون روزانه صدا زده می‌شود.
   */
  async flagStaleItems(organizationId: string): Promise<number> {
    const holidays = await this.calendar.loadHolidays(organizationId);
    const candidates = await this.prisma.workItem.findMany({
      where: {
        organizationId,
        workflowState: { in: ACTIVE_STATES },
        deliveryHealth: { not: 'UNKNOWN' },
      },
      select: { id: true, lastActivityAt: true },
    });

    const now = new Date();
    const stale = candidates.filter(
      (c) => this.calendar.countWorkingDays(c.lastActivityAt, now, holidays) >= STALE_AFTER_WORKING_DAYS,
    );
    if (stale.length === 0) return 0;

    await this.prisma.workItem.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { deliveryHealth: 'UNKNOWN', healthNote: 'بیش از حد مجاز بدون به‌روزرسانی مانده است.' },
    });
    return stale.length;
  }

  /**
   * انحراف تعهد را به فهرست اضافه می‌کند تا کارت‌ها بتوانند بدون یک
   * درخواست جداگانه به‌ازای هر کار، جابه‌جایی تاریخ را نشان دهند.
   * محاسبه در حافظه انجام می‌شود و تعطیلات یک بار بارگذاری می‌شود.
   */
  private async withDrift<T extends { firstCommittedEta: Date | null; currentEta: Date | null }>(
    organizationId: string,
    rows: T[],
  ): Promise<(T & { driftWorkingDays: number | null })[]> {
    if (rows.length === 0) return [];
    const holidays = await this.calendar.loadHolidays(organizationId);
    return rows.map((r) => ({
      ...r,
      driftWorkingDays:
        r.firstCommittedEta && r.currentEta
          ? this.calendar.countWorkingDays(r.firstCommittedEta, r.currentEta, holidays)
          : null,
    }));
  }

  /** ارجاع به کاربر خارج از سازمان یا ناموجود باید ۴۲۲ بدهد، نه ۵۰۰. */
  private async assertUsersInOrg(actor: Actor, ids: (string | null | undefined)[]) {
    const wanted = [...new Set(ids.filter((v): v is string => !!v))];
    if (wanted.length === 0) return;
    const found = await this.prisma.user.count({
      where: { id: { in: wanted }, organizationId: actor.organizationId },
    });
    if (found !== wanted.length) {
      throw new AppError(422, 'USER_NOT_FOUND', 'یکی از افراد انتخاب‌شده در این سازمان پیدا نشد.');
    }
  }

  private async assertTeamInOrg(actor: Actor, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, organizationId: actor.organizationId },
    });
    if (!team) throw new AppError(422, 'TEAM_NOT_FOUND', 'تیم انتخاب‌شده پیدا نشد.');
  }

  async requestDeletion(actor: Actor, id: string, reason: string, reasonText?: string) {
    if (!DELETION_REASONS.includes(reason as DeletionReason)) {
      throw new AppError(422, 'INVALID_REASON', 'علت حذف نامعتبر است.');
    }
    const item = await this.mustFind(actor, id);
    if (item.workflowState === 'PENDING_DELETE') {
      throw new AppError(422, 'ALREADY_PENDING', 'این کار قبلاً در صف حذف قرار دارد.');
    }
    if (['DONE', 'CANCELLED'].includes(item.workflowState)) {
      throw new AppError(422, 'CLOSED_ITEM', 'کار بسته‌شده قابل درخواست حذف نیست.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workItem.update({
        where: { id },
        data: {
          previousState: item.workflowState,
          workflowState: 'PENDING_DELETE',
          deletionReason: reason,
          deletionReasonText: reasonText ?? null,
          deletionRequestedById: actor.id,
          lastActivityAt: new Date(),
        },
      });
      await tx.activity.create({
        data: {
          id: randomUUID(),
          workItemId: id,
          actorId: actor.id,
          action: 'STATE_CHANGED',
          fromValue: item.workflowState,
          toValue: 'PENDING_DELETE',
        },
      });
      await tx.changeRecord.create({
        data: {
          id: randomUUID(),
          workItemId: id,
          field: 'STATE',
          fromValue: item.workflowState,
          toValue: 'PENDING_DELETE',
          reasonType: 'EXTERNAL',
          reasonText: reasonText ?? reason,
          changedById: actor.id,
        },
      });
    });
    return { ok: true };
  }

  async deleteItem(actor: Actor, id: string) {
    const item = await this.mustFind(actor, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.activity.deleteMany({ where: { workItemId: id } });
      await tx.comment.deleteMany({ where: { workItemId: id } });
      await tx.changeRecord.deleteMany({ where: { workItemId: id } });
      await tx.commitmentHistory.deleteMany({ where: { workItemId: id } });
      await tx.workItem.delete({ where: { id } });
    });
    return { ok: true };
  }

  async rejectDeletion(actor: Actor, id: string, explanation: string) {
    if (!explanation || !explanation.trim()) {
      throw new AppError(422, 'MISSING_EXPLANATION', 'توضیح دلیل رد حذف الزامی است.');
    }
    const item = await this.mustFind(actor, id);
    if (item.workflowState !== 'PENDING_DELETE') {
      throw new AppError(422, 'NOT_PENDING', 'این کار در صف حذف نیست.');
    }
    const restoreState = (item.previousState as WorkflowState) || 'BACKLOG';

    await this.prisma.$transaction(async (tx) => {
      await tx.workItem.update({
        where: { id },
        data: {
          workflowState: restoreState,
          previousState: null,
          deletionReason: null,
          deletionReasonText: null,
          deletionRequestedById: null,
          lastActivityAt: new Date(),
        },
      });
      await tx.activity.create({
        data: {
          id: randomUUID(),
          workItemId: id,
          actorId: actor.id,
          action: 'STATE_CHANGED',
          fromValue: 'PENDING_DELETE',
          toValue: restoreState,
        },
      });
      await tx.comment.create({
        data: {
          id: randomUUID(),
          workItemId: id,
          authorId: actor.id,
          body: `درخواست حذف رد شد: ${explanation.trim()}`,
        },
      });
    });
    return { ok: true };
  }

  async deletionQueue(actor: Actor) {
    return this.prisma.workItem.findMany({
      where: {
        organizationId: actor.organizationId,
        workflowState: 'PENDING_DELETE',
      },
      select: {
        id: true,
        key: true,
        title: true,
        deletionReason: true,
        deletionReasonText: true,
        deletionRequestedById: true,
        previousState: true,
        lastActivityAt: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  private async mustFind(actor: Actor, id: string) {
    const item = await this.prisma.workItem.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!item) throw new AppError(404, 'WORK_ITEM_NOT_FOUND', 'کار موردنظر پیدا نشد.');
    return item;
  }
}
