import { Controller, Get, Query } from '@nestjs/common';
import { ProductLedgerService } from './product-ledger.service';
import { ProductLedgerQueryDto } from './dto/product-ledger-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/product-ledger')
export class ProductLedgerController {
  constructor(private readonly service: ProductLedgerService) {}

  @Get()
  @Roles('ADMIN')
  async getLedger(@Query() query: ProductLedgerQueryDto) {
    return this.service.getLedger(query);
  }
}
