import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { HarnessPrisma } from './helpers/harness-prisma';
import { WorkItemsService } from '../src/work-items/work-items.service';
import { KeySequenceService } from '../src/key-sequence/key-sequence.service';
import * as wd from '../src/calendar/working-days';

const ORG = 'org';
let dir: string, prisma: any, items: WorkItemsService;
const lead = { id: 'lead', role: 'TEAM_LEAD' as const, organizationId: ORG };
const calendar: any = { loadHolidays: async () => new Set(), countWorkingDays: wd.countWorkingDays };
let taskId: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'peos-cl-'));
  prisma = new HarnessPrisma(join(dir, 'app.db'));
  items = new WorkItemsService(prisma, new KeySequenceService(), calendar);
  await prisma.organization.create({ data: { id: ORG, name: 'تست' } });
  await prisma.user.create({ data: { id: 'lead', organizationId: ORG, fullName: 'سرپرست', email: 'l@x.c', passwordHash: 'h', role: 'TEAM_LEAD', status: 'ACTIVE' } });
  await prisma.user.create({ data: { id: 'dev', organizationId: ORG, fullName: 'مجری', email: 'd@x.c', passwordHash: 'h', role: 'CONTRIBUTOR', status: 'ACTIVE' } });
  const item = await items.create(lead, {
    title: 'کار نمونه', workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: 'lead',
  });
  taskId = item.id;
});
afterAll(() => { prisma?.close?.(); rmSync(dir, { recursive: true, force: true }); });

describe('دفتر تغییرات — علت اجباری', () => {
  it('تغییر اولویت بدون علت رد می‌شود', async () => {
    await expect(items.update(lead, taskId, { priority: 'P0' })).rejects.toThrow(/چرا/);
  });

  it('تغییر مهلت بدون علت رد می‌شود', async () => {
    await expect(items.update(lead, taskId, { dueDate: '2026-10-01T00:00:00Z' })).rejects.toThrow(/چرا/);
  });

  it('تغییر مجری بدون علت رد می‌شود', async () => {
    await expect(items.update(lead, taskId, { primaryAssigneeId: 'dev' })).rejects.toThrow(/چرا/);
  });

  it('تغییر مالک بدون علت رد می‌شود', async () => {
    await expect(items.update(lead, taskId, { ownerId: 'dev' })).rejects.toThrow(/چرا/);
  });

  it('تغییر عنوان علت نمی‌خواهد', async () => {
    await expect(items.update(lead, taskId, { title: 'عنوان تازه' })).resolves.toBeTruthy();
  });

  it('پیام خطا می‌گوید کدام فیلد علت می‌خواهد', async () => {
    await expect(items.update(lead, taskId, { priority: 'P0', dueDate: '2026-10-01T00:00:00Z' }))
      .rejects.toThrow(/اولویت و مهلت/);
  });

  it('با علت ثبت می‌شود و رکورد تغییر می‌سازد', async () => {
    await items.update(lead, taskId, { priority: 'P0', reasonType: 'PRIORITY_CHANGE', reasonText: 'مدیرعامل خواست' });
    const { changes } = await items.detail(lead, taskId);
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe('PRIORITY');
    expect(changes[0].fromValue).toBe('P2');
    expect(changes[0].toValue).toBe('P0');
    expect(changes[0].reasonText).toBe('مدیرعامل خواست');
  });

  it('کار جابه‌جاشده ثبت می‌شود', async () => {
    const other = await items.create(lead, {
      title: 'کاری که عقب می‌افتد', workType: 'TASK', workStream: 'PRODUCT', priority: 'P1', ownerId: 'lead',
    });
    await items.update(lead, taskId, {
      priority: 'P1', reasonType: 'PRIORITY_CHANGE', displacedWorkItemId: other.id,
    });
    const { changes } = await items.detail(lead, taskId);
    // چند رکورد می‌توانند در یک میلی‌ثانیه ساخته شوند، پس با شناسه پیدایش می‌کنیم
    expect(changes.some((c: any) => c.displacedWorkItemId === other.id)).toBe(true);
  });

  it('چند تغییر همزمان چند رکورد جدا می‌سازد', async () => {
    const item = await items.create(lead, {
      title: 'چندتایی', workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: 'lead',
    });
    await items.update(lead, item.id, {
      priority: 'P0', primaryAssigneeId: 'dev', reasonType: 'SCOPE_CHANGE',
    });
    const { changes } = await items.detail(lead, item.id);
    expect(changes).toHaveLength(2);
    expect(new Set(changes.map((c: any) => c.field))).toEqual(new Set(['PRIORITY', 'ASSIGNEE']));
  });
});

describe('لغو کار', () => {
  it('لغو بدون علت رد می‌شود', async () => {
    const item = await items.create(lead, {
      title: 'لغوی', workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: 'lead',
    });
    await expect(items.changeState(lead, item.id, 'CANCELLED')).rejects.toThrow(/چرا/);
  });

  it('لغو با علت ثبت و در دفتر تغییرات ضبط می‌شود', async () => {
    const item = await items.create(lead, {
      title: 'لغوی دوم', workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: 'lead',
    });
    await items.changeState(lead, item.id, 'CANCELLED', {
      reasonType: 'SCOPE_CHANGE', reasonText: 'محصول این مسیر را نمی‌رود',
    });
    const { changes, item: updated } = await items.detail(lead, item.id);
    expect(updated.workflowState).toBe('CANCELLED');
    expect(changes[0].field).toBe('CANCEL');
    expect(changes[0].reasonText).toContain('این مسیر');
  });
});
