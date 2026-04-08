import { Module } from '@nestjs/common';
import { ProductLedgerController } from './product-ledger.controller';
import { ProductLedgerService } from './product-ledger.service';

@Module({
  controllers: [ProductLedgerController],
  providers: [ProductLedgerService],
})
export class ProductLedgerModule {}
