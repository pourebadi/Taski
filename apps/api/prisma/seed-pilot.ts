/**
 * Seed پایلوت: ادمین + پنج عضو تیم + تیم‌ها + پروژه IranPeymex.
 * در پایان یک فایل `CREDENTIALS.md` می‌سازد که می‌توانی رمزها را از رویش تحویل بدهی.
 *
 * اجرا: npm run seed:pilot
 * دوباره اجرا کنی؟ چیزی خراب نمی‌شود — کاربر تکراری ساخته نمی‌شود.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const ORG_ID = 'org-default';

const TEAMS = ['Backend', 'Frontend', 'Marketing & Growth', 'Design & Content'];

type Member = {
  fullName: string;
  username: string;
  jobTitle: string;
  role: string;
  team: string;
  capacity: number;
};

const MEMBERS: Member[] = [
  { fullName: 'خانم ترابی', username: 'torabi', jobTitle: 'هد بک‌اند', role: 'TEAM_LEAD', team: 'Backend', capacity: 30 },
  { fullName: 'آقای گلی', username: 'goli', jobTitle: 'کارشناس بک‌اند', role: 'CONTRIBUTOR', team: 'Backend', capacity: 36 },
  { fullName: 'آقای دلیری', username: 'daliri', jobTitle: 'هد فرانت', role: 'TEAM_LEAD', team: 'Frontend', capacity: 30 },
  { fullName: 'آقای میلاد نیکروان', username: 'nikravan', jobTitle: 'ارشد بازاریابی', role: 'CONTRIBUTOR', team: 'Marketing & Growth', capacity: 32 },
  { fullName: 'خانم مقدم', username: 'moghadam', jobTitle: 'دیزاینر و تولید محتوا', role: 'CONTRIBUTOR', team: 'Design & Content', capacity: 32 },
];

/** رمز خوانا ولی قوی: قابل خواندن روی تلفن، بدون کاراکتر گیج‌کننده */
function makePassword(): string {
  const words = ['Ahan', 'Sabz', 'Kavir', 'Paya', 'Rahno', 'Simin', 'Tabesh', 'Nilgun', 'Arman', 'Shahd'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = 100 + Math.floor(Math.random() * 899);
  const s = randomBytes(2).toString('hex');
  return `${w}-${n}-${s}`;
}

const ROLE_FA: Record<string, string> = {
  ORG_OWNER: 'مالک سازمان',
  ADMIN: 'مدیر سیستم',
  PROJECT_MANAGER: 'مدیر پروژه',
  TEAM_LEAD: 'سرپرست تیم',
  CONTRIBUTOR: 'عضو اجرایی',
  REQUESTER: 'درخواست‌دهنده',
  VIEWER: 'مشاهده‌گر',
};

async function main() {
  const created: { name: string; username: string; password: string; role: string; job: string; team: string }[] = [];

  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: 'ایران پیمکس',
      timezone: 'Asia/Tehran',
      weekStart: 'SATURDAY',
      workingDays: 'SAT,SUN,MON,TUE,WED,THU',
    },
  });

  const teamIds: Record<string, string> = {};
  for (const name of TEAMS) {
    const existing = await prisma.team.findFirst({ where: { organizationId: ORG_ID, name } });
    teamIds[name] = existing
      ? existing.id
      : (await prisma.team.create({ data: { id: randomUUID(), organizationId: ORG_ID, name } })).id;
  }

  // ادمین اصلی
  const adminUsername = (process.env.ADMIN_USERNAME ?? 'admin').toLowerCase();
  let admin = await prisma.user.findUnique({ where: { username: adminUsername } });
  if (!admin) {
    const password = process.env.ADMIN_PASSWORD ?? makePassword();
    admin = await prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId: ORG_ID,
        fullName: process.env.ADMIN_NAME ?? 'مدیر سیستم',
        username: adminUsername,
        passwordHash: await bcrypt.hash(password, 10),
        jobTitle: 'مدیرعامل',
        role: 'ORG_OWNER',
        status: 'ACTIVE',
        mustChangePassword: false,
        weeklyCapacityHours: 20,
      },
    });
    created.push({ name: admin.fullName, username: adminUsername, password, role: 'ORG_OWNER', job: 'مدیرعامل', team: '—' });
  } else {
    console.log('ادمین از قبل وجود دارد؛ رمزش دست نخورد.');
  }

  // مدیر پشتیبان — قانون «حداقل دو مدیر»
  const backupUsername = 'admin2';
  if (!(await prisma.user.findUnique({ where: { username: backupUsername } }))) {
    const password = makePassword();
    const backup = await prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId: ORG_ID,
        fullName: 'مدیر پشتیبان',
        username: backupUsername,
        passwordHash: await bcrypt.hash(password, 10),
        jobTitle: 'مدیر پشتیبان سیستم',
        role: 'ADMIN',
        status: 'ACTIVE',
        mustChangePassword: true,
        weeklyCapacityHours: 10,
      },
    });
    created.push({ name: backup.fullName, username: backupUsername, password, role: 'ADMIN', job: 'مدیر پشتیبان سیستم', team: '—' });
  }

  // اعضای تیم
  for (const m of MEMBERS) {
    if (await prisma.user.findUnique({ where: { username: m.username } })) {
      console.log(`${m.fullName} از قبل وجود دارد؛ رد شد.`);
      continue;
    }
    const password = makePassword();
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId: ORG_ID,
        fullName: m.fullName,
        username: m.username,
        passwordHash: await bcrypt.hash(password, 10),
        jobTitle: m.jobTitle,
        role: m.role,
        status: 'ACTIVE',
        mustChangePassword: true,
        primaryTeamId: teamIds[m.team],
        weeklyCapacityHours: m.capacity,
      },
    });
    await prisma.teamMember.create({ data: { id: randomUUID(), teamId: teamIds[m.team], userId: user.id } });
    created.push({ name: m.fullName, username: m.username, password, role: m.role, job: m.jobTitle, team: m.team });

    if (m.role === 'TEAM_LEAD') {
      await prisma.team.update({ where: { id: teamIds[m.team] }, data: { leadId: user.id } });
    }
  }

  // پروژه اصلی
  if (!(await prisma.project.findFirst({ where: { organizationId: ORG_ID, key: 'IPX' } }))) {
    const owner = await prisma.user.findUnique({ where: { username: 'torabi' } });
    const project = await prisma.project.create({
      data: {
        id: randomUUID(),
        organizationId: ORG_ID,
        key: 'IPX',
        name: 'IranPeymex',
        nameNormalized: 'iranpeymex',
        description: 'پلتفرم اصلی ایران پیمکس',
        status: 'ACTIVE',
        ownerId: owner?.id,
      },
    });
    const all = await prisma.user.findMany({ where: { organizationId: ORG_ID } });
    for (const u of all) {
      await prisma.projectMember.create({
        data: { id: randomUUID(), projectId: project.id, userId: u.id, role: u.id === owner?.id ? 'PROJECT_LEAD' : 'MEMBER' },
      });
    }
  }

  if (created.length === 0) {
    console.log('همه‌چیز از قبل ساخته شده بود. فایل رمز جدیدی ساخته نشد.');
    return;
  }

  writeFileSync(join(process.cwd(), '..', '..', 'CREDENTIALS.md'), buildCredentialsFile(created), 'utf8');
  console.log(`\n${created.length} حساب ساخته شد. رمزها در CREDENTIALS.md نوشته شد.`);
  console.log('این فایل را بعد از تحویل رمزها پاک کن. در .gitignore هست و commit نمی‌شود.');
}

function buildCredentialsFile(rows: { name: string; username: string; password: string; role: string; job: string; team: string }[]) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = rows
    .map(
      (r) => `### ${r.name}

| | |
|---|---|
| **نام‌کاربری** | \`${r.username}\` |
| **رمز** | \`${r.password}\` |
| سمت سازمانی | ${r.job} |
| نقش نرم‌افزاری | ${ROLE_FA[r.role] ?? r.role} |
| تیم | ${r.team} |
`,
    )
    .join('\n');

  return `# رمزهای ورود — ایران پیمکس

> ساخته شده در ${date}
> **این فایل را بعد از تحویل رمزها پاک کن.** در \`.gitignore\` هست، پس روی گیت‌هاب نمی‌رود.

هر کسی به‌جز ادمین اصلی، در اولین ورود مجبور می‌شود رمزش را عوض کند. رمز جدید باید حداقل ۱۰ کاراکتر باشد و هم حرف داشته باشد هم عدد.

---

${lines}
---

## اگر کسی رمزش را گم کرد

از بخش «مدیریت» رویش کلیک کن و رمز موقت جدید بگیر.

اگر خود ادمین قفل شد، از ترمینال سرور:

\`\`\`bash
npm run admin:reset-password -- --username=admin
\`\`\`

## چرا دو مدیر داریم؟

چون بازیابی رمز خودکار نداریم. اگر تنها مدیر رمزش را گم کند یا در دسترس نباشد، کل سازمان قفل می‌شود. سیستم اجازه نمی‌دهد آخرین مدیر فعال را غیرفعال کنی.
`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
