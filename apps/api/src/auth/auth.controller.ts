import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './jwt.guard';
import { parseOrThrow, LoginSchema, ChangePasswordSchema } from '../common/validation';

const COOKIE = 'peos_refresh';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: unknown, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const input = parseOrThrow(LoginSchema, body);
    const result = await this.auth.login(input.email, input.password, req.headers['user-agent']);
    res.cookie(COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 14) * 86400_000,
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  refresh(@Req() req: any) {
    return this.auth.refresh(req.cookies?.[COOKIE]);
  }

  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    await this.auth.logout(req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE);
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }

  @Post('change-password')
  changePassword(@Req() req: any, @Body() body: unknown) {
    const input = parseOrThrow(ChangePasswordSchema, body);
    return this.auth.changePassword(
      req.user.id,
      input.currentPassword,
      input.newPassword,
      req.cookies?.[COOKIE],
    );
  }
}
