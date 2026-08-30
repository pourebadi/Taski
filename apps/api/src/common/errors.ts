import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

/** قرارداد خطای یکسان. هیچ Stack Trace به کلاینت. (PM-E3، CLAUDE.md قانون ۱۰) */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const requestId = req.requestId ?? '-';

    const isHttp = exception instanceof HttpException;
    const prisma = isHttp ? null : mapPrismaError(exception);

    const status = isHttp
      ? exception.getStatus()
      : (prisma?.status ?? HttpStatus.INTERNAL_SERVER_ERROR);
    const payload = isHttp ? (exception.getResponse() as any) : prisma;

    const body = {
      code: payload?.code ?? (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      message: payload?.message ?? 'خطای غیرمنتظره‌ای رخ داد.',
      details: payload?.details ?? null,
      requestId,
    };

    if (status >= 500) {
      this.logger.error({ requestId, path: req.url, err: String(exception) });
    }
    res.status(status).json(body);
  }
}

/**
 * خطاهای شناخته‌شده‌ی پریسما به کد HTTP درست ترجمه می‌شوند.
 * قبلاً همه‌ی این‌ها ۵۰۰ «خطای غیرمنتظره» می‌شدند؛ مثلاً کافی بود
 * ownerId اشتباه بفرستی تا به‌جای ۴۲۲ یک ۵۰۰ بگیری.
 * بدون import از @prisma/client تا این فایل به رانتایم دیتابیس گره نخورد.
 */
function mapPrismaError(exception: unknown): { status: number; code: string; message: string } | null {
  const code = (exception as any)?.code;
  if (typeof code !== 'string' || !code.startsWith('P')) return null;

  switch (code) {
    case 'P2002':
      return { status: 409, code: 'DUPLICATE', message: 'رکوردی با همین مقدار یکتا از قبل وجود دارد.' };
    case 'P2003':
      return {
        status: 422,
        code: 'RELATED_RECORD_NOT_FOUND',
        message: 'یکی از موردهای ارجاع‌داده‌شده (کاربر، پروژه یا تیم) وجود ندارد.',
      };
    case 'P2025':
      return { status: 404, code: 'NOT_FOUND', message: 'رکورد موردنظر پیدا نشد.' };
    case 'P2000':
      return { status: 422, code: 'VALUE_TOO_LONG', message: 'مقدار واردشده بلندتر از حد مجاز است.' };
    default:
      return null;
  }
}

export class AppError extends HttpException {
  constructor(status: number, code: string, message: string, details?: unknown) {
    super({ code, message, details }, status);
  }
}
