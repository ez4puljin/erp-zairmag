import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { UPLOADS_ROOT, ensureUploadDirs } from './config/uploads';

/**
 * CORS_ORIGINS-д бичсэн утгатай тохирч байгаа эсэх.
 *
 * Яг таарах хаягаас гадна `*.vercel.app` хэлбэрийн дэд домэйн загварыг
 * дэмжинэ — Vercel-ийн preview deploy бүр өөр дэд домэйн авдаг тул.
 */
function matchesAllowedOrigin(origin: string, pattern: string): boolean {
  if (pattern === origin) return true;
  if (!pattern.startsWith('*.')) return false;
  try {
    const host = new URL(origin).hostname;
    const suffix = pattern.slice(1); // "*.vercel.app" → ".vercel.app"
    return host.endsWith(suffix);
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS - allow admin frontend, local dev, LAN access (mobile devices), and Tailscale (100.64.0.0/10)
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      // Allow localhost and any private/LAN IP and Tailscale CGNAT range (100.64.x.x - 100.127.x.x)
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        /^https?:\/\/(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(
          origin,
        ) ||
        /^https?:\/\/100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(origin)
      ) {
        return callback(null, true);
      }
      // Allow configured origins (яг таарах эсвэл *.domain.com загвар)
      const extra = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      if (extra.some((pattern) => matchesAllowedOrigin(origin, pattern))) {
        return callback(null, true);
      }
      callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Serve uploaded files (үүлэн орчинд байнгын дискний зам байж болно)
  ensureUploadDirs();
  app.useStaticAssets(UPLOADS_ROOT, { prefix: '/uploads' });

  const port = process.env.PORT ?? 3000;
  // Bind to 0.0.0.0 explicitly so Tailscale / LAN devices can reach this server
  await app.listen(Number(port), '0.0.0.0');
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  console.log(`   Local:    http://localhost:${port}`);
  // Print accessible IPs (LAN + Tailscale)
  try {
    const os = require('os');
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`   Network:  http://${net.address}:${port}  (${name})`);
        }
      }
    }
  } catch {}
}
bootstrap();
