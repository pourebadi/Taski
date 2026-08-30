import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { RequirePermission } from '../authorization/permission.guard';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @RequirePermission('user.read')
  @Get()
  list(@Req() req: any) {
    return this.teams.list(req.user);
  }

  @RequirePermission('team.manage')
  @Post()
  create(@Req() req: any, @Body() body: { name: string; leadId?: string }) {
    return this.teams.create(req.user, body.name, body.leadId);
  }

  @RequirePermission('team.manage')
  @Patch(':id/lead')
  setLead(@Req() req: any, @Param('id') id: string, @Body() body: { leadId: string }) {
    return this.teams.setLead(req.user, id, body.leadId);
  }

  @RequirePermission('team.manage')
  @Post(':id/members/:userId')
  addMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.teams.addMember(req.user, id, userId);
  }

  @RequirePermission('team.manage')
  @Delete(':id/members/:userId')
  removeMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.teams.removeMember(req.user, id, userId);
  }
}
