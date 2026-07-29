import { Controller, Get, Param, Query, ParseUUIDPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { ReceivablesService } from './receivables.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExcelService } from '../../common/excel/excel.service';

@Controller('api/receivables')
export class ReceivablesController {
  constructor(
    private readonly service: ReceivablesService,
    private readonly excel: ExcelService,
  ) {}

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

  // GET /api/receivables/:customerId/export - Customer ledger as .xlsx
  @Get(':customerId/export')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async exportCustomerLedger(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Res() res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const d = await this.service.getCustomerLedger(customerId, dateFrom, dateTo);
    const buf = this.excel.build([
      {
        name: 'Авлага',
        title: 'Авлагын дэвтэр',
        meta: [
          `Харилцагч: ${d.customer?.storeName ?? ''}`,
          `Хугацаа: ${dateFrom ?? '...'} — ${dateTo ?? '...'}`,
          `Эхний үлдэгдэл: ${d.openingBalance}`,
        ],
        columns: [
          { header: 'Огноо', key: 'date', width: 18 },
          { header: 'Гүйлгээ', key: 'description', width: 30 },
          { header: 'Төлбөр', key: 'paymentMethod', width: 14 },
          { header: 'Дебет', key: 'debit', width: 16 },
          { header: 'Кредит', key: 'credit', width: 16 },
          { header: 'Үлдэгдэл', key: 'balance', width: 18 },
        ],
        rows: d.entries.map((e) => ({ ...e, date: new Date(e.date).toLocaleString('mn-MN') })),
        totals: { description: 'НИЙТ', debit: d.totalDebit, credit: d.totalCredit, balance: d.closingBalance },
      },
    ]);
    res.set(this.excel.headers(`avlaga-${d.customer?.storeName ?? customerId}`)).end(buf);
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
