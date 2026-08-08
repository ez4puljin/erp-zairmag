import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Байршуулалтын платформын эрүүл мэндийн шалгалт (health check).
 *
 * Render энэ замыг тогтмол дуудаж, хариу ирэхгүй бол шинэ хувилбарыг
 * амжилтгүй гэж үзэн өмнөх ажиллаж байсан хувилбарыг үлдээнэ.
 * Database холболтыг ч шалгадаг тул зөвхөн процесс амьд байгаад
 * бус, бодитоор ажиллаж чадаж байгаад л "ok" гэж хариулна.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unreachable',
      });
    }
    return {
      status: 'ok',
      database: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
