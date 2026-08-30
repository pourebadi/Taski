import { Controller, Get, Query, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { RequirePermission } from '../authorization/permission.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @RequirePermission('workitem.read')
  @Get('overview')
  overview(@Req() req: any) {
    return this.analytics.overview(req.user);
  }

  @RequirePermission('workitem.read')
  @Get('schedule-stability')
  stability(@Req() req: any, @Query('limit') limit?: string) {
    return this.analytics.scheduleStability(req.user, limit ? Number(limit) : 10);
  }

  @RequirePermission('workitem.read')
  @Get('delay-reasons')
  reasons(@Req() req: any) {
    return this.analytics.delayReasons(req.user);
  }

  /** بار کاری تیم — مجوزش داخل سرویس هم دوباره بررسی می‌شود */
  @RequirePermission('metrics.team.read')
  @Get('team-workload')
  workload(@Req() req: any) {
    return this.analytics.teamWorkload(req.user);
  }

  @RequirePermission('workitem.read')
  @Get('throughput')
  throughput(@Req() req: any, @Query('weeks') weeks?: string) {
    return this.analytics.throughput(req.user, weeks ? Number(weeks) : 8);
  }
}
