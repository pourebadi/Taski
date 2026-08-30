/**
 * سرور آزمایشی: همان کنترلرها و سرویس‌های واقعی، اما روی هارنس node:sqlite
 * به‌جای پریسما (چون موتور پریسما در این محیط قابل دانلود نیست).
 * فقط برای دمو و بازرسی دستی. در محیط واقعی `npm start` استفاده می‌شود.
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const { randomUUID, createHash } = require('crypto');
const path = require('path');

const { HarnessPrisma } = require('./harness-runtime');
const { UsersService } = require('./compiled/users.service');
const { TeamsService } = require('./compiled/teams.service');
const { ProjectsService } = require('./compiled/projects.service');
const { WorkItemsService } = require('./compiled/work-items.service');
const { KeySequenceService } = require('./compiled/key-sequence.service');
const wd = require('./compiled/working-days');
const { can } = require('./compiled/permissions');

const DB = path.join(__dirname, 'demo-data', 'app.db');
const prisma = new HarnessPrisma(DB);

const calendar = {
  loadHolidays: async () => new Set(),
  countWorkingDays: wd.countWorkingDays,
  addWorkingDays: wd.addWorkingDays,
  isWorkingDay: wd.isWorkingDay,
};

const users = new UsersService(prisma);
const teams = new TeamsService(prisma);
const projects = new ProjectsService(prisma);
const items = new WorkItemsService(prisma, new KeySequenceService(), calendar);

const app = express();
app.use(express.json());
app.use(cookieParser());

const tokens = new Map();

function actorFrom(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  return tokens.get(token) || null;
}

// قرارداد خطای یکسان با پیام فارسی
function wrap(handler, permission) {
  return async (req, res) => {
    const actor = actorFrom(req);
    if (!actor) return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'برای این عملیات باید وارد شوید.' });
    if (permission && !can(actor.role, permission)) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'برای انجام این عملیات دسترسی ندارید.' });
    }
    try {
      res.json(await handler(actor, req));
    } catch (e) {
      const status = e.status || (e.getStatus && e.getStatus()) || 400;
      const body = e.response || { code: 'ERROR', message: e.message };
      res.status(typeof status === 'number' ? status : 400).json(body);
    }
  };
}

app.post('/api/v1/auth/login', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: String(req.body.email || '').toLowerCase() } });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) {
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'ایمیل یا رمز عبور نادرست است.' });
  }
  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ code: 'USER_INACTIVE', message: 'حساب شما فعال نیست.' });
  }
  const token = randomUUID();
  tokens.set(token, { id: user.id, role: user.role, organizationId: user.organizationId });
  res.json({
    accessToken: token,
    user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, mustChangePassword: false },
  });
});

app.post('/api/v1/auth/logout', (req, res) => res.json({ ok: true }));
app.post('/api/v1/auth/refresh', (req, res) => res.status(401).json({ code: 'SESSION_EXPIRED', message: 'نشست منقضی شد.' }));

app.get('/api/v1/users', wrap((a) => users.list(a), 'user.read'));
app.post('/api/v1/users', wrap((a, r) => users.create(a, r.body), 'user.manage'));
app.patch('/api/v1/users/:id/status', wrap((a, r) => users.changeStatus(a, r.params.id, r.body.status), 'user.manage'));

app.get('/api/v1/teams', wrap((a) => teams.list(a), 'user.read'));
app.get('/api/v1/projects', wrap((a) => projects.list(a), 'project.read'));
app.post('/api/v1/projects', wrap((a, r) => projects.create(a, r.body), 'project.create'));

app.get('/api/v1/work-items/my-work', wrap((a) => items.myWork(a), 'workitem.read'));
app.get('/api/v1/work-items/search', wrap((a, r) => items.search(a, r.query.q || ''), 'workitem.read'));
app.get('/api/v1/work-items/:id/schedule-metrics', wrap((a, r) => items.scheduleMetrics(a, r.params.id), 'workitem.read'));
app.get('/api/v1/work-items/:id', wrap((a, r) => items.detail(a, r.params.id), 'workitem.read'));
app.get('/api/v1/work-items', wrap((a, r) => items.list(a, r.query), 'workitem.read'));
app.post('/api/v1/work-items', wrap((a, r) => items.create(a, r.body), 'workitem.create'));
app.patch('/api/v1/work-items/:id', wrap((a, r) => items.update(a, r.params.id, r.body), 'workitem.update'));
app.patch('/api/v1/work-items/:id/state', wrap((a, r) => items.changeState(a, r.params.id, r.body.state), 'workitem.update'));
app.patch('/api/v1/work-items/:id/health', wrap((a, r) => items.changeHealth(a, r.params.id, r.body.health, r.body.note), 'workitem.update'));
app.patch('/api/v1/work-items/:id/commitment', wrap((a, r) => items.changeCommitment(a, r.params.id, r.body), 'workitem.update'));
app.post('/api/v1/work-items/:id/comments', wrap((a, r) => items.addComment(a, r.params.id, r.body.body), 'workitem.update'));

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', database: 'up', disk: 'writable' }));

const dist = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(dist));
app.get(/.*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));

module.exports = { app, prisma, users, teams, projects, items };

if (require.main === module) {
  app.listen(3000, () => console.log('demo server on http://localhost:3000'));
}
