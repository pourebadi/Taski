import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';
import { RequirePermission } from '../authorization/permission.guard';

@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly items: WorkItemsService) {}

  @RequirePermission('workitem.create')
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.items.create(req.user, body);
  }

  @RequirePermission('workitem.read')
  @Get()
  list(@Req() req: any, @Query() query: any) {
    return this.items.list(req.user, {
      ...query,
      includeClosed: query.includeClosed === 'true',
    });
  }

  @RequirePermission('workitem.read')
  @Get('my-work')
  myWork(@Req() req: any) {
    return this.items.myWork(req.user);
  }

  @RequirePermission('workitem.read')
  @Get('search')
  search(@Req() req: any, @Query('q') q: string) {
    return this.items.search(req.user, q ?? '');
  }

  @RequirePermission('workitem.read')
  @Get(':id')
  detail(@Req() req: any, @Param('id') id: string) {
    return this.items.detail(req.user, id);
  }

  @RequirePermission('workitem.update')
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.items.update(req.user, id, body);
  }

  @RequirePermission('workitem.update')
  @Post(':id/comments')
  addComment(@Req() req: any, @Param('id') id: string, @Body() body: { body: string }) {
    return this.items.addComment(req.user, id, body.body);
  }

  @RequirePermission('workitem.read')
  @Get(':id/schedule-metrics')
  metrics(@Req() req: any, @Param('id') id: string) {
    return this.items.scheduleMetrics(req.user, id);
  }

  @RequirePermission('workitem.update')
  @Patch(':id/state')
  changeState(@Req() req: any, @Param('id') id: string, @Body() body: { state: any; reasonType?: any; reasonText?: string }) {
    const reason = body.reasonType ? { reasonType: body.reasonType, reasonText: body.reasonText } : undefined;
    return this.items.changeState(req.user, id, body.state, reason);
  }

  @RequirePermission('workitem.update')
  @Patch(':id/health')
  changeHealth(@Req() req: any, @Param('id') id: string, @Body() body: { health: string; note?: string }) {
    return this.items.changeHealth(req.user, id, body.health, body.note);
  }

  /** تنها مسیر تغییر ETA/تخمین. مسیر PATCH عمومی روی این فیلدها عمداً وجود ندارد. */
  @RequirePermission('workitem.update')
  @Patch(':id/commitment')
  changeCommitment(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.items.changeCommitment(req.user, id, body);
  }

  @RequirePermission('workitem.rebaseline')
  @Patch(':id/re-baseline')
  reBaseline(@Req() req: any, @Param('id') id: string, @Body() body: { newBaseline: string; reasonText: string }) {
    return this.items.reBaseline(req.user, id, body.newBaseline, body.reasonText);
  }
}
