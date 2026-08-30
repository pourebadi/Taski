import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaService } from './prisma/prisma.service';
import { WorkingCalendarService } from './calendar/working-calendar.service';
import { KeySequenceService } from './key-sequence/key-sequence.service';
import { WorkItemsService } from './work-items/work-items.service';
import { WorkItemsController } from './work-items/work-items.controller';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { JwtGuard } from './auth/jwt.guard';
import { PermissionGuard } from './authorization/permission.guard';
import { UsersService } from './users/users.service';
import { UsersController } from './users/users.controller';
import { TeamsService } from './teams/teams.service';
import { TeamsController } from './teams/teams.controller';
import { ProjectsService } from './projects/projects.service';
import { ProjectsController } from './projects/projects.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { SchedulerService } from './scheduler/scheduler.service';
import { HealthController } from './health/health.controller';
import { RequestIdMiddleware } from './common/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    // سرو کردن build فرانت از همان رانتایم — تک‌اپ. (معماری قفل‌شده)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web', 'dist'),
      exclude: ['/api/{*splat}'],
    }),
  ],
  controllers: [
    AuthController,
    UsersController,
    TeamsController,
    ProjectsController,
    WorkItemsController,
    AnalyticsController,
    HealthController,
  ],
  providers: [
    PrismaService,
    WorkingCalendarService,
    KeySequenceService,
    WorkItemsService,
    AuthService,
    UsersService,
    TeamsService,
    ProjectsService,
    AnalyticsService,
    SchedulerService,
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
