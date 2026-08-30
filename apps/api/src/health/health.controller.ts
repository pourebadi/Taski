import { Controller, Get } from '@nestjs/common';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/jwt.guard';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let database = 'down';
    let disk = 'down';
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      database = 'up';
    } catch { /* down */ }
    try {
      const probe = join(process.cwd(), 'data', '.write-probe');
      writeFileSync(probe, 'ok');
      unlinkSync(probe);
      disk = 'writable';
    } catch { /* down */ }
    return { status: database === 'up' && disk === 'writable' ? 'ok' : 'degraded', database, disk, time: new Date().toISOString() };
  }
}
