import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** PRAGMAهای اجباری SQLite. (D-006) */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('Prisma');

  async onModuleInit() {
    await this.$connect();
    // PRAGMAهایی که مقدار برمی‌گردانند باید با queryRawUnsafe اجرا شوند.
    await this.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await this.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
    await this.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
    await this.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    this.logger.log('SQLite pragmas applied: WAL, busy_timeout=5000, foreign_keys=ON, synchronous=NORMAL');
  }
}
