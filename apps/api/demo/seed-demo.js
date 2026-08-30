const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { prisma, users, teams, projects, items } = require('./server');

const ORG = 'org-iranpeymex';
const admin = { id: 'admin-1', role: 'ORG_OWNER', organizationId: ORG };

async function main() {
  if (await prisma.organization.findUnique({ where: { id: ORG } })) {
    console.log('داده از قبل وجود دارد.'); return;
  }
  await prisma.organization.create({ data: { id: ORG, name: 'ایران پیمکس', timezone: 'Asia/Tehran' } });
  await prisma.user.create({ data: {
    id: admin.id, organizationId: ORG, fullName: 'مدیر سیستم', username: 'admin',
    passwordHash: await bcrypt.hash('Admin-Strong-1', 10), role: 'ORG_OWNER', status: 'ACTIVE',
    mustChangePassword: false, jobTitle: 'مدیرعامل', weeklyCapacityHours: 40, createdAt: new Date(),
  }});

  const teamIds = {};
  for (const n of ['Backend', 'Frontend', 'Marketing & Growth', 'Design & Content']) {
    teamIds[n] = (await teams.create(admin, n)).id;
  }

  const roster = [
    ['خانم ترابی', 'هد بک‌اند', 'TEAM_LEAD', 'Backend'],
    ['آقای گلی', 'کارشناس بک‌اند', 'CONTRIBUTOR', 'Backend'],
    ['آقای دلیری', 'هد فرانت', 'TEAM_LEAD', 'Frontend'],
    ['آقای میلاد نیکروان', 'ارشد بازاریابی', 'CONTRIBUTOR', 'Marketing & Growth'],
    ['خانم مقدم', 'دیزاینر و تولید محتوا', 'CONTRIBUTOR', 'Design & Content'],
  ];
  const ids = {};
  for (const [i, [name, title, role, team]] of roster.entries()) {
    const r = await users.create(admin, {
      fullName: name, jobTitle: title,
      role, primaryTeamId: teamIds[team],
    });
    ids[name] = r.id;
    console.log(`${name.padEnd(22)} → ${r.temporaryPassword}`);
  }
  await teams.setLead(admin, teamIds['Backend'], ids['خانم ترابی']);
  await teams.setLead(admin, teamIds['Frontend'], ids['آقای دلیری']);

  const project = await projects.create(admin, {
    key: 'IPX', name: 'IranPeymex', description: 'پلتفرم اصلی ایران پیمکس',
    ownerId: ids['خانم ترابی'], targetDate: '2026-12-20T00:00:00Z',
  });
  for (const n of Object.values(ids)) await projects.addMember(admin, project.id, n);

  const site = await projects.create(admin, {
    key: 'WEB', name: 'بازطراحی وب‌سایت', description: 'سایت جدید شرکت',
    ownerId: ids['آقای دلیری'], targetDate: '2026-10-30T00:00:00Z',
  });

  const lead = { id: ids['خانم ترابی'], role: 'TEAM_LEAD', organizationId: ORG };
  const tasks = [
    ['طراحی API سفارش‌گذاری', project.id, 'FEATURE', 'PRODUCT', 'P0', ids['خانم ترابی'], ids['آقای گلی'], true],
    ['رفع باگ درگاه پرداخت', project.id, 'BUG', 'SUPPORT', 'P0', ids['آقای گلی'], ids['آقای گلی'], false],
    ['مهاجرت به نسخه جدید فریم‌ورک', project.id, 'TECH_DEBT', 'TECH_DEBT', 'P2', ids['خانم ترابی'], ids['آقای گلی'], true],
    ['صفحه گزارش‌های مدیریتی', project.id, 'FEATURE', 'PRODUCT', 'P1', ids['آقای دلیری'], ids['آقای دلیری'], true],
    ['طراحی صفحه اصلی سایت', site.id, 'TASK', 'PRODUCT', 'P1', ids['آقای دلیری'], ids['خانم مقدم'], false],
    ['کمپین معرفی محصول', site.id, 'TASK', 'PRODUCT', 'P2', ids['آقای میلاد نیکروان'], ids['آقای میلاد نیکروان'], false],
    ['بازنگری قرارداد سرور', null, 'TASK', 'INFRASTRUCTURE', 'P2', ids['آقای میلاد نیکروان'], null, false],
  ];
  const made = [];
  for (const [title, pid, type, stream, prio, owner, assignee, review] of tasks) {
    made.push(await items.create(lead, {
      title, projectId: pid, workType: type, workStream: stream, priority: prio,
      ownerId: owner, primaryAssigneeId: assignee, reviewerId: review ? ids['خانم ترابی'] : null,
      requiresReview: review,
    }));
  }

  // چرخه واقعی: تعهد، تغییر تاریخ با علت، پیشرفت، مسدودی
  const goli = { id: ids['آقای گلی'], role: 'CONTRIBUTOR', organizationId: ORG };
  await items.changeCommitment(goli, made[0].id, {
    newEta: '2026-09-15T00:00:00Z', newEstimateHours: 24, confidence: 'MEDIUM',
    assumptions: 'با فرض آماده بودن مستندات درگاه', reasonType: 'RE_ESTIMATION',
  });
  await items.changeCommitment(goli, made[0].id, {
    newEta: '2026-09-22T00:00:00Z', reasonType: 'DEPENDENCY', reasonText: 'منتظر تحویل طراحی',
  });
  await items.changeCommitment(goli, made[0].id, {
    newEta: '2026-09-19T00:00:00Z', reasonType: 'RE_ESTIMATION', reasonText: 'بخشی از کار حذف شد',
  });
  await items.changeState(goli, made[0].id, 'READY');
  await items.changeState(goli, made[0].id, 'IN_PROGRESS');
  await items.addComment(goli, made[0].id, 'اسکیمای دیتابیس آماده شد، در حال پیاده‌سازی endpointها.');

  await items.changeState(goli, made[1].id, 'IN_PROGRESS');
  await items.changeHealth(goli, made[1].id, 'BLOCKED', 'منتظر پاسخ پشتیبانی بانک');
  await items.changeCommitment(goli, made[1].id, {
    newEta: '2026-09-05T00:00:00Z', newEstimateHours: 6, confidence: 'LOW', reasonType: 'BLOCKER',
  });

  const daliri = { id: ids['آقای دلیری'], role: 'TEAM_LEAD', organizationId: ORG };
  await items.changeState(daliri, made[3].id, 'IN_PROGRESS');
  await items.changeState(daliri, made[3].id, 'IN_REVIEW');
  await items.changeCommitment(daliri, made[3].id, {
    newEta: '2026-09-10T00:00:00Z', newEstimateHours: 16, confidence: 'HIGH', reasonType: 'RE_ESTIMATION',
  });

  const moghadam = { id: ids['خانم مقدم'], role: 'CONTRIBUTOR', organizationId: ORG };
  await items.changeState(moghadam, made[4].id, 'IN_PROGRESS');
  await items.changeHealth(moghadam, made[4].id, 'AT_RISK', 'محتوای متنی هنوز نرسیده');

  await items.changeState(daliri, made[5].id, 'READY');

  console.log('\nادمین: admin / Admin-Strong-1');
  console.log(`پروژه‌ها: IPX (IranPeymex)، WEB / کارها: ${made.length}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
