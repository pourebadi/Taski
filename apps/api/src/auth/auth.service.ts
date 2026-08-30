import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors';

const GENERIC_LOGIN_ERROR = 'نام‌کاربری یا رمز عبور نادرست است.';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(username: string, password: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });

    // پیام یکسان برای کاربر ناموجود و رمز غلط تا وجود حساب افشا نشود. (PM-A3)
    if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', GENERIC_LOGIN_ERROR);
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      await this.audit(user.id, 'LOGIN_FAILED');
      throw new AppError(401, 'INVALID_CREDENTIALS', GENERIC_LOGIN_ERROR);
    }
    if (user.status !== 'ACTIVE') {
      throw new AppError(403, 'USER_INACTIVE', 'حساب شما فعال نیست. با مدیر سیستم تماس بگیرید.');
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, org: user.organizationId },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: (process.env.ACCESS_TOKEN_TTL ?? '15m') as any },
    );

    const refreshToken = randomUUID() + randomUUID();
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 14);
    await this.prisma.session.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        userAgent: userAgent ?? null,
        expiresAt: new Date(Date.now() + days * 86400_000),
      },
    });

    await this.audit(user.id, 'LOGIN_SUCCESS');

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async refresh(refreshToken?: string | null) {
    // بدون کوکی، hashToken قبلاً TypeError می‌داد و به‌جای ۴۰۱ یک ۵۰۰ برمی‌گشت.
    if (!refreshToken) {
      throw new AppError(401, 'SESSION_EXPIRED', 'نشست شما منقضی شده است. دوباره وارد شوید.');
    }
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: this.hashToken(refreshToken), revokedAt: null },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      throw new AppError(401, 'SESSION_EXPIRED', 'نشست شما منقضی شده است. دوباره وارد شوید.');
    }
    if (session.user.status !== 'ACTIVE') {
      throw new AppError(403, 'USER_INACTIVE', 'حساب شما فعال نیست.');
    }
    const accessToken = await this.jwt.signAsync(
      { sub: session.userId, role: session.user.role, org: session.user.organizationId },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: (process.env.ACCESS_TOKEN_TTL ?? '15m') as any },
    );
    // فرانت پس از رفرش صفحه به مشخصات کاربر هم نیاز دارد تا نشست را بازسازی کند.
    return {
      accessToken,
      user: {
        id: session.user.id,
        fullName: session.user.fullName,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role,
        mustChangePassword: session.user.mustChangePassword,
      },
    };
  }

  async logout(refreshToken?: string | null) {
    if (!refreshToken) return { ok: true };
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentRefreshToken?: string | null,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'کاربر پیدا نشد.');
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new AppError(422, 'INVALID_CREDENTIALS', 'رمز عبور فعلی نادرست است.');
    }
    if (newPassword.length < 10 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new AppError(422, 'WEAK_PASSWORD', 'رمز عبور باید حداقل ۱۰ کاراکتر و شامل حرف و عدد باشد.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: false },
    });
    // خروج از همه نشست‌های *دیگر*. نشست جاری باید زنده بماند وگرنه کاربر
    // بلافاصله بعد از تغییر رمز و انقضای access token بیرون انداخته می‌شود.
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(currentRefreshToken
          ? { refreshTokenHash: { not: this.hashToken(currentRefreshToken) } }
          : {}),
      },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  /** بازیابی کاربر جاری از روی توکن — برای بازسازی نشست بعد از رفرش صفحه. */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'کاربر پیدا نشد.');
    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }

  private async audit(actorId: string, action: string) {
    await this.prisma.auditEvent.create({
      data: { id: randomUUID(), actorId, entityType: 'USER', entityId: actorId, action },
    });
  }
}
