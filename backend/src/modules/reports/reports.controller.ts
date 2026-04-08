import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('api/reports')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('daily-sales')
  getDailySales(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getDailySales(from || startDate, to || endDate);
  }

  @Get('profit')
  getProfitReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getProfitReport(from || startDate, to || endDate);
  }

  @Get('sales-by-category')
  getSalesByCategory() {
    return this.reportsService.getSalesByCategory();
  }

  @Get('customer-debt')
  getCustomerDebtReport() {
    return this.reportsService.getCustomerDebtReport();
  }

  @Get('drivers')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  getDriverReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('driverId') driverId?: string,
  ) {
    return this.reportsService.getDriverReport(from, to, driverId);
  }
}
