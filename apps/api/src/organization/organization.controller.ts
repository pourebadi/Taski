import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { RequirePermission } from '../authorization/permission.guard';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly org: OrganizationService) {}

  // هر کسی که بورد را می‌بیند باید چیدمان را بخواند
  @RequirePermission('workitem.read')
  @Get('board-config')
  getBoardConfig(@Req() req: any) {
    return this.org.getBoardConfig(req.user);
  }

  // فقط مدیر (تنظیمات سازمان) چیدمان را تغییر می‌دهد
  @RequirePermission('org.settings')
  @Patch('board-config')
  setBoardConfig(@Req() req: any, @Body() body: unknown) {
    return this.org.setBoardConfig(req.user, body);
  }
}
