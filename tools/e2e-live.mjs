#!/usr/bin/env node
/**
 * ──────────────────────────────────────────────────────────────────────
 *  Taski — اجراکننده‌ی سناریوهای واقعی روی سایت زنده
 * ──────────────────────────────────────────────────────────────────────
 *
 *  این اسکریپت واقعاً به سایت وصل می‌شود، لاگین می‌کند، پروژه و کاربر و
 *  کار می‌سازد، همه‌ی گذارهای وضعیت را می‌زند و رفتار سرور را گزارش می‌دهد.
 *  هیچ وابستگی‌ای ندارد؛ فقط Node نسخه ۱۸ به بالا.
 *
 *  اجرا:
 *      node e2e-live.mjs
 *      node e2e-live.mjs --base=https://taski.fly.dev --username=... --password=...
 *      node e2e-live.mjs --read-only        فقط می‌خواند، چیزی نمی‌سازد
 *
 *  ⚠ هشدار مهم
 *  این اسکریپت داده‌ی واقعی در دیتابیس شما می‌سازد و این محصول هیچ مسیر
 *  حذفی ندارد — کار فقط «لغو» می‌شود، پاک نمی‌شود. همه‌ی چیزهایی که ساخته
 *  می‌شوند با پیشوند [E2E] علامت می‌خورند تا بعداً بتوانید پیدایشان کنید.
 *  اگر روی دیتابیس اصلی تیم اجرا می‌کنید، اول با --read-only شروع کنید.
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const BASE = (args.base || 'https://taski.fly.dev').replace(/\/$/, '');
const USERNAME = args.username || 'admin';
const PASSWORD = args.password || 'LWwDJM8NwzcA1';
const READ_ONLY = !!args['read-only'];
const API = `${BASE}/api/v1`;
const STAMP = new Date().toISOString().slice(5, 16).replace(/[-:T]/g, '');

// ── گزارش ────────────────────────────────────────────────────────────
const results = [];
let group = 'عمومی';

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

function section(name) {
  group = name;
  console.log(`\n${C.bold}${C.cyan}▌ ${name}${C.reset}`);
}

function record(status, name, detail) {
  results.push({ group, status, name, detail });
  const mark =
    status === 'pass' ? `${C.green}✓${C.reset}`
    : status === 'bug' ? `${C.red}✗ باگ${C.reset}`
    : status === 'warn' ? `${C.yellow}!${C.reset}`
    : `${C.dim}–${C.reset}`;
  console.log(`  ${mark} ${name}${detail ? `\n      ${C.dim}${detail}${C.reset}` : ''}`);
}

const pass = (n, d) => record('pass', n, d);
const bug = (n, d) => record('bug', n, d);
const warn = (n, d) => record('warn', n, d);
const skip = (n, d) => record('skip', n, d);

// ── لایه‌ی HTTP با نگهداری کوکی ───────────────────────────────────────
let accessToken = null;
let cookieJar = '';

async function call(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken && !opts.noAuth) headers.Authorization = `Bearer ${accessToken}`;
  if (cookieJar && !opts.noCookie) headers.Cookie = cookieJar;

  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    return { status: 0, body: null, error: String(e) };
  }

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const pair = setCookie.split(';')[0];
    cookieJar = pair;
  }

  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body: parsed, headers: res.headers };
}

const get = (p, o) => call('GET', p, undefined, o);
const post = (p, b, o) => call('POST', p, b, o);
const patch = (p, b, o) => call('PATCH', p, b, o);

/** انتظار یک کد وضعیت مشخص. هر چیز دیگری باگ است. */
function expectStatus(res, expected, name, note) {
  const list = Array.isArray(expected) ? expected : [expected];
  if (list.includes(res.status)) {
    pass(name, note);
    return true;
  }
  const msg = res.body?.message ?? res.error ?? JSON.stringify(res.body)?.slice(0, 160);
  bug(name, `انتظار ${list.join(' یا ')} بود، ${res.status} برگشت — ${msg}`);
  return false;
}

/** ۵۰۰ همیشه باگ است، حتی وقتی ورودی غلط بوده. */
function expectNot500(res, name, note) {
  if (res.status >= 500) {
    bug(name, `سرور ${res.status} داد — ${res.body?.message ?? res.error ?? ''}`);
    return false;
  }
  pass(name, note ?? `پاسخ ${res.status}`);
  return true;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (daysFromNow) =>
  new Date(Date.now() + daysFromNow * 86400_000).toISOString();

// ── حالت مشترک بین سناریوها ──────────────────────────────────────────
const made = { projects: {}, users: {}, teams: {}, items: {} };

// ══════════════════════════════════════════════════════════════════════
async function scenarioHealthAndAuth() {
  section('۱) سلامت سرویس و احراز هویت');

  const health = await get('/health', { noAuth: true });
  if (health.status === 0) {
    console.log(`\n${C.red}به سایت وصل نشدم: ${health.error}${C.reset}`);
    console.log(`آدرس امتحان‌شده: ${API}/health\n`);
    process.exit(1);
  }
  expectStatus(health, 200, 'GET /health پاسخ می‌دهد');
  if (health.body?.database !== 'up') warn('دیتابیس up نیست', JSON.stringify(health.body));
  if (health.body?.disk !== 'writable') warn('دیسک writable نیست', JSON.stringify(health.body));

  // رفرش بدون کوکی: باید ۴۰۱ باشد. اگر ۵۰۰ بدهد، همان باگ hashToken(undefined) است.
  const noCookie = await post('/auth/refresh', undefined, { noAuth: true, noCookie: true });
  if (noCookie.status >= 500) {
    bug(
      'POST /auth/refresh بدون کوکی',
      `۵۰۰ برگشت. این همان createHash().update(undefined) است. باید ۴۰۱ باشد.`,
    );
  } else {
    expectStatus(noCookie, 401, 'POST /auth/refresh بدون کوکی → ۴۰۱');
  }

  const badPass = await post('/auth/login', { username: USERNAME, password: 'definitely-wrong' }, { noAuth: true });
  expectStatus(badPass, 401, 'رمز غلط → ۴۰۱');

  const noUser = await post('/auth/login', { username: `ghost-${STAMP}`, password: 'x' }, { noAuth: true });
  if (noUser.body?.message && badPass.body?.message && noUser.body.message !== badPass.body.message) {
    bug('پیام خطای ورود وجود حساب را لو می‌دهد', 'کاربر ناموجود و رمز غلط پیام یکسان نمی‌دهند');
  } else {
    pass('پیام خطای ورود وجود حساب را لو نمی‌دهد');
  }

  const empty = await post('/auth/login', {}, { noAuth: true });
  expectNot500(empty, 'ورود با بدنه‌ی خالی ۵۰۰ نمی‌دهد');

  const login = await post('/auth/login', { username: USERNAME, password: PASSWORD }, { noAuth: true });
  if (!expectStatus(login, 200, 'ورود با اطلاعات درست')) {
    console.log(`\n${C.red}بدون ورود موفق ادامه ممکن نیست. اطلاعات ورود را بررسی کنید.${C.reset}\n`);
    process.exit(1);
  }
  accessToken = login.body.accessToken;
  made.me = login.body.user;
  console.log(`      ${C.dim}وارد شدید به‌عنوان ${made.me.fullName} (${made.me.role})${C.reset}`);

  if (!cookieJar) warn('کوکی refresh ست نشد', 'بازسازی نشست بعد از رفرش صفحه کار نخواهد کرد');

  const refreshed = await post('/auth/refresh');
  expectStatus(refreshed, 200, 'رفرش با کوکی معتبر');
  if (refreshed.status === 200 && !refreshed.body?.user) {
    warn(
      'رفرش، کاربر را برنمی‌گرداند',
      'فرانت نمی‌تواند فقط با رفرش نشست را بازسازی کند و کاربر با هر F5 بیرون می‌افتد',
    );
  }

  const me = await get('/auth/me');
  if (me.status === 404) skip('GET /auth/me', 'این مسیر در نسخه‌ی دیپلوی‌شده وجود ندارد');
  else expectStatus(me, 200, 'GET /auth/me');

  const noToken = await get('/users', { noAuth: true, noCookie: true });
  expectStatus(noToken, 401, 'مسیر محافظت‌شده بدون توکن → ۴۰۱');

  const badToken = (await (async () => {
    const saved = accessToken;
    accessToken = 'not.a.real.token';
    const r = await get('/users');
    accessToken = saved;
    return r;
  })());
  expectStatus(badToken, 401, 'توکن نامعتبر → ۴۰۱');
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioValidation() {
  section('۲) اعتبارسنجی ورودی — هیچ ورودی بدی نباید ۵۰۰ بدهد');

  const cases = [
    ['POST /projects بدون هیچ فیلدی', () => post('/projects', {})],
    ['POST /projects بدون name', () => post('/projects', { key: `Z${STAMP.slice(-3)}` })],
    ['POST /projects با کلید غیرمجاز', () => post('/projects', { key: '۱۲۳!!', name: 'x' })],
    ['POST /teams بدون name', () => post('/teams', {})],
    ['POST /users بدون هیچ فیلدی', () => post('/users', {})],
    ['POST /users با نام‌کاربری بی‌معنا', () => post('/users', { fullName: 'x', username: '@!', role: 'CONTRIBUTOR' })],
    ['POST /users با نقش نامعتبر', () => post('/users', { fullName: 'x', username: `a${STAMP}`, role: 'GOD_MODE' })],
    ['POST /work-items بدون هیچ فیلدی', () => post('/work-items', {})],
    ['POST /work-items با اولویت بی‌معنا', () =>
      post('/work-items', { title: 'x', workType: 'TASK', workStream: 'PRODUCT', priority: 'SUPER_URGENT', ownerId: made.me.id })],
    ['POST /work-items با جریان کاری بی‌معنا', () =>
      post('/work-items', { title: 'x', workType: 'TASK', workStream: 'MOON', priority: 'P2', ownerId: made.me.id })],
    ['POST /work-items با مالک ناموجود', () =>
      post('/work-items', { title: 'x', workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: 'ghost-user-id' })],
    ['POST /work-items با عنوان خالی', () =>
      post('/work-items', { title: '   ', workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: made.me.id })],
  ];

  if (READ_ONLY) {
    skip('اعتبارسنجی ورودی', 'در حالت read-only اجرا نشد چون بعضی از این‌ها ممکن است رکورد بسازند');
    return;
  }

  for (const [name, fn] of cases) {
    const res = await fn();
    if (res.status >= 500) {
      bug(name, `۵۰۰ برگشت — ${res.body?.message ?? ''}. باید ۴۲۲ باشد.`);
    } else if (res.status >= 200 && res.status < 300) {
      bug(name, `ورودی نامعتبر پذیرفته شد (${res.status}). هیچ اعتبارسنجی‌ای وجود ندارد.`);
    } else {
      pass(name, `درست رد شد با ${res.status}`);
    }
  }

  // پارامترهای عددی مخرب
  const huge = await get('/analytics/throughput?weeks=100000');
  expectNot500(huge, 'GET /analytics/throughput?weeks=100000 سرور را نمی‌خواباند');
  const nan = await get('/analytics/throughput?weeks=abc');
  if (nan.status === 200 && Array.isArray(nan.body) && nan.body.length === 0) {
    warn('throughput?weeks=abc آرایه‌ی خالی می‌دهد', 'NaN بدون clamp وارد حلقه می‌شود');
  } else {
    expectNot500(nan, 'GET /analytics/throughput?weeks=abc');
  }
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioBuildWorld() {
  section('۳) ساخت پروژه، تیم و کاربر');

  if (READ_ONLY) {
    skip('ساخت داده', 'حالت read-only');
    return false;
  }

  // ── پروژه‌ها
  for (const [key, name] of [
    [`EA${STAMP.slice(-2)}`, `[E2E] پروژه‌ی الف ${STAMP}`],
    [`EB${STAMP.slice(-2)}`, `[E2E] پروژه‌ی ب ${STAMP}`],
  ]) {
    const res = await post('/projects', {
      key,
      name,
      description: 'ساخته‌شده توسط اسکریپت تست خودکار. قابل حذف نیست، فقط علامت‌گذاری شده.',
      targetDate: iso(60),
    });
    if (expectStatus(res, [200, 201], `ساخت پروژه ${key}`)) made.projects[key] = res.body.id;
  }

  const keys = Object.keys(made.projects);
  if (keys.length) {
    const dup = await post('/projects', { key: keys[0], name: 'تکراری' });
    expectStatus(dup, 409, 'کلید پروژه‌ی تکراری → ۴۰۹');
  }

  // ── تیم
  const team = await post('/teams', { name: `[E2E] تیم ${STAMP}` });
  if (team.status < 300) {
    made.teams.main = team.body.id;
    pass('ساخت تیم');
    const dupTeam = await post('/teams', { name: `[E2E] تیم ${STAMP}` });
    expectStatus(dupTeam, 409, 'نام تیم تکراری → ۴۰۹');
  } else if (team.status === 403) {
    skip('ساخت تیم', 'حساب فعلی مجوز team.manage ندارد');
  } else {
    bug('ساخت تیم', `${team.status} — ${team.body?.message ?? ''}`);
  }

  // ── کاربران با نقش‌های مختلف
  const roster = [
    ['CONTRIBUTOR', 'عضو اجرایی'],
    ['TEAM_LEAD', 'سرپرست تیم'],
    ['PROJECT_MANAGER', 'مدیر پروژه'],
    ['VIEWER', 'مشاهده‌گر'],
    ['REQUESTER', 'درخواست‌دهنده'],
  ];
  for (const [role, label] of roster) {
    const username = `e2e.${role.toLowerCase()}.${STAMP}`;
    const res = await post('/users', {
      fullName: `[E2E] ${label}`,
      username,
      jobTitle: 'حساب تست',
      role,
      primaryTeamId: made.teams.main ?? undefined,
    });
    if (res.status === 403) {
      skip(`ساخت کاربر ${role}`, 'حساب فعلی مجوز user.manage ندارد');
      break;
    }
    if (expectStatus(res, [200, 201], `ساخت کاربر با نقش ${role}`)) {
      made.users[role] = { id: res.body.id, username, password: res.body.temporaryPassword };
      if (!res.body.temporaryPassword) warn(`کاربر ${role}`, 'رمز موقت برنگشت');
    }
  }

  const anyUser = Object.values(made.users)[0];
  if (anyUser) {
    const dupUsername = await post('/users', {
      fullName: 'تکراری', username: anyUser.username, role: 'CONTRIBUTOR',
    });
    expectStatus(dupUsername, 409, 'نام‌کاربری تکراری → ۴۰۹');
  }

  // عضویت در پروژه
  if (keys.length && anyUser) {
    const add = await post(`/projects/${made.projects[keys[0]]}/members/${anyUser.id}`, {});
    expectStatus(add, [200, 201], 'افزودن عضو به پروژه');
    const again = await post(`/projects/${made.projects[keys[0]]}/members/${anyUser.id}`, {});
    expectStatus(again, [200, 201], 'افزودن دوباره‌ی همان عضو خطا نمی‌دهد');
  }

  // کاربر جعلی از سازمان دیگر
  if (made.teams.main) {
    const ghost = await post(`/teams/${made.teams.main}/members/ghost-user-id`, {});
    if (ghost.status >= 500) {
      bug('افزودن کاربر ناموجود به تیم', '۵۰۰ برگشت. خطای FK به کد HTTP ترجمه نشده.');
    } else {
      expectStatus(ghost, [404, 422], 'افزودن کاربر ناموجود به تیم رد می‌شود');
    }
  }

  return true;
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioWorkItems() {
  section('۴) ساخت کار در وضعیت‌ها و شرایط مختلف');
  if (READ_ONLY) return skip('ساخت کار', 'حالت read-only');

  const projectIds = Object.values(made.projects);
  const owner = made.me.id;
  const assignee = made.users.CONTRIBUTOR?.id ?? owner;
  const reviewer = made.users.TEAM_LEAD?.id ?? owner;

  const blueprints = [
    { alias: 'simple', title: '[E2E] کار ساده بدون پروژه', workStream: 'PRODUCT', workType: 'TASK', priority: 'P2', projectId: null },
    { alias: 'urgent', title: '[E2E] باگ فوری', workStream: 'SUPPORT', workType: 'BUG', priority: 'P0', projectId: projectIds[0] ?? null },
    { alias: 'review', title: '[E2E] کار نیازمند بازبینی', workStream: 'PRODUCT', workType: 'FEATURE', priority: 'P1', requiresReview: true, reviewerId: reviewer, projectId: projectIds[0] ?? null },
    { alias: 'qa', title: '[E2E] کار نیازمند تست', workStream: 'TECH_DEBT', workType: 'TECH_DEBT', priority: 'P2', requiresQa: true, projectId: projectIds[1] ?? null },
    { alias: 'both', title: '[E2E] کار با بازبینی و تست', workStream: 'INFRASTRUCTURE', workType: 'INFRA', priority: 'P1', requiresReview: true, requiresQa: true, reviewerId: reviewer, projectId: projectIds[1] ?? null },
    { alias: 'cancelme', title: '[E2E] کاری که لغو می‌شود', workStream: 'PRODUCT', workType: 'TASK', priority: 'P3', projectId: null },
    { alias: 'drifter', title: '[E2E] کاری که تاریخش مدام عقب می‌رود', workStream: 'PRODUCT', workType: 'FEATURE', priority: 'P1', projectId: projectIds[0] ?? null },
    { alias: 'overdue', title: '[E2E] کاری که از مهلتش گذشته', workStream: 'SUPPORT', workType: 'BUG', priority: 'P0', projectId: null },
  ];

  for (const bp of blueprints) {
    const { alias, ...rest } = bp;
    const res = await post('/work-items', {
      ...rest,
      ownerId: owner,
      primaryAssigneeId: assignee,
      dueDate: iso(21),
      acceptanceCriteria: 'ساخته‌شده توسط تست خودکار.',
    });
    if (expectStatus(res, [200, 201], `ساخت «${bp.title}»`)) {
      made.items[alias] = res.body.id;
      if (res.body.workflowState !== 'BACKLOG') {
        warn(`«${bp.title}»`, `وضعیت اولیه ${res.body.workflowState} است، انتظار BACKLOG بود`);
      }
      if (!res.body.key) warn(`«${bp.title}»`, 'کلید نمایشی تولید نشد');
    }
  }

  // کلیدهای یکتا
  const listed = await get('/work-items');
  if (listed.status === 200 && Array.isArray(listed.body)) {
    const keys = listed.body.map((i) => i.key);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    if (dupes.length) bug('کلیدهای کار یکتا نیستند', `تکراری: ${[...new Set(dupes)].join(', ')}`);
    else pass('همه‌ی کلیدهای کار یکتا هستند', `${keys.length} کار بررسی شد`);
  }

  // سلسله‌مراتب یک‌سطحی
  if (made.items.simple) {
    const child = await post('/work-items', {
      title: '[E2E] زیرکار', parentId: made.items.simple,
      workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: owner,
    });
    if (expectStatus(child, [200, 201], 'ساخت زیرکار یک سطح پایین‌تر')) {
      const grand = await post('/work-items', {
        title: '[E2E] نوه', parentId: child.body.id,
        workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: owner,
      });
      expectStatus(grand, 422, 'سلسله‌مراتب دو سطحی رد می‌شود');
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioStateMachine() {
  section('۵) ماشین حالت — همه‌ی گذارهای مجاز و غیرمجاز');
  if (READ_ONLY || !made.items.simple) return skip('ماشین حالت', 'داده‌ای ساخته نشد');

  const move = (id, state, extra = {}) => patch(`/work-items/${id}/state`, { state, ...extra });

  // مسیر خوشحال
  const happy = made.items.simple;
  for (const [from, to] of [['BACKLOG', 'READY'], ['READY', 'IN_PROGRESS'], ['IN_PROGRESS', 'DONE']]) {
    const res = await move(happy, to);
    expectStatus(res, 200, `گذار ${from} → ${to}`);
  }
  const reopen = await move(happy, 'IN_PROGRESS');
  expectStatus(reopen, 200, 'بازگشایی DONE → IN_PROGRESS');

  // completedAt نباید با گذارهای بعدی پاک شود
  const afterReopen = await get(`/work-items/${happy}`);
  if (afterReopen.status === 200) {
    await move(happy, 'DONE');
    const done = await get(`/work-items/${happy}`);
    if (done.body?.item?.completedAt) pass('completedAt بعد از بستن دوباره ثبت است');
    else bug('completedAt ثبت نشد', 'نمودار دقت تعهد بدون این عدد غلط می‌شود');
  }

  // گذارهای غیرمجاز
  if (made.items.urgent) {
    const bad = await move(made.items.urgent, 'IN_REVIEW'); // BACKLOG → IN_REVIEW
    expectStatus(bad, 422, 'گذار غیرمجاز BACKLOG → IN_REVIEW رد می‌شود');

    const bogus = await move(made.items.urgent, 'TELEPORTED');
    if (bogus.status >= 200 && bogus.status < 300) {
      bug('وضعیت بی‌معنا پذیرفته شد', 'رشته‌ی دلخواه در ستون workflowState نوشته می‌شود');
    } else {
      expectNot500(bogus, 'وضعیت بی‌معنا رد می‌شود');
    }
  }

  // بازبینی اجباری — مسیر دور زدن
  if (made.items.review) {
    const id = made.items.review;
    await move(id, 'IN_PROGRESS');
    const direct = await move(id, 'DONE');
    expectStatus(direct, 422, 'کار نیازمند بازبینی مستقیم به DONE نمی‌رود');

    // مسیر انحرافی: IN_PROGRESS → IN_QA → DONE
    const viaQa = await move(id, 'IN_QA');
    if (viaQa.status === 200) {
      const sneaky = await move(id, 'DONE');
      if (sneaky.status === 200) {
        bug(
          'بازبینی اجباری دور زده می‌شود',
          'مسیر IN_PROGRESS → IN_QA → DONE بازبینی را کامل رد می‌کند',
        );
      } else {
        pass('مسیر انحرافی IN_QA هم بازبینی را دور نمی‌زند');
      }
    }
  }

  // QA اجباری
  if (made.items.qa) {
    const id = made.items.qa;
    await move(id, 'IN_PROGRESS');
    const skipQa = await move(id, 'DONE');
    expectStatus(skipQa, 422, 'کار نیازمند تست بدون عبور از QA بسته نمی‌شود');
    await move(id, 'IN_QA');
    expectStatus(await move(id, 'DONE'), 200, 'بعد از QA بسته می‌شود');
  }

  // لغو بدون علت
  if (made.items.cancelme) {
    const id = made.items.cancelme;
    const noReason = await move(id, 'CANCELLED');
    expectStatus(noReason, 422, 'لغو بدون علت رد می‌شود');
    const withReason = await move(id, 'CANCELLED', {
      reasonType: 'PRIORITY_CHANGE',
      reasonText: 'اولویت تیم عوض شد.',
    });
    expectStatus(withReason, 200, 'لغو با علت ثبت می‌شود');

    const detail = await get(`/work-items/${id}`);
    const hasRecord = detail.body?.changes?.some((c) => c.field === 'CANCEL');
    if (hasRecord) pass('لغو در دفتر تغییرات ثبت شد');
    else bug('لغو در دفتر تغییرات ثبت نشد');
  }
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioCommitments() {
  section('۶) تعهد، انحراف و بازتعریف Baseline');
  if (READ_ONLY || !made.items.drifter) return skip('تعهد', 'داده‌ای ساخته نشد');

  const id = made.items.drifter;
  const commit = (b) => patch(`/work-items/${id}/commitment`, b);

  const noReason = await commit({ newEta: iso(10), confidence: 'HIGH' });
  expectStatus(noReason, 422, 'تغییر تعهد بدون علت رد می‌شود');

  const first = await commit({ newEta: iso(10), confidence: 'HIGH', reasonType: 'RE_ESTIMATION', reasonText: 'اولین برآورد.' });
  expectStatus(first, 200, 'ثبت اولین تعهد');

  const noChange = await commit({ newEta: iso(10), confidence: 'HIGH', reasonType: 'RE_ESTIMATION' });
  expectStatus(noChange, 422, 'ثبت تعهد بدون هیچ تغییری رد می‌شود');

  // چند بار عقب رفتن
  for (const [days, reason] of [[17, 'BLOCKER'], [24, 'DEPENDENCY'], [31, 'SCOPE_CHANGE']]) {
    const res = await commit({ newEta: iso(days), confidence: 'MEDIUM', reasonType: reason, reasonText: `عقب‌افتادگی به دلیل ${reason}.` });
    expectStatus(res, 200, `جابه‌جایی تاریخ با علت ${reason}`);
  }

  const badDate = await commit({ newEta: 'دیروزِ پارسال', reasonType: 'EXTERNAL' });
  if (badDate.status >= 500) bug('تاریخ بی‌معنا در تعهد', '۵۰۰ برگشت. Invalid Date به دیتابیس رسیده.');
  else expectNot500(badDate, 'تاریخ بی‌معنا در تعهد رد می‌شود');

  const detail = await get(`/work-items/${id}`);
  const item = detail.body?.item;
  const history = detail.body?.commitments ?? [];
  const metrics = detail.body?.metrics;

  if (history.length >= 4) pass('تاریخچه‌ی تعهد کامل ثبت شد', `${history.length} نسخه`);
  else bug('تاریخچه‌ی تعهد ناقص است', `فقط ${history.length} نسخه ثبت شد`);

  const versions = history.map((h) => h.versionNo).sort((a, b) => a - b);
  const sequential = versions.every((v, i) => v === i + 1);
  if (sequential) pass('شماره‌ی نسخه‌ها پیوسته است');
  else bug('شماره‌ی نسخه‌ها پیوسته نیست', versions.join(', '));

  if (item?.firstCommittedEta) {
    const baselineMoved = new Date(item.firstCommittedEta).getTime() !== new Date(iso(10)).getTime();
    pass('تعهد اولیه ثبت شد', `انحراف: ${metrics?.driftFromFirstBaseline ?? '؟'} روز کاری`);
    if (metrics?.driftFromFirstBaseline == null) warn('انحراف از تعهد اولیه محاسبه نشد');
  } else {
    bug('تعهد اولیه ثبت نشد');
  }

  // Baseline اول باید تغییرناپذیر بماند
  const beforeRebase = item?.firstCommittedEta;
  const rebase = await patch(`/work-items/${id}/re-baseline`, { newBaseline: iso(45), reasonText: 'دامنه رسماً بزرگ‌تر شد.' });
  if (rebase.status === 403) {
    skip('بازتعریف Baseline', 'حساب فعلی مجوز workitem.rebaseline ندارد');
  } else if (expectStatus(rebase, 200, 'بازتعریف Baseline با دلیل')) {
    const after = await get(`/work-items/${id}`);
    if (after.body?.item?.firstCommittedEta === beforeRebase) {
      pass('تعهد اولیه بعد از re-baseline دست‌نخورده ماند');
    } else {
      bug('تعهد اولیه بعد از re-baseline عوض شد', 'این رکورد باید تغییرناپذیر باشد');
    }
  }

  const noWhy = await patch(`/work-items/${id}/re-baseline`, { newBaseline: iso(50), reasonText: '' });
  if (noWhy.status !== 403) expectStatus(noWhy, 422, 'بازتعریف Baseline بدون دلیل رد می‌شود');
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioTrackedChanges() {
  section('۷) تغییرات ردیابی‌شده — علت اجباری');
  if (READ_ONLY || !made.items.urgent) return skip('تغییرات ردیابی‌شده', 'داده‌ای ساخته نشد');

  const id = made.items.urgent;
  const upd = (b) => patch(`/work-items/${id}`, b);

  for (const [field, payload] of [
    ['اولویت', { priority: 'P3' }],
    ['مهلت', { dueDate: iso(40) }],
    ['مجری', { primaryAssigneeId: made.users.TEAM_LEAD?.id ?? made.me.id }],
    ['مالک', { ownerId: made.users.PROJECT_MANAGER?.id ?? made.me.id }],
  ]) {
    const res = await upd(payload);
    if (res.status === 403) { skip(`تغییر ${field}`, 'مجوز کافی نیست'); continue; }
    expectStatus(res, 422, `تغییر ${field} بدون علت رد می‌شود`);
  }

  const ok = await upd({ priority: 'P3', reasonType: 'PRIORITY_CHANGE', reasonText: 'کار دیگری فوری‌تر شد.' });
  if (ok.status !== 403) expectStatus(ok, 200, 'تغییر اولویت با علت ثبت می‌شود');

  // پاک کردن مهلت
  const clear = await upd({ dueDate: null, reasonType: 'SCOPE_CHANGE', reasonText: 'مهلت بی‌معنا شد.' });
  if (clear.status === 200) {
    const after = await get(`/work-items/${id}`);
    if (after.body?.item?.dueDate == null) {
      pass('پاک کردن مهلت واقعاً اعمال می‌شود');
    } else {
      bug(
        'پاک کردن مهلت اعمال نمی‌شود',
        'در دفتر تغییرات ثبت می‌شود ولی روی رکورد نمی‌نشیند — دفتر تغییرات دروغ می‌گوید',
      );
    }
  }

  // تغییرات بی‌ضرر نباید علت بخواهند
  const harmless = await upd({ description: 'توضیح تازه بدون نیاز به علت.' });
  if (harmless.status !== 403) expectStatus(harmless, 200, 'تغییر توضیح بدون علت مجاز است');

  const detail = await get(`/work-items/${id}`);
  const changes = detail.body?.changes ?? [];
  if (changes.length) pass('دفتر تغییرات پر شد', `${changes.length} رکورد`);
  else warn('دفتر تغییرات خالی ماند');
  if (changes.every((c) => c.reasonType)) pass('همه‌ی رکوردهای دفتر تغییرات علت دارند');
  else bug('رکوردی در دفتر تغییرات بدون علت ثبت شده');
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioHealthAndComments() {
  section('۸) سلامت تحویل، دیدگاه و جست‌وجو');
  if (READ_ONLY || !made.items.overdue) return skip('سلامت و دیدگاه', 'داده‌ای ساخته نشد');

  const id = made.items.overdue;

  const noNote = await patch(`/work-items/${id}/health`, { health: 'BLOCKED' });
  expectStatus(noNote, 422, 'وضعیت «مسدود» بدون توضیح رد می‌شود');

  const withNote = await patch(`/work-items/${id}/health`, { health: 'BLOCKED', note: 'منتظر پاسخ سرویس پرداخت.' });
  expectStatus(withNote, 200, 'وضعیت «مسدود» با توضیح ثبت می‌شود');

  const atRisk = await patch(`/work-items/${id}/health`, { health: 'AT_RISK', note: 'احتمال لغزش دو روزه.' });
  expectStatus(atRisk, 200, 'وضعیت «در خطر» با توضیح ثبت می‌شود');

  const onTrack = await patch(`/work-items/${id}/health`, { health: 'ON_TRACK' });
  expectStatus(onTrack, 200, 'بازگشت به «طبق برنامه» بدون توضیح مجاز است');

  const bogus = await patch(`/work-items/${id}/health`, { health: 'FANTASTIC', note: 'x' });
  if (bogus.status >= 200 && bogus.status < 300) bug('سلامت بی‌معنا پذیرفته شد');
  else expectNot500(bogus, 'سلامت بی‌معنا رد می‌شود');

  // سلامت نباید مرحله را عوض کند
  const before = (await get(`/work-items/${id}`)).body?.item?.workflowState;
  await patch(`/work-items/${id}/health`, { health: 'AT_RISK', note: 'دوباره در خطر.' });
  const after = (await get(`/work-items/${id}`)).body?.item?.workflowState;
  if (before === after) pass('تغییر سلامت مرحله را عوض نمی‌کند — دو محور مستقل');
  else bug('تغییر سلامت مرحله را هم عوض کرد', `${before} → ${after}`);

  const empty = await post(`/work-items/${id}/comments`, { body: '   ' });
  expectStatus(empty, 422, 'دیدگاه خالی رد می‌شود');

  const comment = await post(`/work-items/${id}/comments`, { body: 'دیدگاه تست خودکار — «كاربر» با ي عربی.' });
  expectStatus(comment, [200, 201], 'ثبت دیدگاه');

  // نرمال‌سازی فارسی در جست‌وجو
  const arabic = await get(`/work-items/search?q=${encodeURIComponent('كار')}`);
  const persian = await get(`/work-items/search?q=${encodeURIComponent('کار')}`);
  if (arabic.status === 200 && persian.status === 200) {
    if (arabic.body.length === persian.body.length) {
      pass('جست‌وجو «ك» عربی و «ک» فارسی را یکسان می‌بیند', `${persian.body.length} نتیجه`);
    } else {
      bug('نرمال‌سازی فارسی در جست‌وجو کار نمی‌کند', `${arabic.body.length} در برابر ${persian.body.length}`);
    }
  }

  const emptyQ = await get('/work-items/search?q=');
  expectNot500(emptyQ, 'جست‌وجوی خالی ۵۰۰ نمی‌دهد');
  const weird = await get(`/work-items/search?q=${encodeURIComponent("'; DROP TABLE WorkItem; --")}`);
  expectNot500(weird, 'ورودی مخرب در جست‌وجو ۵۰۰ نمی‌دهد');
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioFiltersAndAnalytics() {
  section('۹) فیلترها، فهرست‌ها و آمار');

  const checks = [
    ['/work-items', 'فهرست کارها'],
    ['/work-items?priority=P0', 'فیلتر اولویت'],
    ['/work-items?workStream=PRODUCT', 'فیلتر جریان کاری'],
    ['/work-items?deliveryHealth=BLOCKED', 'فیلتر سلامت'],
    ['/work-items?projectId=none', 'فیلتر کارهای بدون پروژه'],
    ['/work-items?includeClosed=true', 'فهرست شامل کارهای بسته'],
    ['/work-items/my-work', 'کارهای من'],
    ['/projects', 'فهرست پروژه‌ها'],
    ['/users', 'فهرست کاربران'],
    ['/teams', 'فهرست تیم‌ها'],
    ['/analytics/overview', 'آمار کلی'],
    ['/analytics/schedule-stability', 'بی‌ثباتی برنامه'],
    ['/analytics/delay-reasons', 'علت تأخیرها'],
    ['/analytics/throughput', 'روند تحویل'],
  ];
  for (const [path, name] of checks) {
    const res = await get(path);
    expectStatus(res, 200, name);
  }

  // آیا فیلتر واقعاً فیلتر می‌کند؟
  const p0 = await get('/work-items?priority=P0');
  if (p0.status === 200 && Array.isArray(p0.body)) {
    const wrong = p0.body.filter((i) => i.priority !== 'P0');
    if (wrong.length) bug('فیلتر اولویت کار نمی‌کند', `${wrong.length} کار غیر P0 برگشت`);
    else pass('فیلتر اولویت درست عمل می‌کند', `${p0.body.length} کار P0`);
  }

  const closed = await get('/work-items?includeClosed=false');
  if (closed.status === 200 && Array.isArray(closed.body)) {
    const done = closed.body.filter((i) => i.workflowState === 'DONE').length;
    const cancelled = closed.body.filter((i) => i.workflowState === 'CANCELLED').length;
    if (cancelled > 0) bug('includeClosed=false کارهای لغوشده را حذف نمی‌کند', `${cancelled} کار لغوشده`);
    else pass('کارهای لغوشده از فهرست پیش‌فرض حذف می‌شوند');
    if (done > 0) warn('includeClosed=false کارهای DONE را نگه می‌دارد', `${done} کار انجام‌شده — نام فیلتر با رفتارش نمی‌خواند`);
  }

  const workload = await get('/analytics/team-workload');
  if (workload.status === 403) pass('آمار تیم برای نقش‌های پایین ۴۰۳ می‌دهد');
  else expectStatus(workload, 200, 'آمار بار کاری تیم');

  const ghost = await get('/work-items/این-آیدی-وجود-ندارد');
  expectStatus(ghost, 404, 'کار ناموجود → ۴۰۴');
  const ghostProject = await get('/projects/ghost-id');
  expectStatus(ghostProject, 404, 'پروژه‌ی ناموجود → ۴۰۴');
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioPermissions() {
  section('۱۰) دسترسی‌ها با نقش‌های واقعی');

  const viewer = made.users.VIEWER;
  if (READ_ONLY || !viewer?.password) return skip('تست دسترسی', 'کاربر تست ساخته نشد');

  const adminToken = accessToken;
  const adminCookie = cookieJar;

  // ورود با حساب مشاهده‌گر
  accessToken = null;
  cookieJar = '';
  const login = await post('/auth/login', { username: viewer.username, password: viewer.password }, { noAuth: true });

  if (login.status !== 200) {
    warn('ورود با حساب مشاهده‌گر ناموفق', `${login.status} — ${login.body?.message ?? ''}`);
  } else {
    accessToken = login.body.accessToken;
    pass('ورود با حساب تازه‌ساخته‌شده');
    if (login.body.user?.mustChangePassword) pass('کاربر تازه مجبور به تغییر رمز است');
    else bug('کاربر تازه mustChangePassword ندارد');

    const forbidden = [
      ['POST /users', () => post('/users', { fullName: 'x', username: `nope${STAMP}`, role: 'ADMIN' })],
      ['POST /projects', () => post('/projects', { key: 'NOPE', name: 'x' })],
      ['POST /work-items', () => post('/work-items', { title: 'x', workType: 'TASK', workStream: 'PRODUCT', priority: 'P2', ownerId: viewer.id })],
      ['POST /teams', () => post('/teams', { name: 'x' })],
    ];
    for (const [name, fn] of forbidden) {
      const res = await fn();
      expectStatus(res, 403, `مشاهده‌گر نمی‌تواند ${name}`);
    }

    const canRead = await get('/work-items');
    expectStatus(canRead, 200, 'مشاهده‌گر می‌تواند کارها را ببیند');

    // تغییر رمز نباید نشست جاری را بکشد
    const newPass = `E2eTest${STAMP}xy`;
    const changed = await post('/auth/change-password', {
      currentPassword: viewer.password,
      newPassword: newPass,
    });
    if (changed.status === 200) {
      pass('تغییر رمز انجام شد');
      const stillAlive = await post('/auth/refresh');
      if (stillAlive.status === 200) {
        pass('نشست جاری بعد از تغییر رمز زنده ماند');
      } else {
        bug(
          'تغییر رمز، نشست خود کاربر را هم می‌کشد',
          'کاربر بعد از انقضای access token بی‌صدا بیرون انداخته می‌شود',
        );
      }
      console.log(`      ${C.dim}رمز تازه‌ی این حساب تست: ${newPass}${C.reset}`);
    } else {
      warn('تغییر رمز ناموفق', `${changed.status} — ${changed.body?.message ?? ''}`);
    }

    const weak = await post('/auth/change-password', { currentPassword: newPass, newPassword: '123' });
    expectStatus(weak, 422, 'رمز ضعیف رد می‌شود');
  }

  // بازگشت به حساب مدیر
  accessToken = adminToken;
  cookieJar = adminCookie;
  const back = await get('/users');
  if (back.status === 200) pass('بازگشت به حساب مدیر');
  else warn('بازگشت به حساب مدیر ناموفق', `${back.status}`);
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioAdminGuards() {
  section('۱۱) نگهبان‌های مدیریتی');
  if (READ_ONLY) return skip('نگهبان‌های مدیریتی', 'حالت read-only');

  const selfDisable = await patch(`/users/${made.me.id}/status`, { status: 'DISABLED' });
  if (selfDisable.status === 200) {
    bug('مدیر توانست حساب خودش را غیرفعال کند', 'حالا ممکن است بیرون در بمانید — فوراً دوباره فعالش کنید');
    await patch(`/users/${made.me.id}/status`, { status: 'ACTIVE' });
  } else if (selfDisable.status === 403) {
    skip('غیرفعال کردن خود', 'مجوز user.manage ندارید');
  } else {
    expectStatus(selfDisable, 422, 'مدیر نمی‌تواند حساب خودش را غیرفعال کند');
  }

  const selfDemote = await patch(`/users/${made.me.id}/role`, { role: 'VIEWER' });
  if (selfDemote.status === 200) {
    bug('مدیر توانست نقش خودش را به مشاهده‌گر تغییر دهد', 'دسترسی مدیریتی از دست رفت');
    await patch(`/users/${made.me.id}/role`, { role: made.me.role });
  } else if (selfDemote.status !== 403) {
    expectStatus(selfDemote, 422, 'مدیر نمی‌تواند نقش خودش را پایین بیاورد');
  }

  const target = made.users.CONTRIBUTOR;
  if (target) {
    const impact = await get(`/users/${target.id}/offboarding-impact`);
    expectStatus(impact, 200, 'گزارش پیش از خروج');

    const self = await post(`/users/${target.id}/reassign-to/${target.id}`, {});
    if (self.status === 200) bug('واگذاری کار به خودِ همان نفر پذیرفته شد');
    else expectNot500(self, 'واگذاری به خود رد می‌شود');

    const reassign = await post(`/users/${target.id}/reassign-to/${made.me.id}`, {});
    expectStatus(reassign, 200, 'واگذاری گروهی کارها');

    const reset = await post(`/users/${target.id}/reset-password`, {});
    if (expectStatus(reset, [200, 201], 'بازنشانی رمز توسط مدیر')) {
      if (!reset.body?.temporaryPassword) warn('بازنشانی رمز', 'رمز موقت برنگشت');
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
async function scenarioErrorContract() {
  section('۱۲) قرارداد خطا و نشت اطلاعات');

  const notFound = await get('/work-items/ghost');
  const b = notFound.body ?? {};
  if ('code' in b && 'message' in b && 'requestId' in b) pass('قالب خطا مطابق قرارداد است');
  else bug('قالب خطا با قرارداد نمی‌خواند', JSON.stringify(b).slice(0, 140));

  const raw = JSON.stringify(notFound.body ?? {});
  if (/at\s+\w+\s+\(|node_modules|\.ts:\d+|Prisma|Error:/i.test(raw)) {
    bug('Stack trace یا جزئیات داخلی به کلاینت نشت کرده', raw.slice(0, 180));
  } else {
    pass('هیچ Stack trace به کلاینت نشت نمی‌کند');
  }

  if (notFound.headers?.get('x-request-id')) pass('هدر x-request-id ست می‌شود');
  else warn('هدر x-request-id ست نمی‌شود', 'ردیابی خطا در لاگ سخت می‌شود');

  const users = await get('/users');
  if (users.status === 200 && Array.isArray(users.body)) {
    const leaked = users.body.some((u) => 'passwordHash' in u || 'password' in u);
    if (leaked) bug('هش رمز در پاسخ /users برمی‌گردد');
    else pass('هش رمز در پاسخ /users نیست');
  }
}

// ══════════════════════════════════════════════════════════════════════
function report() {
  const by = (s) => results.filter((r) => r.status === s);
  const bugs = by('bug');
  const warns = by('warn');

  console.log(`\n${C.bold}${'─'.repeat(62)}${C.reset}`);
  console.log(`${C.bold}خلاصه${C.reset}`);
  console.log(
    `  ${C.green}پاس: ${by('pass').length}${C.reset}   ` +
    `${C.red}باگ: ${bugs.length}${C.reset}   ` +
    `${C.yellow}هشدار: ${warns.length}${C.reset}   ` +
    `${C.dim}رد شده: ${by('skip').length}${C.reset}`,
  );

  if (bugs.length) {
    console.log(`\n${C.red}${C.bold}باگ‌های تأییدشده روی سایت زنده${C.reset}`);
    bugs.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.group}] ${r.name}`);
      if (r.detail) console.log(`     ${C.dim}${r.detail}${C.reset}`);
    });
  }
  if (warns.length) {
    console.log(`\n${C.yellow}${C.bold}هشدارها${C.reset}`);
    warns.forEach((r, i) => console.log(`  ${i + 1}. [${r.group}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`));
  }

  if (!READ_ONLY) {
    console.log(`\n${C.dim}داده‌ی ساخته‌شده (با پیشوند [E2E] در رابط کاربری قابل شناسایی است):${C.reset}`);
    console.log(`${C.dim}  پروژه: ${Object.keys(made.projects).join(', ') || '—'}${C.reset}`);
    console.log(`${C.dim}  کاربر: ${Object.keys(made.users).length} حساب${C.reset}`);
    console.log(`${C.dim}  کار: ${Object.keys(made.items).length} مورد${C.reset}`);
    console.log(`${C.dim}این محصول مسیر حذف ندارد؛ پاک‌سازی باید دستی یا با restore بکاپ انجام شود.${C.reset}`);
  }

  console.log('');
  process.exit(bugs.length ? 1 : 0);
}

// ══════════════════════════════════════════════════════════════════════
(async () => {
  console.log(`${C.bold}Taski — تست سناریوهای واقعی${C.reset}`);
  console.log(`${C.dim}هدف: ${BASE}${C.reset}`);
  console.log(`${C.dim}حساب: ${USERNAME}${C.reset}`);
  if (READ_ONLY) console.log(`${C.yellow}حالت read-only — هیچ داده‌ای ساخته نمی‌شود${C.reset}`);
  else console.log(`${C.yellow}⚠ این اجرا داده‌ی واقعی می‌سازد و این محصول مسیر حذف ندارد.${C.reset}`);

  await scenarioHealthAndAuth();
  await scenarioValidation();
  await scenarioBuildWorld();
  await scenarioWorkItems();
  await scenarioStateMachine();
  await scenarioCommitments();
  await scenarioTrackedChanges();
  await scenarioHealthAndComments();
  await scenarioFiltersAndAnalytics();
  await scenarioPermissions();
  await scenarioAdminGuards();
  await scenarioErrorContract();

  report();
})().catch((e) => {
  console.error(`\n${C.red}اسکریپت با خطای غیرمنتظره متوقف شد:${C.reset}`, e);
  process.exit(2);
});
