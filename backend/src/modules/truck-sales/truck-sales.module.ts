import { Module } from '@nestjs/common';
import { TruckSalesController } from './truck-sales.controller';
import { TruckSalesService } from './truck-sales.service';

@Module({
  controllers: [TruckSalesController],
  providers: [TruckSalesService],
  exports: [TruckSalesService],
})
export class TruckSalesModule {}
