import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../common/errors';
import { Permission, can } from './permissions';
import { Role } from '../common/constants';

export const RequirePermission = (p: Permission) => SetMetadata('permission', p);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.get<Permission>('permission', ctx.getHandler());
    if (!required) return true;
    const req = ctx.switchToHttp().getRequest();
    const role: Role | undefined = req.user?.role;
    if (!role) throw new AppError(401, 'UNAUTHENTICATED', 'برای این عملیات باید وارد شوید.');
    if (!can(role, required)) {
      throw new AppError(403, 'FORBIDDEN', 'برای انجام این عملیات دسترسی ندارید.');
    }
    return true;
  }
}
