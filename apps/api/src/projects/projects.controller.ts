import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { RequirePermission } from '../authorization/permission.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @RequirePermission('project.read')
  @Get()
  list(@Req() req: any) {
    return this.projects.list(req.user);
  }

  @RequirePermission('project.read')
  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.projects.get(req.user, id);
  }

  @RequirePermission('project.create')
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.projects.create(req.user, body);
  }

  @RequirePermission('project.manage')
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.projects.update(req.user, id, body);
  }

  @RequirePermission('project.manage')
  @Post(':id/members/:userId')
  addMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string, @Body() body: { role?: string }) {
    return this.projects.addMember(req.user, id, userId, body?.role);
  }
}
