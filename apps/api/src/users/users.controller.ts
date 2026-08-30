import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { RequirePermission } from '../authorization/permission.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermission('user.read')
  @Get()
  list(@Req() req: any) {
    return this.users.list(req.user);
  }

  @RequirePermission('user.manage')
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.users.create(req.user, body);
  }

  @RequirePermission('user.manage')
  @Patch(':id/role')
  changeRole(@Req() req: any, @Param('id') id: string, @Body() body: { role: any }) {
    return this.users.changeRole(req.user, id, body.role);
  }

  @RequirePermission('user.manage')
  @Patch(':id/status')
  changeStatus(@Req() req: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.users.changeStatus(req.user, id, body.status);
  }

  @RequirePermission('user.manage')
  @Post(':id/reset-password')
  resetPassword(@Req() req: any, @Param('id') id: string) {
    return this.users.resetPassword(req.user, id);
  }

  @RequirePermission('user.manage')
  @Get(':id/offboarding-impact')
  impact(@Req() req: any, @Param('id') id: string) {
    return this.users.offboardingImpact(req.user, id);
  }

  @RequirePermission('user.manage')
  @Post(':id/reassign-to/:targetId')
  reassign(@Req() req: any, @Param('id') id: string, @Param('targetId') targetId: string) {
    return this.users.reassignAll(req.user, id, targetId);
  }
}
