import { Module } from '@nestjs/common';
import { SupplierPayablesController } from './supplier-payables.controller';
import { SupplierPayablesService } from './supplier-payables.service';

@Module({
  controllers: [SupplierPayablesController],
  providers: [SupplierPayablesService],
})
export class SupplierPayablesModule {}
