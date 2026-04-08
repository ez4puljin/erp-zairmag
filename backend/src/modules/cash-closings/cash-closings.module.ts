import { Module } from '@nestjs/common';
import { CashClosingsController } from './cash-closings.controller';
import { CashClosingsService } from './cash-closings.service';

@Module({
  controllers: [CashClosingsController],
  providers: [CashClosingsService],
})
export class CashClosingsModule {}
