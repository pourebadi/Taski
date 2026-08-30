import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppError } from '../common/errors';

export const Public = () => SetMetadata('isPublic', true);

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.get<boolean>('isPublic', ctx.getHandler())) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHENTICATED', 'برای این عملیات باید وارد شوید.');
    }
    try {
      const payload = await this.jwt.verifyAsync(header.slice(7), {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      req.user = { id: payload.sub, role: payload.role, organizationId: payload.org };
      return true;
    } catch {
      throw new AppError(401, 'TOKEN_INVALID', 'نشست شما معتبر نیست. دوباره وارد شوید.');
    }
  }
}
