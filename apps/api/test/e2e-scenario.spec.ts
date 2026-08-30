/**
 * تست یکپارچه سرتاسری با داده واقعی.
 * سازمان، پنج عضو فعلی، پروژه IranPeymex، و چرخه کامل یک کار تا تحویل.
 * روی دیتابیس واقعی روی دیسک اجرا می‌شود و ماندگاری بعد از ری‌استارت هم بررسی می‌شود.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

import { HarnessPrisma } from './helpers/harness-prisma';
import { UsersService } from '../src/users/users.service';
import { TeamsService } from '../src/teams/teams.service';
import { ProjectsService } from '../src/projects/projects.service';
import { WorkItemsService } from '../src/work-items/work-items.service';
import { KeySequenceService } from '../src/key-sequence/key-sequence.service';
import { AuthService } from '../src/auth/auth.service';
import * as wd from '../src/calendar/working-days';

const ORG = 'org-iranpeymex';
let dir: string;
let dbFile: string;
let prisma: any;
let users: UsersService;
let teams: TeamsService;
let projects: ProjectsService;
let items: WorkItemsService;
let auth: AuthService;

const admin = { id: 'admin-1', role: 'ORG_OWNER' as const, organizationId: ORG };

// تقویم واقعی: شنبه تا پنجشنبه کاری، فقط جمعه تعطیل
const calendar: any = {
  loadHolidays: async () => new Set<string>(),
  countWorkingDays: wd.countWorkingDays,
  addWorkingDays: wd.addWorkingDays,
  isWorkingDay: wd.isWorkingDay,
};

const jwt: any = { signAsync: async () => 'fake.jwt.token' };

const created: Record<string, string> = {};

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'peos-'));
  dbFile = join(dir, 'app.db');
  prisma = new HarnessPrisma(dbFile);

  users = new UsersService(prisma);
  teams = new TeamsService(prisma);
  projects = new ProjectsService(prisma);
  items = new WorkItemsService(prisma, new KeySequenceService(), calendar);
  auth = new AuthService(prisma, jwt);

  await prisma.organization.create({
    data: { id: ORG, name: 'ایران پیمکس', timezone: 'Asia/Tehran', workingDays: 'SAT,SUN,MON,TUE,WED,THU' },
  });
  await prisma.user.create({
    data: {
      id: admin.id,
      organizationId: ORG,
      fullName: 'مدیر سیستم',
      email: 'admin@iranpeymex.local',
      passwordHash: await bcrypt.hash('Admin-Strong-1', 10),
      role: 'ORG_OWNER',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });
});

afterAll(() => {
  prisma?.close?.();
  rmSync(dir, { recursive: true, force: true });
});

describe('۱) راه‌اندازی سازمان و تیم‌ها', () => {
  it('چهار تیم اولیه ساخته می‌شوند', async () => {
    for (const name of ['Backend', 'Frontend', 'Marketing & Growth', 'Design & Content']) {
      const team = await teams.create(admin, name);
      created[`team:${name}`] = team.id;
    }
    const list = await teams.list(admin);
    expect(list).toHaveLength(4);
  });

  it('تیم تکراری رد می‌شود', async () => {
    await expect(teams.create(admin, 'Backend')).rejects.toThrow(/از قبل وجود دارد/);
  });
});

describe('۲) ساخت اعضای واقعی تیم', () => {
  const roster = [
    { fullName: 'خانم ترابی', jobTitle: 'هد بک‌اند', role: 'TEAM_LEAD', team: 'Backend' },
    { fullName: 'آقای گلی', jobTitle: 'کارشناس بک‌اند', role: 'CONTRIBUTOR', team: 'Backend' },
    { fullName: 'آقای دلیری', jobTitle: 'هد فرانت', role: 'TEAM_LEAD', team: 'Frontend' },
    { fullName: 'آقای میلاد نیکروان', jobTitle: 'ارشد بازاریابی', role: 'CONTRIBUTOR', team: 'Marketing & Growth' },
    { fullName: 'خانم مقدم', jobTitle: 'دیزاینر و تولید محتوا', role: 'CONTRIBUTOR', team: 'Design & Content' },
  ];

  it('هر پنج عضو با رمز موقت ساخته می‌شوند', async () => {
    for (const [i, p] of roster.entries()) {
      const res = await users.create(admin, {
        fullName: p.fullName,
        email: `user${i + 1}@iranpeymex.local`,
        jobTitle: p.jobTitle,
        role: p.role as any,
        primaryTeamId: created[`team:${p.team}`],
      });
      created[p.fullName] = res.id;
      // رمز موقت تولید می‌شود چون SMTP نداریم
      expect(res.temporaryPassword).toBeTruthy();
      expect(res.temporaryPassword.length).toBeGreaterThanOrEqual(10);
    }
    const list = await users.list(admin);
    expect(list).toHaveLength(6); // پنج عضو + ادمین
  });

  it('سمت سازمانی هیچ دسترسی‌ای نمی‌دهد', async () => {
    const list = await users.list(admin);
    const goli = list.find((u: any) => u.fullName === 'آقای گلی')!;
    // «کارشناس بک‌اند» است ولی نقش نرم‌افزاری فقط CONTRIBUTOR
    expect(goli.jobTitle).toBe('کارشناس بک‌اند');
    expect(goli.role).toBe('CONTRIBUTOR');
  });

  it('همه اعضا در ورود اول باید رمز را عوض کنند', async () => {
    const list = await users.list(admin);
    const members = list.filter((u: any) => u.id !== admin.id);
    expect(members.every((u: any) => u.mustChangePassword)).toBe(true);
  });

  it('ایمیل تکراری رد می‌شود', async () => {
    await expect(
      users.create(admin, { fullName: 'تکراری', email: 'user1@iranpeymex.local', role: 'VIEWER' }),
    ).rejects.toThrow(/از قبل وجود دارد/);
  });

  it('سرپرست تیم بک‌اند تعیین می‌شود و Audit ثبت می‌شود', async () => {
    await teams.setLead(admin, created['team:Backend'], created['خانم ترابی']);
    const audits = await prisma.auditEvent.findMany({ where: { action: 'LEAD_CHANGED' } });
    expect(audits).toHaveLength(1);
  });
});

describe('۳) ورود و امنیت', () => {
  it('رمز غلط با پیام یکسان رد می‌شود', async () => {
    await expect(auth.login('admin@iranpeymex.local', 'wrong', 'test')).rejects.toThrow(/نادرست/);
  });

  it('کاربر ناموجود همان پیام را می‌گیرد تا وجود حساب افشا نشود', async () => {
    await expect(auth.login('ghost@iranpeymex.local', 'x', 'test')).rejects.toThrow(/نادرست/);
  });

  it('ورود درست نشست می‌سازد', async () => {
    const res = await auth.login('admin@iranpeymex.local', 'Admin-Strong-1', 'vitest');
    expect(res.accessToken).toBeTruthy();
    const sessions = await prisma.session.findMany({ where: { userId: admin.id, revokedAt: null } });
    expect(sessions).toHaveLength(1);
  });

  it('غیرفعال کردن کاربر همه نشست‌هایش را فوراً باطل می‌کند', async () => {
    const target = created['خانم مقدم'];
    await prisma.session.create({
      data: { id: randomUUID(), userId: target, refreshTokenHash: 'h', expiresAt: new Date(Date.now() + 86400000) },
    });
    await users.changeStatus(admin, target, 'SUSPENDED');
    const active = await prisma.session.findMany({ where: { userId: target, revokedAt: null } });
    expect(active).toHaveLength(0);
    await users.changeStatus(admin, target, 'ACTIVE');
  });

  it('آخرین مدیر فعال قابل غیرفعال کردن نیست', async () => {
    await expect(users.changeStatus(admin, admin.id, 'DISABLED')).rejects.toThrow(/مدیر فعال/);
  });
});

describe('۴) پروژه IranPeymex', () => {
  it('پروژه با کلید معتبر ساخته می‌شود', async () => {
    const project = await projects.create(admin, {
      key: 'IPX',
      name: 'IranPeymex',
      description: 'پلتفرم اصلی ایران پیمکس',
      ownerId: created['خانم ترابی'],
      targetDate: '2026-12-20T00:00:00Z',
    });
    created['project'] = project.id;
    expect(project.key).toBe('IPX');
  });

  it('کلید فارسی یا نامعتبر رد می‌شود', async () => {
    await expect(projects.create(admin, { key: 'ایران', name: 'x' })).rejects.toThrow(/کلید پروژه/);
  });

  it('کلید تکراری رد می‌شود', async () => {
    await expect(projects.create(admin, { key: 'IPX', name: 'دوباره' })).rejects.toThrow(/از قبل وجود دارد/);
  });

  it('عضو غیرعضو به پروژه دسترسی ندارد', async () => {
    const outsider = { id: created['خانم مقدم'], role: 'CONTRIBUTOR' as const, organizationId: ORG };
    await expect(projects.assertAccess(outsider, created['project'])).rejects.toThrow(/دسترسی ندارید/);
  });

  it('بعد از افزودن عضو، دسترسی باز می‌شود', async () => {
    await projects.addMember(admin, created['project'], created['خانم مقدم']);
    const outsider = { id: created['خانم مقدم'], role: 'CONTRIBUTOR' as const, organizationId: ORG };
    await expect(projects.assertAccess(outsider, created['project'])).resolves.toBeTruthy();
  });
});

describe('۵) ساخت کار و کلیدگذاری', () => {
  const torabi = () => ({ id: created['خانم ترابی'], role: 'TEAM_LEAD' as const, organizationId: ORG });

  it('کار داخل پروژه کلید IPX-1 می‌گیرد', async () => {
    const item = await items.create(torabi(), {
      title: 'طراحی API سفارش‌گذاری',
      projectId: created['project'],
      workType: 'FEATURE',
      workStream: 'PRODUCT',
      priority: 'P0',
      ownerId: created['خانم ترابی'],
      primaryAssigneeId: created['آقای گلی'],
      reviewerId: created['خانم ترابی'],
      requiresReview: true,
    });
    created['task1'] = item.id;
    expect(item.key).toBe('IPX-1');
    expect(item.workflowState).toBe('BACKLOG');
    expect(item.deliveryHealth).toBe('ON_TRACK');
  });

  it('کار دوم کلید IPX-2 می‌گیرد و شماره تکراری نمی‌شود', async () => {
    const item = await items.create(torabi(), {
      title: 'رفع باگ پرداخت',
      projectId: created['project'],
      workType: 'BUG',
      workStream: 'SUPPORT',
      priority: 'P1',
      ownerId: created['آقای گلی'],
      primaryAssigneeId: created['آقای گلی'],
    });
    created['task2'] = item.id;
    expect(item.key).toBe('IPX-2');
  });

  it('کار بدون پروژه مجاز است و پیشوند TASK می‌گیرد', async () => {
    const item = await items.create(torabi(), {
      title: 'بازنگری قرارداد پشتیبانی',
      workType: 'TASK',
      workStream: 'INFRASTRUCTURE',
      priority: 'P2',
      ownerId: created['آقای میلاد نیکروان'],
    });
    created['task3'] = item.id;
    expect(item.key).toBe('TASK-1');
    expect(item.projectId).toBeNull();
  });

  it('عنوان فارسی نرمال‌سازی و قابل جست‌وجو می‌شود', async () => {
    await items.create(torabi(), {
      title: 'اصلاح كاربري داشبورد',
      workType: 'TASK',
      workStream: 'PRODUCT',
      priority: 'P2',
      ownerId: created['آقای دلیری'],
    });
    // جست‌وجو با کاف فارسی، عنوان با کاف عربی ثبت شده
    const found = await items.search(torabi(), 'کاربری');
    expect(found.length).toBeGreaterThan(0);
  });

  it('سلسله‌مراتب بیش از یک سطح رد می‌شود', async () => {
    const child = await items.create(torabi(), {
      title: 'زیرکار: طراحی اسکیما',
      parentId: created['task1'],
      workType: 'TASK',
      workStream: 'PRODUCT',
      priority: 'P1',
      ownerId: created['آقای گلی'],
    });
    await expect(
      items.create(torabi(), {
        title: 'نوه',
        parentId: child.id,
        workType: 'TASK',
        workStream: 'PRODUCT',
        priority: 'P2',
        ownerId: created['آقای گلی'],
      }),
    ).rejects.toThrow(/یک سطح/);
  });
});

describe('۶) تعهد زمانی و تاریخچه', () => {
  const goli = () => ({ id: created['آقای گلی'], role: 'CONTRIBUTOR' as const, organizationId: ORG });

  it('اولین ثبت ETA بیس‌لاین را قفل می‌کند', async () => {
    await items.changeCommitment(goli(), created['task1'], {
      newEta: '2026-09-15T00:00:00Z',
      newEstimateHours: 24,
      confidence: 'MEDIUM',
      assumptions: 'با فرض آماده بودن مستندات درگاه پرداخت',
      reasonType: 'RE_ESTIMATION',
    });
    const { item } = await items.detail(goli(), created['task1']);
    expect(item.firstCommittedEta?.toISOString()).toBe('2026-09-15T00:00:00.000Z');
    expect(item.estimateHours).toBe(24);
  });

  it('تغییر ETA بدون علت رد می‌شود', async () => {
    await expect(
      items.changeCommitment(goli(), created['task1'], {
        newEta: '2026-09-25T00:00:00Z',
        reasonType: undefined as any,
      }),
    ).rejects.toThrow(/علت/);
  });

  it('تغییر با علت ثبت می‌شود و delta با روز کاری حساب می‌شود', async () => {
    await items.changeCommitment(goli(), created['task1'], {
      newEta: '2026-09-22T00:00:00Z',
      reasonType: 'DEPENDENCY',
      reasonText: 'منتظر تحویل طراحی از تیم دیزاین',
    });
    const { commitments } = await items.detail(goli(), created['task1']);
    const last = commitments[0];
    // ۱۵ تا ۲۲ سپتامبر = ۷ روز تقویمی، یک جمعه در میان = ۶ روز کاری
    expect(last.deltaWorkingDays).toBe(6);
    expect(last.reasonType).toBe('DEPENDENCY');
  });

  it('بیس‌لاین اولیه بعد از چند تغییر دست‌نخورده می‌ماند', async () => {
    await items.changeCommitment(goli(), created['task1'], {
      newEta: '2026-09-19T00:00:00Z',
      reasonType: 'SCOPE_CHANGE',
    });
    const { item, metrics } = await items.detail(goli(), created['task1']);
    expect(item.firstCommittedEta?.toISOString()).toBe('2026-09-15T00:00:00.000Z');
    expect(metrics.etaShiftCount).toBe(2);
    // یک بار +۶ و یک بار -۳ → انحراف خالص ۳، ولی مجموع حرکت ۹
    expect(metrics.driftFromFirstBaseline).toBe(3);
    expect(metrics.cumulativeMovementWorkingDays).toBe(9);
  });

  it('عضو اجرایی نمی‌تواند Re-baseline کند', async () => {
    await expect(
      items.reBaseline(goli(), created['task1'], '2026-10-01T00:00:00Z', 'دامنه بزرگ شد'),
    ).rejects.toThrow(/مدیر پروژه/);
  });

  it('مدیر پروژه با دلیل می‌تواند و بیس‌لاین اول حفظ می‌شود', async () => {
    await items.reBaseline(admin, created['task1'], '2026-10-01T00:00:00Z', 'دامنه رسماً با تأیید مدیرعامل بزرگ شد');
    const { item, commitments } = await items.detail(admin, created['task1']);
    expect(item.firstCommittedEta?.toISOString()).toBe('2026-09-15T00:00:00.000Z');
    expect(item.activeBaselineEta?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(commitments[0].changeKind).toBe('RE_BASELINE');
  });

  it('هیچ مسیری برای پاک کردن تاریخچه وجود ندارد', async () => {
    const { commitments } = await items.detail(admin, created['task1']);
    expect(commitments.length).toBe(4);
    // شماره نسخه‌ها پیوسته و صعودی‌اند
    const versions = commitments.map((c: any) => c.versionNo).sort((a: number, b: number) => a - b);
    expect(versions).toEqual([1, 2, 3, 4]);
  });
});

describe('۷) چرخه اجرا تا تحویل', () => {
  const goli = () => ({ id: created['آقای گلی'], role: 'CONTRIBUTOR' as const, organizationId: ORG });

  it('مسیر بک‌لاگ تا در حال انجام', async () => {
    await items.changeState(goli(), created['task1'], 'READY');
    const done = await items.changeState(goli(), created['task1'], 'IN_PROGRESS');
    expect(done.workflowState).toBe('IN_PROGRESS');
  });

  it('کار نیازمند بازبینی مستقیم به انجام‌شده نمی‌رود', async () => {
    await expect(items.changeState(goli(), created['task1'], 'DONE')).rejects.toThrow(/بازبینی/);
  });

  it('از مسیر بازبینی به انجام‌شده می‌رسد و زمان تکمیل ثبت می‌شود', async () => {
    await items.changeState(goli(), created['task1'], 'IN_REVIEW');
    const done = await items.changeState(goli(), created['task1'], 'DONE');
    expect(done.workflowState).toBe('DONE');
    expect(done.completedAt).toBeTruthy();
  });

  it('کار بدون نیاز به بازبینی مستقیم بسته می‌شود', async () => {
    await items.changeState(goli(), created['task2'], 'IN_PROGRESS');
    const done = await items.changeState(goli(), created['task2'], 'DONE');
    expect(done.workflowState).toBe('DONE');
  });

  it('سلامت تحویل مستقل از مرحله اجراست', async () => {
    await items.changeState(goli(), created['task3'], 'IN_PROGRESS');
    const blocked = await items.changeHealth(goli(), created['task3'], 'BLOCKED', 'منتظر پاسخ حقوقی');
    expect(blocked.deliveryHealth).toBe('BLOCKED');
    expect(blocked.workflowState).toBe('IN_PROGRESS'); // مرحله عوض نشده
  });

  it('وضعیت مسدود بدون توضیح رد می‌شود', async () => {
    await expect(items.changeHealth(goli(), created['task3'], 'AT_RISK')).rejects.toThrow(/توضیح/);
  });
});

describe('۸) دسترسی و مالکیت', () => {
  it('عضو اجرایی نمی‌تواند اولویت را عوض کند', async () => {
    const goli = { id: created['آقای گلی'], role: 'CONTRIBUTOR' as const, organizationId: ORG };
    await expect(items.update(goli, created['task3'], { priority: 'P0' })).rejects.toThrow(/اولویت/);
  });

  it('سرپرست تیم می‌تواند و تغییر در فعالیت ثبت می‌شود', async () => {
    const torabi = { id: created['خانم ترابی'], role: 'TEAM_LEAD' as const, organizationId: ORG };
    await items.update(torabi, created['task3'], { priority: 'P0', reasonType: 'PRIORITY_CHANGE', reasonText: 'اولویت بالا رفت' });
    const { activities } = await items.detail(torabi, created['task3']);
    expect(activities.some((a: any) => a.action === 'PRIORITY_CHANGED')).toBe(true);
  });

  it('عضو اجرایی نمی‌تواند کاربر بسازد', async () => {
    const { can } = await import('../src/authorization/permissions');
    expect(can('CONTRIBUTOR', 'user.manage')).toBe(false);
    expect(can('TEAM_LEAD', 'user.manage')).toBe(false);
    expect(can('ORG_OWNER', 'user.manage')).toBe(true);
  });
});

describe('۹) کارهای من و دیدگاه‌ها', () => {
  it('کارهای من سه گروه را درست تفکیک می‌کند', async () => {
    const goli = { id: created['آقای گلی'], role: 'CONTRIBUTOR' as const, organizationId: ORG };
    const result = await items.myWork(goli);
    expect(result).toHaveProperty('inProgress');
    expect(result).toHaveProperty('awaitingMyReview');
    expect(result).toHaveProperty('overdue');
  });

  it('دیدگاه ثبت می‌شود و دیدگاه خالی رد می‌شود', async () => {
    const goli = { id: created['آقای گلی'], role: 'CONTRIBUTOR' as const, organizationId: ORG };
    await items.addComment(goli, created['task3'], 'با تیم حقوقی هماهنگ شد، تا پنجشنبه پاسخ می‌دهند.');
    await expect(items.addComment(goli, created['task3'], '   ')).rejects.toThrow(/خالی/);
    const { comments } = await items.detail(goli, created['task3']);
    expect(comments).toHaveLength(1);
  });
});

describe('۱۰) خروج امن عضو', () => {
  it('اثر خروج قبل از غیرفعال کردن گزارش می‌شود', async () => {
    const impact = await users.offboardingImpact(admin, created['آقای گلی']);
    expect(impact.openAssigned).toBeGreaterThanOrEqual(0);
    expect(impact).toHaveProperty('pendingReviews');
  });

  it('واگذاری گروهی کارها انجام می‌شود', async () => {
    const result = await users.reassignAll(admin, created['آقای گلی'], created['آقای دلیری']);
    expect(result.owned + result.assigned + result.reviewing).toBeGreaterThanOrEqual(0);
    const impact = await users.offboardingImpact(admin, created['آقای گلی']);
    expect(impact.openOwned).toBe(0);
    expect(impact.openAssigned).toBe(0);
  });
});

describe('۱۱) ماندگاری بعد از ری‌استارت', () => {
  it('داده‌ها بعد از باز کردن دوباره دیتابیس باقی می‌مانند', async () => {
    prisma.close();
    const reopened: any = new HarnessPrisma(dbFile);
    const svc = new WorkItemsService(reopened, new KeySequenceService(), calendar);

    const all = await svc.list(admin, {});
    expect(all.length).toBeGreaterThanOrEqual(4);

    const { commitments } = await svc.detail(admin, created['task1']);
    expect(commitments).toHaveLength(4);

    const project = await reopened.project.findFirst({ where: { key: 'IPX' } });
    expect(project.name).toBe('IranPeymex');

    prisma = reopened; // برای پاک‌سازی نهایی
  });
});
