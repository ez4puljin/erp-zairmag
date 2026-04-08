import { Module } from '@nestjs/common';
import { TruckLoadsController } from './truck-loads.controller';
import { TruckLoadsService } from './truck-loads.service';

@Module({
  controllers: [TruckLoadsController],
  providers: [TruckLoadsService],
  exports: [TruckLoadsService],
})
export class TruckLoadsModule {}
