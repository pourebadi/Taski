/**
 * تست دود — هر صفحه واقعاً در یک DOM رندر می‌شود.
 *
 * چیزی که tsc نمی‌گیرد و این می‌گیرد: خطای زمان اجرا، یعنی همان
 * «صفحه سفید». هر console.error هم شکست حساب می‌شود، چون در React
 * صفحه‌ی سفید تقریباً همیشه با یک console.error شروع می‌شود.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { ConfigProvider, App as AntApp } from 'antd';
import faIR from 'antd/locale/fa_IR';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import dayjs from 'dayjs';
import jalaliday from 'jalaliday';
dayjs.extend(jalaliday);

import { theme } from '../src/theme';
import { useAuth } from '../src/lib/auth-store';

import MyWork from '../src/pages/MyWork';
import Board from '../src/pages/Board';
import Projects from '../src/pages/Projects';
import WorkList from '../src/pages/WorkList';
import Insights from '../src/pages/Insights';
import Admin from '../src/pages/Admin';
import Login from '../src/pages/Login';
import ChangePassword from '../src/pages/ChangePassword';
import AppShell from '../src/components/AppShell';
import WorkItemDrawer from '../src/components/WorkItemDrawer';

// ── پاسخ‌های ساختگی سرور، با همان شکلی که API واقعاً برمی‌گرداند ──────
const WORK_ITEM = {
  id: 'w1',
  key: 'BE-1',
  title: 'یک کار نمونه',
  priority: 'P1',
  workflowState: 'IN_PROGRESS',
  deliveryHealth: 'AT_RISK',
  workStream: 'PRODUCT',
  workType: 'TASK',
  currentEta: '2026-09-10T00:00:00.000Z',
  firstCommittedEta: '2026-09-01T00:00:00.000Z',
  driftWorkingDays: 7,
  estimateHours: 8,
  primaryAssigneeId: 'u1',
  ownerId: 'u1',
  requiresReview: true,
  requiresQa: false,
  dueDate: '2026-09-15T00:00:00.000Z',
  description: 'توضیح',
  healthNote: 'منتظر پاسخ',
};

const ROUTES: Record<string, unknown> = {
  '/users': [{ id: 'u1', fullName: 'کاربر یک', email: 'a@b.c', role: 'ADMIN', status: 'ACTIVE' }],
  '/teams': [{ id: 't1', name: 'تیم یک' }],
  '/projects': [
    { id: 'p1', key: 'BE', name: 'پروژه یک', status: 'ACTIVE', targetDate: '2026-10-01T00:00:00.000Z', description: 'x' },
  ],
  '/projects/p1': {
    id: 'p1', key: 'BE', name: 'پروژه یک', status: 'ACTIVE', targetDate: null, description: null,
    members: [{ id: 'm1', userId: 'u1', role: 'MEMBER' }],
    stateCounts: [{ workflowState: 'DONE', _count: 2 }],
  },
  '/work-items': [WORK_ITEM],
  '/work-items/my-work': { inProgress: [WORK_ITEM], awaitingMyReview: [], overdue: [WORK_ITEM] },
  '/work-items/w1': {
    item: WORK_ITEM,
    commitments: [
      { id: 'c1', versionNo: 1, changeKind: 'ETA', previousEta: null, newEta: WORK_ITEM.currentEta, deltaWorkingDays: null, reasonType: 'RE_ESTIMATION', reasonText: 'اول', createdAt: '2026-08-01T00:00:00.000Z', changedBy: { fullName: 'کاربر یک' } },
    ],
    changes: [
      { id: 'r1', field: 'PRIORITY', fromValue: 'P2', toValue: 'P1', reasonType: 'PRIORITY_CHANGE', reasonText: 'مهم شد', createdAt: '2026-08-02T00:00:00.000Z', changedBy: { fullName: 'کاربر یک' } },
    ],
    activities: [{ id: 'a1', action: 'CREATED', fromValue: null, toValue: null, createdAt: '2026-08-01T00:00:00.000Z', actor: { fullName: 'کاربر یک' } }],
    comments: [{ id: 'k1', body: 'سلام', createdAt: '2026-08-03T00:00:00.000Z', author: { fullName: 'کاربر یک' } }],
    metrics: { etaShiftCount: 1, lastShiftWorkingDays: 2, cumulativeMovementWorkingDays: 7, driftFromFirstBaseline: 7 },
  },
  '/analytics/overview': {
    totals: { all: 5, active: 3, done: 2, blocked: 1, atRisk: 2, overdue: 1, stale: 0, unassigned: 0 },
    workStreamShare: [{ stream: 'PRODUCT', hours: 12, percent: 100 }],
    healthDistribution: [{ name: 'AT_RISK', count: 2 }],
    stateDistribution: [{ name: 'IN_PROGRESS', count: 3 }],
    priorityDistribution: [{ name: 'P1', count: 3 }],
    commitmentAccuracy: {
      measured: 4, onTime: 3, onTimePercent: 75,
      averageDelayWorkingDays: 2.5, worstDelayWorkingDays: 6,
    },
    blockedRatioPercent: 33,
  },
  '/analytics/schedule-stability': [
    { id: 'w1', key: 'BE-1', title: 'یک کار نمونه', state: 'IN_PROGRESS', shifts: 3, movement: 9 },
  ],
  '/analytics/delay-reasons': {
    byReason: [{ reason: 'BLOCKER', count: 4, totalDays: 12 }],
    byChangedField: [{ field: 'DUE_DATE', count: 2 }],
  },
  '/analytics/throughput': [{ weekStart: '2026-08-24', count: 3 }],
  '/analytics/team-workload': [
    { userId: 'u1', fullName: 'کاربر یک', openItems: 4, estimatedHours: 20, capacityHours: 40 },
  ],
};

function respond(path: string) {
  const clean = path.split('?')[0];
  if (clean.startsWith('/work-items/search')) return [WORK_ITEM];
  if (clean in ROUTES) return ROUTES[clean];
  return null;
}

// ── جمع‌آوری هر خطایی که در کنسول بیفتد ──────────────────────────────
let consoleErrors: string[] = [];
let originalError: typeof console.error;

beforeEach(() => {
  consoleErrors = [];
  originalError = console.error;
  console.error = (...a: unknown[]) => {
    consoleErrors.push(a.map(String).join(' '));
  };

  useAuth.setState({
    accessToken: 'fake-token',
    user: { id: 'u1', fullName: 'کاربر یک', email: 'a@b.c', role: 'ADMIN', mustChangePassword: false },
  });

  vi.stubGlobal('fetch', async (url: string) => {
    const path = String(url).replace(/^.*\/api\/v1/, '');
    const data = respond(path);
    return {
      ok: true,
      status: 200,
      json: async () => data,
      headers: { get: () => null },
    } as unknown as Response;
  });

  // antd به این‌ها نیاز دارد و jsdom ندارد
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({
      matches: false, media: q, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as never;
  }
  (window as never as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  console.error = originalError;
  vi.unstubAllGlobals();
});

function mount(ui: React.ReactElement) {
  return render(
    <ConfigProvider direction="rtl" locale={faIR} theme={theme}>
      <AntApp>
        <MemoryRouter>{ui}</MemoryRouter>
      </AntApp>
    </ConfigProvider>,
  );
}

const PAGES: [string, () => React.ReactElement][] = [
  ['Login', () => <Login />],
  ['ChangePassword (اجباری)', () => <ChangePassword forced />],
  ['ChangePassword (داوطلبانه)', () => <ChangePassword />],
  ['MyWork', () => <MyWork />],
  ['Board', () => <Board />],
  ['Projects', () => <Projects />],
  ['WorkList', () => <WorkList />],
  ['Insights', () => <Insights />],
  ['Admin', () => <Admin />],
  ['AppShell', () => <AppShell><div>محتوا</div></AppShell>],
  ['WorkItemDrawer', () => <WorkItemDrawer id="w1" open onClose={() => {}} onChanged={() => {}} />],
];

describe('هر صفحه بدون خطا رندر می‌شود', () => {
  for (const [name, factory] of PAGES) {
    it(name, async () => {
      const { container } = mount(factory());
      // صبر تا effectها و fetchها تمام شوند
      await waitFor(() => expect(container).toBeTruthy());
      await new Promise((r) => setTimeout(r, 60));

      const real = consoleErrors.filter(
        (e) => !/not wrapped in act|React Router Future Flag|deprecated|getComputedStyle|Not implemented/i.test(e),
      );
      if (real.length) {
        throw new Error(`خطای کنسول در ${name}:\n` + real.join('\n---\n'));
      }
      expect(container.innerHTML.length).toBeGreaterThan(0);
    });
  }
});


/** fetch را طوری می‌سازد که همه‌ی درخواست‌ها یک وضعیت خاص برگردانند. */
function stubFailing(status: number, body: unknown = { code: 'X', message: 'خطا', details: null, requestId: 'r' }) {
  vi.stubGlobal('fetch', async () => ({
    ok: false,
    status,
    json: async () => body,
    headers: { get: () => null },
  }) as unknown as Response);
}

/** پاسخ موفق ولی خالی — تازه‌ترین سازمان دقیقاً همین شکلی است. */
function stubEmpty() {
  vi.stubGlobal('fetch', async (url: string) => {
    const path = String(url).replace(/^.*\/api\/v1/, '').split('?')[0];
    const empty: Record<string, unknown> = {
      '/work-items/my-work': { inProgress: [], awaitingMyReview: [], overdue: [] },
      '/analytics/overview': null,
    };
    const data = path in empty ? empty[path] : [];
    return { ok: true, status: 200, json: async () => data, headers: { get: () => null } } as unknown as Response;
  });
}

const CLEAN = (e: string) =>
  !/not wrapped in act|React Router Future Flag|deprecated|getComputedStyle|Not implemented/i.test(e);

async function expectNoCrash(name: string, ui: React.ReactElement) {
  const { container } = mount(ui);
  await waitFor(() => expect(container).toBeTruthy());
  await new Promise((r) => setTimeout(r, 60));
  const real = consoleErrors.filter(CLEAN);
  if (real.length) throw new Error(`${name}:\n` + real.join('\n---\n'));
}

describe('وقتی سرور خطا می‌دهد صفحه سفید نمی‌شود', () => {
  for (const status of [403, 500]) {
    for (const [name, factory] of PAGES) {
      it(`${name} با پاسخ ${status}`, async () => {
        stubFailing(status);
        await expectNoCrash(`${name} با ${status}`, factory());
      });
    }
  }
});

describe('وقتی داده خالی است صفحه سفید نمی‌شود', () => {
  for (const [name, factory] of PAGES) {
    it(`${name} با داده خالی`, async () => {
      stubEmpty();
      await expectNoCrash(`${name} خالی`, factory());
    });
  }
});
