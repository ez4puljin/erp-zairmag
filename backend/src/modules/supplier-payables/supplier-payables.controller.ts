import { Controller, Get, Post, Body, Query, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupplierPayablesService } from './supplier-payables.service';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';

@Controller('api/supplier-payables')
export class SupplierPayablesController {
  constructor(private readonly service: SupplierPayablesService) {}

  @Post('payments')
  @Roles(Role.ADMIN)
  createPayment(@Body() dto: CreateSupplierPaymentDto, @Req() req: any) {
    return this.service.createPayment(dto, req.user.id);
  }

  @Get('payments')
  getPayments(@Query('supplierId') supplierId?: string) {
    return this.service.getPayments(supplierId);
  }

  @Get('summary')
  getSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.service.getPayablesSummary(startDate, endDate, supplierId);
  }

  @Get('ledger/:supplierId')
  getLedger(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getSupplierLedger(supplierId, startDate, endDate);
  }
}
