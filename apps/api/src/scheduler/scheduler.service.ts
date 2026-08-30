import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { execSync } from 'child_process';
import { readdirSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { WorkItemsService } from '../work-items/work-items.service';

const HOUR = 3600_000;
const AUDIT_RETENTION_DAYS = 180;
const NOTIFICATION_RETENTION_DAYS = 90;
const BACKUP_KEEP = 14;

/**
 * کرون داخلی. بدون Redis یا Queue — یک setInterval ساده روی همان رانتایم.
 * تک‌اینستنس بودن معماری این را امن می‌کند. (D-006، معماری قفل‌شده)
 */
@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Scheduler');
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly workItems: WorkItemsService,
  ) {}

  onModuleInit() {
    if (process.env.DISABLE_SCHEDULER === 'true') {
      this.logger.warn('زمان‌بند غیرفعال است.');
      return;
    }
    // اجرای اولیه با تأخیر تا استارت‌آپ کند نشود
    this.timers.push(setTimeout(() => this.runDaily(), 30_000));
    this.timers.push(setInterval(() => this.runDaily(), 24 * HOUR));
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t as any));
  }

  async runDaily() {
    await this.safe('flagStale', () => this.flagStale());
    await this.safe('backup', () => this.backup());
    await this.safe('purge', () => this.purgeOldRecords());
  }

  private async safe(name: string, fn: () => Promise<unknown>) {
    try {
      const result = await fn();
      this.logger.log(`${name}: ${JSON.stringify(result)}`);
    } catch (e) {
      this.logger.error(`${name} failed: ${String(e)}`);
    }
  }

  /** کار فعال بی‌حرکت خودکار «نامشخص» می‌شود. (D-007) */
  private async flagStale() {
    const orgs = await this.prisma.organization.findMany({ select: { id: true } });
    let total = 0;
    for (const org of orgs) total += await this.workItems.flagStaleItems(org.id);
    return { flagged: total };
  }

  /** بکاپ اتمیک: VACUUM INTO سپس آرشیو فایل‌ها. (D-006، C5) */
  async backup() {
    const dir = join(process.cwd(), 'data', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');

    const dbTarget = join(dir, `app-${stamp}.db`);
    await this.prisma.$executeRawUnsafe(`VACUUM INTO '${dbTarget}'`);

    const uploads = join(process.cwd(), 'data', 'uploads');
    if (existsSync(uploads)) {
      execSync(`tar -czf "${join(dir, `uploads-${stamp}.tar.gz`)}" -C "${join(process.cwd(), 'data')}" uploads`);
    }

    for (const prefix of ['app-', 'uploads-']) {
      const files = readdirSync(dir).filter((f) => f.startsWith(prefix)).sort().reverse();
      files.slice(BACKUP_KEEP).forEach((f) => unlinkSync(join(dir, f)));
    }
    return { stamp };
  }

  /** جدول‌های بی‌کران روی SQLite گزارش‌ها را کند می‌کنند. (شکاف‌های سند ۰۱) */
  private async purgeOldRecords() {
    const auditCutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 86400_000);
    const notifCutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 86400_000);
    const audit = await this.prisma.auditEvent.deleteMany({ where: { createdAt: { lt: auditCutoff } } });
    return { auditDeleted: audit.count, notificationCutoff: notifCutoff.toISOString() };
  }
}
