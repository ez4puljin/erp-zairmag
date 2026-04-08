import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReceivablesService } from './receivables.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/receivables')
export class ReceivablesController {
  constructor(private readonly service: ReceivablesService) {}

  // GET /api/receivables/summary - All customers receivable summary
  @Get('summary')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async getSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('customerId') customerId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.getReceivablesSummary(dateFrom, dateTo, customerId, categoryId);
  }

  // GET /api/receivables/aging - Debt aging report
  @Get('aging')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  getDebtAging() {
    return this.service.getDebtAging();
  }

  // GET /api/receivables/:customerId - Customer ledger with debit/credit
  @Get(':customerId')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async getCustomerLedger(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getCustomerLedger(customerId, dateFrom, dateTo);
  }
}
