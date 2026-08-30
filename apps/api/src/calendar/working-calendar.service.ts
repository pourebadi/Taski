import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as wd from './working-days';

/** تنها مرجع محاسبات زمانی در اپ. منطق خالص در working-days.ts است. (CLAUDE.md قانون ۳) */
@Injectable()
export class WorkingCalendarService {
  private holidayCache = new Map<string, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  async loadHolidays(organizationId: string): Promise<Set<string>> {
    const cached = this.holidayCache.get(organizationId);
    if (cached) return cached;
    const rows = await this.prisma.holiday.findMany({ where: { organizationId } });
    const set = new Set<string>(rows.map((r: { date: Date }) => wd.dayKey(r.date)));
    this.holidayCache.set(organizationId, set);
    return set;
  }

  invalidate(organizationId: string) {
    this.holidayCache.delete(organizationId);
  }

  isWorkingDay = wd.isWorkingDay;
  countWorkingDays = wd.countWorkingDays;
  addWorkingDays = wd.addWorkingDays;
  startOfReportingWeek = wd.startOfReportingWeek;

  async workingDaysBetween(organizationId: string, from: Date, to: Date): Promise<number> {
    return wd.countWorkingDays(from, to, await this.loadHolidays(organizationId));
  }
}
