import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReceiptSettingsController } from './receipt-settings.controller';
import { ReceiptSettingsService } from './receipt-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReceiptSettingsController],
  providers: [ReceiptSettingsService],
})
export class ReceiptSettingsModule {}
