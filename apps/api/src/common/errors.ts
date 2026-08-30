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
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp ? (exception.getResponse() as any) : null;

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

export class AppError extends HttpException {
  constructor(status: number, code: string, message: string, details?: unknown) {
    super({ code, message, details }, status);
  }
}
