/**
 * تست جامع سناریوهای واقعی تیم ایران پیمکس.
 * هدف: پوشش هر فیلد، هر وضعیت، هر نقش و هر مسیر خطا.
 * در پایان همه‌ی داده‌های ساخته‌شده حذف و پاکی محیط تأیید می‌شود.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';

import { HarnessPrisma } from './helpers/harness-prisma';
import { UsersService } from '../src/users/users.service';
import { TeamsService } from '../src/teams/teams.service';
import { ProjectsService } from '../src/projects/projects.service';
import { WorkItemsService } from '../src/work-items/work-items.service';
import { KeySequenceService } from '../src/key-sequence/key-sequence.service';
import * as wd from '../src/calendar/working-days';
import {
  WORKFLOW_STATES, DELIVERY_HEALTH, PRIORITIES, WORK_STREAMS,
  WORK_TYPES, COMMITMENT_REASONS, ETA_CONFIDENCE, ROLES,
} from '../src/common/constants';

const ORG = 'org-ipx';
let dir: string;
let prisma: any;
let users: UsersService;
let teams: TeamsService;
let projects: ProjectsService;
let items: WorkItemsService;

const calendar: any = {
  loadHolidays: async () => new Set<string>(),
  countWorkingDays: wd.countWorkingDays,
  addWorkingDays: wd.addWorkingDays,
  isWorkingDay: wd.isWorkingDay,
};

const admin = { id: 'admin', role: 'ORG_OWNER' as const, organizationId: ORG };
const P: Record<string, string> = {}; // شناسه افراد
const T: Record<string, string> = {}; // شناسه تیم‌ها
const W: Record<string, string> = {}; // شناسه کارها
const PR: Record<string, string> = {}; // شناسه پروژه‌ها

const as = (name: string, role: any) => ({ id: P[name], role, organizationId: ORG });

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'peos-full-'));
  prisma = new HarnessPrisma(join(dir, 'app.db'));
  users = new UsersService(prisma);
  teams = new TeamsService(prisma);
  projects = new ProjectsService(prisma);
  items = new WorkItemsService(prisma, new KeySequenceService(), calendar);

  await prisma.organization.create({ data: { id: ORG, name: 'ایران پیمکس', timezone: 'Asia/Tehran' } });
  await prisma.user.create({
    data: {
      id: admin.id, organizationId: ORG, fullName: 'مدیر سیستم', username: 'admin',
      passwordHash: await bcrypt.hash('Admin-Strong-1', 10), role: 'ORG_OWNER',
      status: 'ACTIVE', mustChangePassword: false, jobTitle: 'مدیرعامل', createdAt: new Date(),
    },
  });

  for (const n of ['Backend', 'Frontend', 'Marketing & Growth', 'Design & Content']) {
    T[n] = (await teams.create(admin, n)).id;
  }
  const roster: [string, string, string, string][] = [
    ['ترابی', 'هد بک‌اند', 'TEAM_LEAD', 'Backend'],
    ['گلی', 'کارشناس بک‌اند', 'CONTRIBUTOR', 'Backend'],
    ['دلیری', 'هد فرانت', 'TEAM_LEAD', 'Frontend'],
    ['نیکروان', 'ارشد بازاریابی', 'CONTRIBUTOR', 'Marketing & Growth'],
    ['مقدم', 'دیزاینر و تولید محتوا', 'CONTRIBUTOR', 'Design & Content'],
  ];
  for (const [i, [name, title, role, team]] of roster.entries()) {
    const r = await users.create(admin, {
      fullName: name, username: `user${i + 1}`, jobTitle: title,
      role: role as any, primaryTeamId: T[team],
    });
    P[name] = r.id;
  }
  await teams.setLead(admin, T['Backend'], P['ترابی']);
  await teams.setLead(admin, T['Frontend'], P['دلیری']);

  PR['IPX'] = (await projects.create(admin, { key: 'IPX', name: 'IranPeymex', ownerId: P['ترابی'] })).id;
  PR['WEB'] = (await projects.create(admin, { key: 'WEB', name: 'بازطراحی وب‌سایت', ownerId: P['دلیری'] })).id;
  for (const id of Object.values(P)) {
    await projects.addMember(admin, PR['IPX'], id);
    await projects.addMember(admin, PR['WEB'], id);
  }
});

afterAll(() => {
  prisma?.close?.();
  rmSync(dir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────
describe('س۱) پوشش کامل انواع فیلدها هنگام ساخت کار', () => {
  it('کار با تمام فیلدهای اختیاری پر', async () => {
    const item = await items.create(as('ترابی', 'TEAM_LEAD'), {
      title: 'یکپارچه‌سازی درگاه پرداخت جدید',
      description: 'اتصال به درگاه بانک ملت با پشتیبانی از بازگشت وجه',
      projectId: PR['IPX'],
      teamId: T['Backend'],
      workType: 'FEATURE',
      workStream: 'PRODUCT',
      priority: 'P0',
      ownerId: P['ترابی'],
      primaryAssigneeId: P['گلی'],
      reviewerId: P['ترابی'],
      requiresReview: true,
      requiresQa: true,
      dueDate: '2026-10-15T00:00:00Z',
      acceptanceCriteria: 'پرداخت موفق، بازگشت وجه، و ثبت لاگ تراکنش',
    });
    W['full'] = item.id;
    expect(item.key).toBe('IPX-1');
    expect(item.acceptanceCriteria).toContain('بازگشت وجه');
    expect(item.requiresQa).toBe(true);
    expect(item.teamId).toBe(T['Backend']);
  });

  it('کار با حداقل فیلدهای اجباری', async () => {
    const item = await items.create(as('نیکروان', 'CONTRIBUTOR'), {
      title: 'حداقلی',
      workType: 'TASK',
      workStream: 'SUPPORT',
      priority: 'P3',
      ownerId: P['نیکروان'],
    });
    W['minimal'] = item.id;
    expect(item.primaryAssigneeId).toBeNull();
    expect(item.dueDate).toBeNull();
    expect(item.requiresReview).toBe(false);
  });

  it('هر شش نوع کار پذیرفته می‌شود', async () => {
    for (const workType of WORK_TYPES) {
      const item = await items.create(as('ترابی', 'TEAM_LEAD'), {
        title: `نوع ${workType}`, workType, workStream: 'PRODUCT',
        priority: 'P2', ownerId: P['ترابی'],
      });
      expect(item.workType).toBe(workType);
    }
  });

  it('هر چهار جریان کاری پذیرفته می‌شود', async () => {
    for (const workStream of WORK_STREAMS) {
      const item = await items.create(as('ترابی', 'TEAM_LEAD'), {
        title: `جریان ${workStream}`, workType: 'TASK', workStream,
        priority: 'P2', ownerId: P['ترابی'],
      });
      expect(item.workStream).toBe(workStream);
    }
  });

  it('هر چهار اولویت پذیرفته می‌شود', async () => {
    for (const priority of PRIORITIES) {
      const item = await items.create(as('ترابی', 'TEAM_LEAD'), {
        title: `اولویت ${priority}`, workType: 'TASK', workStream: 'PRODUCT',
        priority, ownerId: P['ترابی'],
      });
      expect(item.priority).toBe(priority);
    }
  });
});

// ─────────────────────────────────────────────────────────
describe('س۲) هر گذار مجاز و غیرمجاز وضعیت', () => {
  const goli = () => as('گلی', 'CONTRIBUTOR');

  it('مسیر کامل بدون بازبینی: بک‌لاگ ← آماده ← در حال انجام ← انجام شده', async () => {
    const item = await items.create(goli(), {
      title: 'مسیر ساده', workType: 'TASK', workStream: 'PRODUCT',
      priority: 'P2', ownerId: P['گلی'], primaryAssigneeId: P['گلی'],
    });
    await items.changeState(goli(), item.id, 'READY');
    await items.changeState(goli(), item.id, 'IN_PROGRESS');
    const done = await items.changeState(goli(), item.id, 'DONE');
    expect(done.workflowState).toBe('DONE');
    expect(done.completedAt).toBeTruthy();
  });

  it('مسیر کامل با بازبینی و QA', async () => {
    const item = await items.create(goli(), {
      title: 'مسیر کامل', workType: 'FEATURE', workStream: 'PRODUCT', priority: 'P1',
      ownerId: P['ترابی'], primaryAssigneeId: P['گلی'], reviewerId: P['ترابی'],
      requiresReview: true, requiresQa: true,
    });
    const torabi = as('ترابی', 'TEAM_LEAD'); // مالک و تأییدکننده‌ی این کار
    await items.changeState(goli(), item.id, 'IN_PROGRESS');
    await expect(items.changeState(goli(), item.id, 'DONE')).rejects.toThrow(/بازبینی/);
    await items.changeState(goli(), item.id, 'IN_REVIEW');
    // فقط تأییدکننده تأیید می‌کند؛ و چون QA لازم است، مستقیم به DONE هم نمی‌رود. (BE-1)
    await expect(items.changeState(torabi, item.id, 'DONE')).rejects.toThrow(/QA/);
    await items.changeState(torabi, item.id, 'IN_QA');
    const done = await items.changeState(goli(), item.id, 'DONE');
    expect(done.workflowState).toBe('DONE');
  });

  it('بازگشت از بازبینی به در حال انجام (رد شدن در Review)', async () => {
    const item = await items.create(goli(), {
      title: 'رد شده در بازبینی', workType: 'TASK', workStream: 'PRODUCT', priority: 'P2',
      ownerId: P['ترابی'], primaryAssigneeId: P['گلی'], reviewerId: P['ترابی'], requiresReview: true,
    });
    await items.changeState(goli(), item.id, 'IN_PROGRESS');
    await items.changeState(goli(), item.id, 'IN_REVIEW');
    const back = await items.changeState(goli(), item.id, 'IN_PROGRESS');
    expect(back.workflowState).toBe('IN_PROGRESS');
  });

  it('بازگشایی کار انجام‌شده فقط به «در حال انجام»', async () => {
    const item = await items.create(goli(), {
      title: 'بازگشایی', workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: P['گلی'],
    });
    await items.changeState(goli(), item.id, 'IN_PROGRESS');
    await items.changeState(goli(), item.id, 'DONE');
    await expect(items.changeState(goli(), item.id, 'READY')).rejects.toThrow(/مجاز نیست/);
    const reopened = await items.changeState(goli(), item.id, 'IN_PROGRESS');
    expect(reopened.workflowState).toBe('IN_PROGRESS');
  });

  it('لغو از هر مرحله فعال ممکن است و بازگشتش فقط به بک‌لاگ', async () => {
    const item = await items.create(goli(), {
      title: 'لغو شونده', workType: 'TASK', workStream: 'SUPPORT', priority: 'P3', ownerId: P['گلی'],
    });
    await items.changeState(goli(), item.id, 'IN_PROGRESS');
    await items.changeState(goli(), item.id, 'CANCELLED', { reasonType: 'SCOPE_CHANGE', reasonText: 'دیگر لازم نیست' });
    await expect(items.changeState(goli(), item.id, 'IN_PROGRESS')).rejects.toThrow(/مجاز نیست/);
    const back = await items.changeState(goli(), item.id, 'BACKLOG');
    expect(back.workflowState).toBe('BACKLOG');
  });

  it('گذار به همان وضعیت فعلی بی‌اثر است', async () => {
    const before = await items.detail(goli(), W['minimal']);
    const after = await items.changeState(goli(), W['minimal'], 'BACKLOG');
    expect(after.workflowState).toBe(before.item.workflowState);
  });
});

// ─────────────────────────────────────────────────────────
describe('س۳) هر چهار حالت سلامت تحویل', () => {
  const daliri = () => as('دلیری', 'TEAM_LEAD');

  it('حالت‌های بی‌خطر بدون توضیح ثبت می‌شوند', async () => {
    for (const health of ['ON_TRACK', 'UNKNOWN']) {
      const r = await items.changeHealth(daliri(), W['minimal'], health);
      expect(r.deliveryHealth).toBe(health);
    }
  });

  it('حالت‌های هشدار بدون توضیح رد می‌شوند', async () => {
    for (const health of ['AT_RISK', 'BLOCKED']) {
      await expect(items.changeHealth(daliri(), W['minimal'], health)).rejects.toThrow(/توضیح/);
    }
  });

  it('حالت‌های هشدار با توضیح ثبت و توضیح نگه داشته می‌شود', async () => {
    const r = await items.changeHealth(daliri(), W['minimal'], 'BLOCKED', 'منتظر تأیید مالی');
    expect(r.deliveryHealth).toBe('BLOCKED');
    expect(r.healthNote).toBe('منتظر تأیید مالی');
  });

  it('سلامت و مرحله اجرا کاملاً مستقل‌اند', async () => {
    const item = await items.create(daliri(), {
      title: 'مسدود ولی در جریان', workType: 'TASK', workStream: 'PRODUCT',
      priority: 'P1', ownerId: P['دلیری'], primaryAssigneeId: P['مقدم'], reviewerId: P['دلیری'],
    });
    await items.changeState(daliri(), item.id, 'IN_PROGRESS');
    const blocked = await items.changeHealth(daliri(), item.id, 'BLOCKED', 'منتظر محتوا');
    expect(blocked.workflowState).toBe('IN_PROGRESS');
    expect(blocked.deliveryHealth).toBe('BLOCKED');
    // و برعکس: تغییر مرحله سلامت را دست نمی‌زند
    const moved = await items.changeState(daliri(), item.id, 'IN_REVIEW');
    expect(moved.deliveryHealth).toBe('BLOCKED');
  });
});

// ─────────────────────────────────────────────────────────
describe('س۴) تعهد زمانی — تمام علت‌ها و سطوح اطمینان', () => {
  const goli = () => as('گلی', 'CONTRIBUTOR');

  it('هر سه سطح اطمینان پذیرفته می‌شود', async () => {
    for (const [i, confidence] of ETA_CONFIDENCE.entries()) {
      const item = await items.create(goli(), {
        title: `اطمینان ${confidence}`, workType: 'TASK', workStream: 'PRODUCT',
        priority: 'P2', ownerId: P['گلی'],
      });
      const r = await items.changeCommitment(goli(), item.id, {
        newEta: `2026-10-0${i + 1}T00:00:00Z`,
        confidence,
        reasonType: 'RE_ESTIMATION',
      });
      expect(r.etaConfidence).toBe(confidence);
    }
  });

  it('هر هفت علت تغییر پذیرفته می‌شود', async () => {
    const item = await items.create(goli(), {
      title: 'چرخه علت‌ها', workType: 'TASK', workStream: 'PRODUCT',
      priority: 'P1', ownerId: P['گلی'],
    });
    let day = 1;
    for (const reasonType of COMMITMENT_REASONS) {
      await items.changeCommitment(goli(), item.id, {
        newEta: `2026-11-${String(++day).padStart(2, '0')}T00:00:00Z`,
        confidence: 'MEDIUM',
        reasonType,
      });
    }
    const { commitments } = await items.detail(goli(), item.id);
    expect(commitments).toHaveLength(COMMITMENT_REASONS.length);
    expect(new Set(commitments.map((c: any) => c.reasonType)).size).toBe(COMMITMENT_REASONS.length);
  });

  it('ثبت تخمین بدون تاریخ هم ممکن است', async () => {
    const item = await items.create(goli(), {
      title: 'فقط تخمین', workType: 'TASK', workStream: 'TECH_DEBT',
      priority: 'P2', ownerId: P['گلی'],
    });
    const r = await items.changeCommitment(goli(), item.id, {
      newEstimateHours: 12, confidence: 'LOW', reasonType: 'RE_ESTIMATION',
    });
    expect(r.estimateHours).toBe(12);
    // در هارنس فیلد تنظیم‌نشده undefined است؛ در پریسما null. هر دو یعنی «تاریخی ثبت نشده».
    expect(r.currentEta ?? null).toBeNull();
    const { commitments } = await items.detail(goli(), item.id);
    expect(commitments[0].changeKind).toBe('ESTIMATE');
  });

  it('تغییر همزمان تاریخ و تخمین نوع BOTH می‌گیرد', async () => {
    const r = await items.changeCommitment(goli(), W['full'], {
      newEta: '2026-10-20T00:00:00Z', newEstimateHours: 40,
      confidence: 'HIGH', assumptions: 'با فرض در دسترس بودن محیط تست بانک',
      reasonType: 'SCOPE_CHANGE',
    });
    expect(r.estimateHours).toBe(40);
    expect(r.etaAssumptions).toContain('محیط تست');
    const { commitments } = await items.detail(goli(), W['full']);
    expect(commitments[0].changeKind).toBe('BOTH');
  });

  it('فرض‌ها بعد از تغییر بعدی حفظ می‌شوند مگر صریحاً عوض شوند', async () => {
    await items.changeCommitment(goli(), W['full'], {
      newEta: '2026-10-25T00:00:00Z', reasonType: 'DEPENDENCY',
    });
    const { item } = await items.detail(goli(), W['full']);
    expect(item.etaAssumptions).toContain('محیط تست');
  });

  it('تغییر بدون هیچ فرقی رد می‌شود', async () => {
    await expect(
      items.changeCommitment(goli(), W['full'], { newEta: '2026-10-25T00:00:00Z', reasonType: 'BLOCKER' }),
    ).rejects.toThrow(/تغییری/);
  });

  it('محاسبه روز کاری جمعه را رد می‌کند', async () => {
    const item = await items.create(goli(), {
      title: 'عبور از جمعه', workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: P['گلی'],
    });
    // ۲۰۲۶-۰۹-۰۳ پنجشنبه، ۲۰۲۶-۰۹-۰۵ شنبه → ۲ روز تقویمی ولی ۱ روز کاری
    await items.changeCommitment(goli(), item.id, {
      newEta: '2026-09-03T00:00:00Z', confidence: 'HIGH', reasonType: 'RE_ESTIMATION',
    });
    await items.changeCommitment(goli(), item.id, {
      newEta: '2026-09-05T00:00:00Z', reasonType: 'BLOCKER',
    });
    const { commitments } = await items.detail(goli(), item.id);
    expect(commitments[0].deltaWorkingDays).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────
describe('س۵) نقش‌ها و مرزهای دسترسی', () => {
  it('هر هفت نقش تعریف شده و ماتریسشان کامل است', async () => {
    const { ROLE_PERMISSIONS } = await import('../src/authorization/permissions');
    for (const role of ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });

  it('مشاهده‌گر هیچ چیزی نمی‌سازد و تغییر نمی‌دهد', async () => {
    const { can } = await import('../src/authorization/permissions');
    for (const p of ['workitem.create', 'workitem.update', 'project.create', 'user.manage'] as const) {
      expect(can('VIEWER', p)).toBe(false);
    }
    expect(can('VIEWER', 'workitem.read')).toBe(true);
  });

  it('درخواست‌دهنده می‌سازد ولی به‌روزرسانی نمی‌کند', async () => {
    const { can } = await import('../src/authorization/permissions');
    expect(can('REQUESTER', 'workitem.create')).toBe(true);
    expect(can('REQUESTER', 'workitem.update')).toBe(false);
  });

  it('سرپرست تیم اولویت را عوض می‌کند ولی Baseline را نه', async () => {
    const torabi = as('ترابی', 'TEAM_LEAD');
    await items.update(torabi, W['minimal'], { priority: 'P0', reasonType: 'PRIORITY_CHANGE', reasonText: 'خواسته مدیریت' });
    await expect(
      items.reBaseline(torabi, W['full'], '2026-12-01T00:00:00Z', 'دلیل'),
    ).rejects.toThrow(/مدیر پروژه/);
  });

  it('مدیر پروژه Baseline را بازتعریف می‌کند و بیس‌لاین اول حفظ می‌شود', async () => {
    const { item: before } = await items.detail(admin, W['full']);
    await items.reBaseline(admin, W['full'], '2026-12-01T00:00:00Z', 'دامنه رسماً افزایش یافت');
    const { item: after } = await items.detail(admin, W['full']);
    expect(after.firstCommittedEta?.toISOString()).toBe(before.firstCommittedEta?.toISOString());
    expect(after.activeBaselineEta?.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('عضو یک تیم به پروژه‌ای که عضوش نیست دسترسی ندارد', async () => {
    const secret = await projects.create(admin, { key: 'SEC', name: 'پروژه محرمانه' });
    const goli = as('گلی', 'CONTRIBUTOR');
    await expect(projects.assertAccess(goli, secret.id)).rejects.toThrow(/دسترسی ندارید/);
  });

  it('کار سازمان دیگر اصلاً دیده نمی‌شود (جداسازی مستأجر)', async () => {
    await prisma.organization.create({ data: { id: 'org-other', name: 'شرکت دیگر' } });
    await prisma.workItem.create({
      data: {
        id: 'foreign-1', organizationId: 'org-other', key: 'OTH-1', title: 'کار بیگانه',
        titleNormalized: 'کار بیگانه', workStream: 'PRODUCT', workflowState: 'BACKLOG',
        deliveryHealth: 'ON_TRACK', priority: 'P2', workType: 'TASK',
        createdAt: new Date(), updatedAt: new Date(), lastActivityAt: new Date(),
      },
    });
    const all = await items.list(admin, {});
    expect(all.find((i: any) => i.id === 'foreign-1')).toBeUndefined();
    await expect(items.detail(admin, 'foreign-1')).rejects.toThrow(/پیدا نشد/);
  });
});

// ─────────────────────────────────────────────────────────
describe('س۶) فیلترها، جست‌وجو و نماها', () => {
  it('فیلتر بر اساس جریان کاری', async () => {
    const support = await items.list(admin, { workStream: 'SUPPORT' });
    expect(support.every((i: any) => i.workStream === 'SUPPORT')).toBe(true);
    expect(support.length).toBeGreaterThan(0);
  });

  it('فیلتر بر اساس اولویت', async () => {
    const p0 = await items.list(admin, { priority: 'P0' });
    expect(p0.every((i: any) => i.priority === 'P0')).toBe(true);
  });

  it('فیلتر بر اساس مجری', async () => {
    const mine = await items.list(admin, { assigneeId: P['گلی'] });
    expect(mine.every((i: any) => i.primaryAssigneeId === P['گلی'])).toBe(true);
  });

  it('فیلتر کارهای بدون پروژه', async () => {
    const orphans = await items.list(admin, { projectId: 'none' });
    expect(orphans.every((i: any) => i.projectId === null)).toBe(true);
    expect(orphans.length).toBeGreaterThan(0);
  });

  it('فیلتر بر اساس سلامت', async () => {
    const blocked = await items.list(admin, { deliveryHealth: 'BLOCKED' });
    expect(blocked.every((i: any) => i.deliveryHealth === 'BLOCKED')).toBe(true);
  });

  it('کارهای لغوشده به‌صورت پیش‌فرض پنهان‌اند', async () => {
    const normal = await items.list(admin, {});
    expect(normal.find((i: any) => i.workflowState === 'CANCELLED')).toBeUndefined();
    const withClosed = await items.list(admin, { includeClosed: true });
    expect(withClosed.length).toBeGreaterThanOrEqual(normal.length);
  });

  it('جست‌وجو با کاف و یای عربی نتیجه فارسی می‌دهد', async () => {
    await items.create(admin, {
      title: 'بهبود تجربه کاربری موبایل', workType: 'TASK', workStream: 'PRODUCT',
      priority: 'P2', ownerId: P['مقدم'],
    });
    const arabic = await items.search(admin, 'كاربري');
    expect(arabic.length).toBeGreaterThan(0);
  });

  it('جست‌وجو با اعداد فارسی', async () => {
    await items.create(admin, {
      title: 'مرحله ۲ مهاجرت', workType: 'TASK', workStream: 'TECH_DEBT',
      priority: 'P2', ownerId: P['ترابی'],
    });
    const found = await items.search(admin, 'مرحله 2');
    expect(found.length).toBeGreaterThan(0);
  });

  it('جست‌وجو با کلید کار', async () => {
    const found = await items.search(admin, 'IPX-1');
    expect(found.some((i: any) => i.key === 'IPX-1')).toBe(true);
  });

  it('کارهای من برای هر پنج نفر بدون خطا برمی‌گردد', async () => {
    for (const name of ['ترابی', 'گلی', 'دلیری', 'نیکروان', 'مقدم']) {
      const r = await items.myWork(as(name, 'CONTRIBUTOR'));
      expect(r).toHaveProperty('inProgress');
      expect(r).toHaveProperty('awaitingMyReview');
      expect(r).toHaveProperty('overdue');
    }
  });

  it('صف بازبینی هر بازبین درست پر می‌شود', async () => {
    const item = await items.create(admin, {
      title: 'منتظر بازبینی ترابی', workType: 'TASK', workStream: 'PRODUCT', priority: 'P1',
      ownerId: P['ترابی'], primaryAssigneeId: P['گلی'], reviewerId: P['ترابی'], requiresReview: true,
    });
    await items.changeState(as('گلی', 'CONTRIBUTOR'), item.id, 'IN_PROGRESS');
    await items.changeState(as('گلی', 'CONTRIBUTOR'), item.id, 'IN_REVIEW');
    const queue = await items.myWork(as('ترابی', 'TEAM_LEAD'));
    expect(queue.awaitingMyReview.some((i: any) => i.id === item.id)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
describe('س۷) سناریوهای واقعی تیم', () => {
  it('سناریو: وقفه پشتیبانی، کار محصولی را عقب می‌اندازد', async () => {
    const feature = await items.create(as('ترابی', 'TEAM_LEAD'), {
      title: 'گزارش فروش ماهانه', workType: 'FEATURE', workStream: 'PRODUCT',
      priority: 'P1', ownerId: P['ترابی'], primaryAssigneeId: P['گلی'],
    });
    await items.changeCommitment(as('گلی', 'CONTRIBUTOR'), feature.id, {
      newEta: '2026-09-10T00:00:00Z', newEstimateHours: 16, confidence: 'HIGH', reasonType: 'RE_ESTIMATION',
    });
    await items.changeState(as('گلی', 'CONTRIBUTOR'), feature.id, 'IN_PROGRESS');

    // باگ فوری پشتیبانی وارد می‌شود
    const urgent = await items.create(as('ترابی', 'TEAM_LEAD'), {
      title: 'قطعی سرویس پرداخت', workType: 'BUG', workStream: 'SUPPORT',
      priority: 'P0', ownerId: P['ترابی'], primaryAssigneeId: P['گلی'],
    });
    await items.changeState(as('گلی', 'CONTRIBUTOR'), urgent.id, 'IN_PROGRESS');

    // تاریخ کار محصولی با علت وقفه پشتیبانی عقب می‌رود
    await items.changeCommitment(as('گلی', 'CONTRIBUTOR'), feature.id, {
      newEta: '2026-09-16T00:00:00Z',
      reasonType: 'SUPPORT_INTERRUPT',
      reasonText: 'دو روز صرف رفع قطعی پرداخت شد',
    });
    const { commitments, metrics } = await items.detail(admin, feature.id);
    expect(commitments[0].reasonType).toBe('SUPPORT_INTERRUPT');
    expect(metrics.driftFromFirstBaseline).toBeGreaterThan(0);
  });

  it('سناریو: تحویل بین تیمی، دیزاین به فرانت', async () => {
    const design = await items.create(as('دلیری', 'TEAM_LEAD'), {
      title: 'طراحی صفحه محصول', workType: 'TASK', workStream: 'PRODUCT', priority: 'P1',
      ownerId: P['دلیری'], primaryAssigneeId: P['مقدم'], teamId: T['Design & Content'],
    });
    await items.changeState(as('مقدم', 'CONTRIBUTOR'), design.id, 'IN_PROGRESS');
    await items.changeState(as('مقدم', 'CONTRIBUTOR'), design.id, 'DONE');
    // کار فرانت به‌عنوان ادامه ساخته می‌شود
    const build = await items.create(as('دلیری', 'TEAM_LEAD'), {
      title: 'پیاده‌سازی صفحه محصول', workType: 'TASK', workStream: 'PRODUCT', priority: 'P1',
      ownerId: P['دلیری'], primaryAssigneeId: P['دلیری'], teamId: T['Frontend'],
    });
    await items.addComment(as('دلیری', 'TEAM_LEAD'), build.id, 'طراحی از خانم مقدم تحویل گرفته شد.');
    const { comments } = await items.detail(admin, build.id);
    expect(comments).toHaveLength(1);
  });

  it('سناریو: کار بازاریابی بدون پروژه با مهلت', async () => {
    const campaign = await items.create(as('نیکروان', 'CONTRIBUTOR'), {
      title: 'کمپین نمایشگاه پاییز', workType: 'TASK', workStream: 'PRODUCT', priority: 'P1',
      ownerId: P['نیکروان'], primaryAssigneeId: P['نیکروان'],
      dueDate: '2026-11-01T00:00:00Z',
    });
    expect(campaign.projectId).toBeNull();
    expect(campaign.key).toMatch(/^TASK-/);
    expect(campaign.dueDate).toBeTruthy();
  });

  it('سناریو: بدهی فنی با اولویت پایین که راکد می‌ماند', async () => {
    const debt = await items.create(as('ترابی', 'TEAM_LEAD'), {
      title: 'حذف کد مرده ماژول قدیمی', workType: 'TECH_DEBT', workStream: 'TECH_DEBT',
      priority: 'P3', ownerId: P['ترابی'], primaryAssigneeId: P['گلی'],
    });
    await items.changeState(as('گلی', 'CONTRIBUTOR'), debt.id, 'IN_PROGRESS');
    // شبیه‌سازی بی‌حرکتی طولانی
    await prisma.workItem.update({
      where: { id: debt.id },
      data: { lastActivityAt: new Date(Date.now() - 30 * 86400_000) },
    });
    const flagged = await items.flagStaleItems(ORG);
    expect(flagged).toBeGreaterThan(0);
    const { item } = await items.detail(admin, debt.id);
    expect(item.deliveryHealth).toBe('UNKNOWN');
  });

  it('سناریو: زیرکارهای یک قابلیت بزرگ', async () => {
    const parent = await items.create(as('ترابی', 'TEAM_LEAD'), {
      title: 'سامانه اعلان‌ها', workType: 'FEATURE', workStream: 'PRODUCT',
      priority: 'P1', ownerId: P['ترابی'],
    });
    for (const sub of ['طراحی مدل داده', 'پیاده‌سازی سرویس', 'رابط کاربری']) {
      await items.create(as('ترابی', 'TEAM_LEAD'), {
        title: sub, parentId: parent.id, workType: 'TASK', workStream: 'PRODUCT',
        priority: 'P2', ownerId: P['ترابی'],
      });
    }
    const { children } = await items.detail(admin, parent.id);
    expect(children).toHaveLength(3);
  });

  it('سناریو: مرخصی و واگذاری کارها', async () => {
    const before = await users.offboardingImpact(admin, P['گلی']);
    expect(before.openAssigned).toBeGreaterThan(0);
    await users.reassignAll(admin, P['گلی'], P['ترابی']);
    const after = await users.offboardingImpact(admin, P['گلی']);
    expect(after.openAssigned).toBe(0);
    expect(after.openOwned).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
describe('س۸) پایداری و موارد مرزی', () => {
  it('عنوان خیلی بلند پذیرفته می‌شود', async () => {
    const long = 'الف'.repeat(500);
    const item = await items.create(admin, {
      title: long, workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: P['ترابی'],
    });
    expect(item.title).toHaveLength(1500);
  });

  it('کاراکترهای خاص و ایموجی در عنوان مشکلی ایجاد نمی‌کنند', async () => {
    const item = await items.create(admin, {
      title: "کار با ' و \" و <script> و ✅ و \\", workType: 'TASK',
      workStream: 'PRODUCT', priority: 'P2', ownerId: P['ترابی'],
    });
    const { item: fetched } = await items.detail(admin, item.id);
    expect(fetched.title).toContain('<script>');
  });

  it('پروژه ناموجود هنگام ساخت کار رد می‌شود', async () => {
    await expect(
      items.create(admin, {
        title: 'x', projectId: 'ghost', workType: 'TASK',
        workStream: 'PRODUCT', priority: 'P2', ownerId: P['ترابی'],
      }),
    ).rejects.toThrow(/پروژه پیدا نشد/);
  });

  it('کار ناموجود در همه مسیرها خطای یکسان می‌دهد', async () => {
    for (const fn of [
      () => items.detail(admin, 'ghost'),
      () => items.changeState(admin, 'ghost', 'DONE'),
      () => items.changeHealth(admin, 'ghost', 'ON_TRACK'),
      () => items.update(admin, 'ghost', { title: 'x' }),
    ]) {
      await expect(fn()).rejects.toThrow(/پیدا نشد/);
    }
  });

  it('کلیدها زیر فشار ساخت پیاپی تکراری نمی‌شوند', async () => {
    const keys = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const item = await items.create(admin, {
        title: `فشار ${i}`, projectId: PR['WEB'], workType: 'TASK',
        workStream: 'PRODUCT', priority: 'P2', ownerId: P['ترابی'],
      });
      keys.add(item.key);
    }
    expect(keys.size).toBe(30);
  });

  it('حجم داده: فهرست با بیش از ۵۰ کار سریع برمی‌گردد', async () => {
    const start = Date.now();
    const all = await items.list(admin, {});
    expect(all.length).toBeGreaterThan(50);
    expect(Date.now() - start).toBeLessThan(500);
  });
});

// ─────────────────────────────────────────────────────────
describe('س۹) پاک‌سازی کامل داده‌های تست', () => {
  it('همه کارها، تاریخچه‌ها، دیدگاه‌ها و فعالیت‌ها حذف می‌شوند', async () => {
    const all = await items.list(admin, { includeClosed: true });
    expect(all.length).toBeGreaterThan(0);

    for (const item of all) {
      await prisma.commitmentHistory.deleteMany({ where: { workItemId: item.id } });
      await prisma.comment.deleteMany({ where: { workItemId: item.id } });
      await prisma.activity.deleteMany({ where: { workItemId: item.id } });
    }
    await prisma.workItem.deleteMany({ where: { organizationId: ORG } });
    await prisma.workItem.deleteMany({ where: { organizationId: 'org-other' } });

    const remaining = await items.list(admin, { includeClosed: true });
    expect(remaining).toHaveLength(0);
    expect(await prisma.commitmentHistory.count({})).toBe(0);
    expect(await prisma.comment.count({})).toBe(0);
    expect(await prisma.activity.count({})).toBe(0);
  });

  it('پروژه‌ها و عضویت‌هایشان حذف می‌شوند', async () => {
    for (const id of [...Object.values(PR)]) {
      await prisma.projectMember.deleteMany({ where: { projectId: id } });
    }
    await prisma.projectMember.deleteMany({});
    await prisma.project.deleteMany({ where: { organizationId: ORG } });
    expect(await projects.list(admin)).toHaveLength(0);
  });

  it('کاربران آزمایشی و تیم‌ها حذف می‌شوند', async () => {
    await prisma.teamMember.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({ where: { id: { in: Object.values(P) } } });
    await prisma.team.deleteMany({ where: { organizationId: ORG } });

    const left = await users.list(admin);
    expect(left).toHaveLength(1); // فقط ادمین
    expect(left[0].fullName).toBe('مدیر سیستم');
    expect(await teams.list(admin)).toHaveLength(0);
  });

  it('شمارنده کلید و رویدادهای Audit پاک می‌شوند', async () => {
    await prisma.keySequence.deleteMany({});
    await prisma.auditEvent.deleteMany({});
    expect(await prisma.keySequence.count({})).toBe(0);
    expect(await prisma.auditEvent.count({})).toBe(0);
  });

  it('محیط کاملاً تمیز است و فقط ادمین و سازمان باقی مانده‌اند', async () => {
    const counts = {
      workItems: await prisma.workItem.count({}),
      commitments: await prisma.commitmentHistory.count({}),
      comments: await prisma.comment.count({}),
      activities: await prisma.activity.count({}),
      projects: await prisma.project.count({}),
      teams: await prisma.team.count({}),
      users: await prisma.user.count({}),
      audits: await prisma.auditEvent.count({}),
      keys: await prisma.keySequence.count({}),
    };
    expect(counts).toEqual({
      workItems: 0, commitments: 0, comments: 0, activities: 0,
      projects: 0, teams: 0, users: 1, audits: 0, keys: 0,
    });
  });

  it('فایل دیتابیس بعد از پاک‌سازی هنوز سالم و قابل استفاده است', async () => {
    expect(existsSync(join(dir, 'app.db'))).toBe(true);
    const fresh = await items.create(admin, {
      title: 'کار بعد از پاک‌سازی', workType: 'TASK', workStream: 'PRODUCT',
      priority: 'P2', ownerId: admin.id,
    });
    // شمارنده صفر شده، پس دوباره از یک شروع می‌کند
    expect(fresh.key).toBe('TASK-1');
    await prisma.workItem.deleteMany({});
    await prisma.keySequence.deleteMany({});
  });
});
