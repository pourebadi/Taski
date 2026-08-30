import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/errors';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  process.env.TZ = process.env.TZ ?? 'Asia/Tehran';
  mkdirSync(join(process.cwd(), 'data', 'uploads'), { recursive: true });
  mkdirSync(join(process.cwd(), 'data', 'backups'), { recursive: true });

  // در production رمز پیش‌فرض ممنوع است. (PM-A1)
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      throw new Error('ADMIN_USERNAME و ADMIN_PASSWORD در محیط production اجباری است.');
    }
    if (process.env.ADMIN_PASSWORD === 'Admin12345!') {
      throw new Error('رمز پیش‌فرض در محیط production مجاز نیست. برنامه متوقف شد.');
    }
    // بدون این بررسی، اپ بالا می‌آمد و تازه سر اولین login خطای ۵۰۰ می‌داد.
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error('JWT_ACCESS_SECRET تنظیم نشده است. برنامه متوقف شد.');
    }
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AppExceptionFilter());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(`PE-OS روی پورت ${port} اجرا شد`);
}
bootstrap();
